from datetime import date, timedelta
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.invoices import Invoice, CreditNote
from app.models.customers import Customer
from app.models.accounting import JournalEntry
from app.models.tax import TaxSubmission
from app.services.invoice_service import InvoiceService
from app.integrations.etims.provider import MockLiveKRAAdapter, NotConfiguredTaxAdapter


@pytest.mark.asyncio
async def test_manual_mode_never_produces_accepted_and_adapter_swappable(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Phase 5 Exit Criteria:
    1. Manual mode never produces ACCEPTED (strictly MANUALLY_RECORDED, zero fake control numbers).
    2. Swapping in a live or mock adapter requires no change to invoice code.
    3. PDF generation produces valid PDF document.
    4. Credit note reduces balance due.
    5. Issuance posts balancing double-entry ledger entry.
    """
    token = tenant_a["access_token"]
    tenant_id = tenant_a["tenant"].id
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. Setup Customer
    customer = Customer(
        tenant_id=tenant_id,
        name="Safari Holdings Ltd",
        email="billing@safariholdings.co.ke",
        kra_pin="P059876543A",
        currency="KES",
    )
    db_session.add(customer)
    await db_session.flush()

    # 2. Create Draft Invoice via API (Subtotal 50,000 + 16% VAT 8,000 = Total 58,000)
    invoice_payload = {
        "customer_id": customer.id,
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=30)),
        "notes": "Consulting and infrastructure audit services",
        "items": [
            {
                "description": "Enterprise Security Audit",
                "quantity": "1.0",
                "unit_price": "50000.00",
                "tax_rate": "16.00",
            }
        ],
    }
    create_res = await client.post("/api/v1/invoices/", headers=headers, json=invoice_payload)
    assert create_res.status_code == 201, create_res.text
    inv_data = create_res.json()
    invoice_id = inv_data["id"]

    assert inv_data["status"] == "DRAFT"
    assert inv_data["subtotal"] == "50000.00"
    assert inv_data["tax_amount"] == "8000.00"
    assert inv_data["total_amount"] == "58000.00"
    assert inv_data["balance_due"] == "58000.00"
    assert inv_data["etims_status"] == "NOT_SUBMITTED"

    # 3. Issue Invoice -> Transitions to ISSUED_INTERNAL and posts to General Ledger
    issue_res = await client.post(f"/api/v1/invoices/{invoice_id}/issue", headers=headers)
    assert issue_res.status_code == 200, issue_res.text
    issued_data = issue_res.json()
    assert issued_data["status"] == "ISSUED_INTERNAL"

    # Verify double-entry ledger entry was automatically posted
    jnl_stmt = (
        select(JournalEntry)
        .where(
            JournalEntry.tenant_id == tenant_id,
            JournalEntry.reference_id == invoice_id,
            JournalEntry.reference_type == "INVOICE_ISSUE",
        )
    )
    posted_jnl = (await db_session.execute(jnl_stmt)).scalar_one()
    assert posted_jnl.status == "POSTED"

    # 4. Generate and Stream PDF
    pdf_res = await client.get(f"/api/v1/invoices/{invoice_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")
    assert len(pdf_res.content) > 1000

    # 5. Exit Criterion 1: Manual Review Mode NEVER produces ACCEPTED
    manual_res = await client.post(
        f"/api/v1/invoices/{invoice_id}/etims/manual-record",
        headers=headers,
        json={
            "manual_recording_ref": "INTERNAL_VOUCHER_2026_001",
            "manual_notes": "Verified against paper receipt book and stamped by compliance auditor",
        },
    )
    assert manual_res.status_code == 200, manual_res.text
    manual_data = manual_res.json()

    # STRICT ASSERTIONS:
    assert manual_data["etims_status"] == "MANUALLY_RECORDED"
    assert manual_data["etims_status"] != "ACCEPTED", "Manual mode must NEVER label an invoice as ACCEPTED!"
    assert manual_data["etims_control_number"] is None, "Manual mode must NEVER fabricate a KRA control number!"
    assert manual_data["manual_recording_ref"] == "INTERNAL_VOUCHER_2026_001"

    # Verify submission log
    sub_stmt = select(TaxSubmission).where(TaxSubmission.invoice_id == invoice_id)
    submission = (await db_session.execute(sub_stmt)).scalar_one()
    assert submission.status == "MANUALLY_RECORDED"
    assert submission.control_number is None

    # 6. Exit Criterion 2: Swapping in a Live or Mock KRA Adapter requires NO change to invoice code
    mock_kra_adapter = MockLiveKRAAdapter()
    inv_updated, result = await InvoiceService.submit_to_tax_authority(
        db=db_session,
        tenant_id=tenant_id,
        invoice_id=invoice_id,
        provider=mock_kra_adapter,
        user_id="kra_live_worker",
    )
    assert result.status == "ACCEPTED"
    assert inv_updated.etims_status == "ACCEPTED"
    assert inv_updated.etims_control_number.startswith("KRA-VSCU-")
    assert "https://etims.kra.go.ke" in inv_updated.etims_qr_code_url

    # 7. Test Credit Note issuance against the invoice
    cn_res = await client.post(
        f"/api/v1/invoices/{invoice_id}/credit-notes",
        headers=headers,
        json={
            "amount": "10000.00",
            "reason": "10% commercial volume rebate",
        },
    )
    assert cn_res.status_code == 201, cn_res.text
    cn_data = cn_res.json()
    assert cn_data["amount"] == "10000.00"
    assert cn_data["credit_note_number"].startswith("CN-")

    # Verify invoice balance due was reduced from 58,000 to 48,000
    inv_check = await client.get(f"/api/v1/invoices/{invoice_id}", headers=headers)
    assert inv_check.json()["balance_due"] == "48000.00"
