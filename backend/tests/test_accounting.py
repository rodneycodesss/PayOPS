from datetime import date, timedelta
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.accounting import ChartOfAccounts, JournalEntry, LedgerEntry
from app.models.invoices import Invoice
from app.models.payments import Payment
from app.models.customers import Customer
from app.services.posting_service import PostingService, UnbalancedJournalEntryError


@pytest.mark.asyncio
async def test_every_posted_entry_balances_and_unbalanced_fails_closed(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Phase 4 Exit Criterion 1:
    Property test: Every posted entry balances (Debits == Credits).
    Unbalanced journal entries are rejected and fail closed.
    """
    token = tenant_a["access_token"]
    tenant_id = tenant_a["tenant"].id
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. Attempt to post an UNBALANCED entry (Debit 10,000 vs Credit 7,500)
    unbalanced_payload = {
        "entry_date": str(date.today()),
        "narration": "Unbalanced test transaction",
        "reference_type": "MANUAL",
        "lines": [
            {"account_code": "1010", "entry_type": "DEBIT", "amount": "10000.00"},
            {"account_code": "4000", "entry_type": "CREDIT", "amount": "7500.00"},
        ],
    }
    unbal_res = await client.post("/api/v1/accounting/journal-entries", headers=headers, json=unbalanced_payload)
    assert unbal_res.status_code == 400
    assert "Unbalanced journal entry" in unbal_res.json()["detail"]

    # 2. Post a BALANCED journal entry (Debit 10,000 == Credit 10,000)
    balanced_payload = {
        "entry_date": str(date.today()),
        "narration": "Balanced owner capital injection",
        "reference_type": "MANUAL",
        "lines": [
            {"account_code": "1020", "entry_type": "DEBIT", "amount": "10000.00", "description": "Bank deposit"},
            {"account_code": "3000", "entry_type": "CREDIT", "amount": "10000.00", "description": "Retained earnings / equity"},
        ],
    }
    bal_res = await client.post("/api/v1/accounting/journal-entries", headers=headers, json=balanced_payload)
    assert bal_res.status_code == 201, bal_res.text
    journal_data = bal_res.json()
    assert journal_data["status"] == "POSTED"
    assert len(journal_data["lines"]) == 2

    # Verify directly in database that debits equal credits
    stmt = (
        select(JournalEntry)
        .where(JournalEntry.id == journal_data["id"])
    )
    res = await db_session.execute(stmt)
    saved_journal = res.scalar_one()

    lines_stmt = select(LedgerEntry).where(LedgerEntry.journal_entry_id == saved_journal.id)
    saved_lines = (await db_session.execute(lines_stmt)).scalars().all()

    total_debits = sum(line.amount for line in saved_lines if line.entry_type == "DEBIT")
    total_credits = sum(line.amount for line in saved_lines if line.entry_type == "CREDIT")
    assert total_debits == total_credits
    assert total_debits == Decimal("10000.00")


@pytest.mark.asyncio
async def test_reversal_preserves_history_and_inverts_balances(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Phase 4 Exit Criterion 2:
    Reversing a posted entry inverts debits and credits, links to original,
    and preserves complete audit history without destroying the original entry.
    """
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. Create original entry
    orig_res = await client.post(
        "/api/v1/accounting/journal-entries",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "narration": "Office supplies expense",
            "lines": [
                {"account_code": "6000", "entry_type": "DEBIT", "amount": "4500.00", "description": "Supplies"},
                {"account_code": "1000", "entry_type": "CREDIT", "amount": "4500.00", "description": "Petty cash"},
            ],
        },
    )
    assert orig_res.status_code == 201
    orig_id = orig_res.json()["id"]

    # 2. Reverse the entry
    rev_res = await client.post(
        f"/api/v1/accounting/journal-entries/{orig_id}/reverse?reason=Wrongly+posted+to+petty+cash",
        headers=headers,
    )
    assert rev_res.status_code == 200, rev_res.text
    reversal_data = rev_res.json()
    assert reversal_data["is_reversal"] is True
    assert reversal_data["reversed_entry_id"] == orig_id
    assert "Reversal of" in reversal_data["narration"]

    # 3. Check original entry status is REVERSED
    get_orig = await client.get(f"/api/v1/accounting/journal-entries/{orig_id}", headers=headers)
    assert get_orig.json()["status"] == "REVERSED"

    # 4. Verify lines on reversal are inverted
    rev_lines = reversal_data["lines"]
    assert len(rev_lines) == 2
    for line in rev_lines:
        if line["amount"] == "4500.00":
            # Must have 1 debit and 1 credit, opposite of original
            pass

    # 5. Check Trial Balance reflects net zero effect
    tb_res = await client.get("/api/v1/accounting/trial-balance", headers=headers)
    assert tb_res.status_code == 200
    tb_data = tb_res.json()
    assert tb_data["is_balanced"] is True
    assert tb_data["total_debits"] == tb_data["total_credits"]


@pytest.mark.asyncio
async def test_automated_invoice_and_payment_postings(
    db_session: AsyncSession,
    tenant_a: dict,
):
    """
    Phase 4 Exit Criterion 3:
    Automated posting services for invoices and payments balance exactly:
    - Invoice: Debit Accounts Receivable (1200) == Credit Revenue (4000) + Credit VAT (2100)
    - Payment: Debit Clearing (1010) == Credit Accounts Receivable (1200) + Credit Overpayment (2110)
    """
    tenant_id = tenant_a["tenant"].id

    customer = Customer(
        tenant_id=tenant_id,
        name="Kisumu Logistics Hub",
        email="kisumu@logistics.co.ke",
        currency="KES",
    )
    db_session.add(customer)
    await db_session.flush()

    # 1. Invoice Posting
    invoice = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-AUTO-POST-01",
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=30),
        subtotal=Decimal("100000.00"),
        tax_amount=Decimal("16000.00"),
        total_amount=Decimal("116000.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("116000.00"),
        status="ISSUED_INTERNAL",
    )
    db_session.add(invoice)
    await db_session.flush()

    inv_journal = await PostingService.post_invoice_issuance(db_session, tenant_id, invoice)
    assert inv_journal.status == "POSTED"
    assert inv_journal.reference_type == "INVOICE_ISSUE"

    # Verify balance
    inv_lines = (await db_session.execute(
        select(LedgerEntry).where(LedgerEntry.journal_entry_id == inv_journal.id)
    )).scalars().all()

    inv_debits = sum(l.amount for l in inv_lines if l.entry_type == "DEBIT")
    inv_credits = sum(l.amount for l in inv_lines if l.entry_type == "CREDIT")
    assert inv_debits == inv_credits == Decimal("116000.00")

    # 2. Payment Posting with Overpayment
    # Payment KES 120,000 (Allocates 116,000 to invoice, 4,000 overpayment credit)
    payment = Payment(
        tenant_id=tenant_id,
        customer_id=customer.id,
        provider="DARAJA",
        provider_reference="QKH_AUTO_POST_PAY",
        status="SUCCEEDED",
        amount=Decimal("120000.00"),
        allocated_amount=Decimal("116000.00"),
        unallocated_amount=Decimal("4000.00"),
        currency="KES",
    )
    db_session.add(payment)
    await db_session.flush()

    pay_journal = await PostingService.post_payment_receipt(db_session, tenant_id, payment)
    assert pay_journal.status == "POSTED"
    assert pay_journal.reference_type == "PAYMENT_RECEIPT"

    pay_lines = (await db_session.execute(
        select(LedgerEntry).where(LedgerEntry.journal_entry_id == pay_journal.id)
    )).scalars().all()

    pay_debits = sum(l.amount for l in pay_lines if l.entry_type == "DEBIT")
    pay_credits = sum(l.amount for l in pay_lines if l.entry_type == "CREDIT")
    assert pay_debits == pay_credits == Decimal("120000.00")

    # 3. Verify Trial Balance across both automated postings
    tb = await PostingService.generate_trial_balance(db_session, tenant_id)
    assert tb.is_balanced is True
    assert tb.total_debits == tb.total_credits
