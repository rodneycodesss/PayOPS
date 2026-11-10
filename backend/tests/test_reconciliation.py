from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tenants import Tenant
from app.models.customers import Customer
from app.models.invoices import Invoice
from app.models.payments import Payment, PaymentAllocation
from app.models.reconciliation import (
    ReconciliationRun,
    ReconciliationMatch,
    ReconciliationException,
)
from app.models.audit import AuditLog


@pytest.mark.asyncio
async def test_reconciliation_5_tiers_accuracy_and_allocations(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Phase 3 Exit Criterion 1 & 2:
    - Fixture-based accuracy tests for every rule (Tier 1 to Tier 4)
    - Ambiguous matches NEVER auto-allocate (divert to exception queue)
    - Partial payments allocate and leave remainder visible
    - Overpayments become customer credit, not silent revenue
    """
    tenant_id = tenant_a["tenant"].id
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    today = date.today()

    # 1. Setup Customer
    customer = Customer(
        tenant_id=tenant_id,
        name="Nairobi Retail Enterprises",
        email="orders@nairobibiz.co.ke",
        phone="254711998877",
        credit_balance=Decimal("0.00"),
        currency="KES",
        is_active=True,
    )
    db_session.add(customer)
    await db_session.flush()

    # 2. Setup Open Invoices for testing each rule
    # Inv 1: For Tier 1 (Exact Tx Ref in notes)
    inv1 = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-2026-T1",
        issue_date=today,
        due_date=today + timedelta(days=30),
        subtotal=Decimal("4310.34"),
        tax_amount=Decimal("689.66"),
        total_amount=Decimal("5000.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("5000.00"),
        status="ISSUED_INTERNAL",
        notes="Reference M-PESA Receipt QKH_TIER1_999",
    )

    # Inv 2: For Tier 2 (Exact Invoice Number in account reference)
    inv2 = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-2026-T2",
        issue_date=today,
        due_date=today + timedelta(days=30),
        total_amount=Decimal("12000.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("12000.00"),
        status="ISSUED_INTERNAL",
    )

    # Inv 3: For Tier 3 (Exact Amount and Customer)
    inv3 = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-2026-T3",
        issue_date=today - timedelta(days=15),
        due_date=today + timedelta(days=15),
        total_amount=Decimal("25000.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("25000.00"),
        status="ISSUED_INTERNAL",
    )

    # Inv 4: For Tier 4 (Exact Amount and Date window without customer or ref match)
    inv4 = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-2026-T4",
        issue_date=today - timedelta(days=2),
        due_date=today + timedelta(days=28),
        total_amount=Decimal("8500.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("8500.00"),
        status="ISSUED_INTERNAL",
    )

    # Invoices 5A and 5B: Ambiguous candidates (Both KES 14,000 for same customer)
    inv5a = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-2026-AMB-A",
        issue_date=today - timedelta(days=10),
        due_date=today + timedelta(days=20),
        total_amount=Decimal("14000.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("14000.00"),
        status="ISSUED_INTERNAL",
    )
    inv5b = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-2026-AMB-B",
        issue_date=today - timedelta(days=8),
        due_date=today + timedelta(days=22),
        total_amount=Decimal("14000.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("14000.00"),
        status="ISSUED_INTERNAL",
    )

    # Inv 6: For Partial Payment (Total KES 10,000, payment will be KES 4,000)
    inv6 = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-2026-PARTIAL",
        issue_date=today,
        due_date=today + timedelta(days=14),
        total_amount=Decimal("10000.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("10000.00"),
        status="ISSUED_INTERNAL",
    )

    # Inv 7: For Overpayment (Total KES 6,000, payment will be KES 8,500)
    inv7 = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-2026-OVERPAY",
        issue_date=today,
        due_date=today + timedelta(days=14),
        total_amount=Decimal("6000.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("6000.00"),
        status="ISSUED_INTERNAL",
    )

    db_session.add_all([inv1, inv2, inv3, inv4, inv5a, inv5b, inv6, inv7])
    await db_session.flush()

    # 3. Setup Unallocated Successful Payments
    # Payment 1 -> Matches Inv 1 via Tier 1
    p1 = Payment(
        tenant_id=tenant_id,
        provider="DARAJA",
        provider_reference="QKH_TIER1_999",
        status="SUCCEEDED",
        amount=Decimal("5000.00"),
        allocated_amount=Decimal("0.00"),
        unallocated_amount=Decimal("5000.00"),
        currency="KES",
    )

    # Payment 2 -> Matches Inv 2 via Tier 2 (account_reference = "INV-2026-T2")
    p2 = Payment(
        tenant_id=tenant_id,
        provider="DARAJA",
        provider_reference="QKH_TIER2_002",
        account_reference="INV-2026-T2",
        status="SUCCEEDED",
        amount=Decimal("12000.00"),
        allocated_amount=Decimal("0.00"),
        unallocated_amount=Decimal("12000.00"),
        currency="KES",
    )

    # Payment 3 -> Matches Inv 3 via Tier 3 (Customer phone match + exact amount 25,000)
    p3 = Payment(
        tenant_id=tenant_id,
        provider="DARAJA",
        provider_reference="QKH_TIER3_003",
        sender_phone="254711998877",  # Matches customer
        status="SUCCEEDED",
        amount=Decimal("25000.00"),
        allocated_amount=Decimal("0.00"),
        unallocated_amount=Decimal("25000.00"),
        currency="KES",
    )

    # Payment 4 -> Matches Inv 4 via Tier 4 (Exact Amount 8,500 within 2 days)
    p4 = Payment(
        tenant_id=tenant_id,
        provider="BANK",
        provider_reference="BNK_TIER4_004",
        payment_date=datetime.now(timezone.utc) - timedelta(days=2),
        status="SUCCEEDED",
        amount=Decimal("8500.00"),
        allocated_amount=Decimal("0.00"),
        unallocated_amount=Decimal("8500.00"),
        currency="KES",
    )

    # Payment 5 -> Ambiguous match! (Customer has two KES 14,000 invoices: inv5a and inv5b)
    p5 = Payment(
        tenant_id=tenant_id,
        provider="DARAJA",
        provider_reference="QKH_AMBIG_005",
        customer_id=customer.id,
        status="SUCCEEDED",
        amount=Decimal("14000.00"),
        allocated_amount=Decimal("0.00"),
        unallocated_amount=Decimal("14000.00"),
        currency="KES",
    )

    # Payment 6 -> Partial payment (KES 4,000 for KES 10,000 invoice)
    p6 = Payment(
        tenant_id=tenant_id,
        provider="DARAJA",
        provider_reference="QKH_PARTIAL_006",
        account_reference="INV-2026-PARTIAL",
        status="SUCCEEDED",
        amount=Decimal("4000.00"),
        allocated_amount=Decimal("0.00"),
        unallocated_amount=Decimal("4000.00"),
        currency="KES",
    )

    # Payment 7 -> Overpayment (KES 8,500 for KES 6,000 invoice -> KES 2,500 customer credit)
    p7 = Payment(
        tenant_id=tenant_id,
        provider="DARAJA",
        provider_reference="QKH_OVERPAY_007",
        customer_id=customer.id,
        account_reference="INV-2026-OVERPAY",
        status="SUCCEEDED",
        amount=Decimal("8500.00"),
        allocated_amount=Decimal("0.00"),
        unallocated_amount=Decimal("8500.00"),
        currency="KES",
    )

    db_session.add_all([p1, p2, p3, p4, p5, p6, p7])
    await db_session.commit()

    # 4. Trigger Reconciliation Run via API
    run_res = await client.post(
        "/api/v1/reconciliation/runs",
        headers=headers,
        json={"date_window_days": 3},
    )
    assert run_res.status_code == 201, run_res.text
    run_data = run_res.json()
    assert run_data["status"] == "COMPLETED"
    assert run_data["total_candidates"] == 7

    # 5. Verify Tier 1 Match (Exact Tx Ref)
    stmt_m1 = select(ReconciliationMatch).where(ReconciliationMatch.payment_id == p1.id)
    m1 = (await db_session.execute(stmt_m1)).scalar_one()
    assert m1.invoice_id == inv1.id
    assert m1.rule_applied == "R1_EXACT_TX_REF"
    assert m1.confidence == "EXACT"
    assert m1.matched_amount == Decimal("5000.00")

    # 6. Verify Tier 2 Match (Exact Invoice Ref)
    stmt_m2 = select(ReconciliationMatch).where(ReconciliationMatch.payment_id == p2.id)
    m2 = (await db_session.execute(stmt_m2)).scalar_one()
    assert m2.invoice_id == inv2.id
    assert m2.rule_applied == "R2_EXACT_INVOICE_REF"
    assert m2.confidence == "HIGH"
    assert m2.matched_amount == Decimal("12000.00")

    # 7. Verify Tier 3 Match (Exact Amount & Customer)
    stmt_m3 = select(ReconciliationMatch).where(ReconciliationMatch.payment_id == p3.id)
    m3 = (await db_session.execute(stmt_m3)).scalar_one()
    assert m3.invoice_id == inv3.id
    assert m3.rule_applied == "R3_EXACT_AMOUNT_CUSTOMER"
    assert m3.confidence == "HIGH"
    assert m3.matched_amount == Decimal("25000.00")

    # 8. Verify Tier 4 Match (Exact Amount & Date window)
    stmt_m4 = select(ReconciliationMatch).where(ReconciliationMatch.payment_id == p4.id)
    m4 = (await db_session.execute(stmt_m4)).scalar_one()
    assert m4.invoice_id == inv4.id
    assert m4.rule_applied == "R4_EXACT_AMOUNT_DATE"
    assert m4.confidence == "MEDIUM"
    assert m4.matched_amount == Decimal("8500.00")

    # 9. Verify HARD RULE: Ambiguous match NEVER auto-allocates!
    # Payment 5 should NOT have a match, and both inv5a and inv5b must still be fully open!
    stmt_m5 = select(ReconciliationMatch).where(ReconciliationMatch.payment_id == p5.id)
    m5 = (await db_session.execute(stmt_m5)).scalar_one_or_none()
    assert m5 is None, "Ambiguous match was illegally auto-allocated!"

    stmt_ex5 = select(ReconciliationException).where(ReconciliationException.payment_id == p5.id)
    ex5 = (await db_session.execute(stmt_ex5)).scalar_one()
    assert ex5.reason == "AMBIGUOUS_MATCH"
    assert ex5.status == "OPEN"

    await db_session.refresh(inv5a)
    await db_session.refresh(inv5b)
    assert inv5a.balance_due == Decimal("14000.00")
    assert inv5b.balance_due == Decimal("14000.00")

    # 10. Verify Partial Payment Allocation
    await db_session.refresh(inv6)
    await db_session.refresh(p6)
    assert inv6.status == "PARTIALLY_PAID"
    assert inv6.paid_amount == Decimal("4000.00")
    assert inv6.balance_due == Decimal("6000.00")
    assert p6.allocated_amount == Decimal("4000.00")
    assert p6.unallocated_amount == Decimal("0.00")

    # 11. Verify Overpayment Allocation (Excess becomes Customer Credit)
    await db_session.refresh(inv7)
    await db_session.refresh(p7)
    await db_session.refresh(customer)
    assert inv7.status == "PAID"
    assert inv7.paid_amount == Decimal("6000.00")
    assert inv7.balance_due == Decimal("0.00")
    assert p7.allocated_amount == Decimal("6000.00")
    assert p7.unallocated_amount == Decimal("2500.00")
    # Customer credit must be increased by KES 2,500, NOT silent revenue!
    assert customer.credit_balance == Decimal("2500.00")


@pytest.mark.asyncio
async def test_manual_exception_resolution_with_audit_trail(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Phase 3 Exit Criterion 3:
    Exceptions in the manual review queue are resolvable with a full audit trail.
    """
    tenant_id = tenant_a["tenant"].id
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. Setup Customer and Invoice
    customer = Customer(
        tenant_id=tenant_id,
        name="Mombasa Wholesale Depot",
        phone="254722334455",
        credit_balance=Decimal("0.00"),
        currency="KES",
        is_active=True,
    )
    db_session.add(customer)
    await db_session.flush()

    invoice = Invoice(
        tenant_id=tenant_id,
        customer_id=customer.id,
        invoice_number="INV-MANUAL-001",
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=15),
        total_amount=Decimal("17500.00"),
        paid_amount=Decimal("0.00"),
        balance_due=Decimal("17500.00"),
        status="ISSUED_INTERNAL",
    )
    db_session.add(invoice)

    # 2. Setup Unmatched Payment and Exception
    payment = Payment(
        tenant_id=tenant_id,
        provider="DARAJA",
        provider_reference="QKH_EXC_RESOLVE_01",
        status="SUCCEEDED",
        amount=Decimal("17500.00"),
        allocated_amount=Decimal("0.00"),
        unallocated_amount=Decimal("17500.00"),
        currency="KES",
    )
    db_session.add(payment)
    await db_session.flush()

    exception_rec = ReconciliationException(
        tenant_id=tenant_id,
        payment_id=payment.id,
        reason="UNMATCHED_PAYMENT",
        details="Payer omitted invoice reference number in payment narrative.",
        status="OPEN",
    )
    db_session.add(exception_rec)
    await db_session.commit()

    # 3. Query Open Exceptions
    list_res = await client.get("/api/v1/reconciliation/exceptions?status_filter=OPEN", headers=headers)
    assert list_res.status_code == 200
    exceptions_data = list_res.json()
    assert any(ex["id"] == exception_rec.id for ex in exceptions_data)

    # 4. Resolve Exception manually: ALLOCATE_INVOICE
    resolve_res = await client.post(
        f"/api/v1/reconciliation/exceptions/{exception_rec.id}/resolve",
        headers=headers,
        json={
            "action": "ALLOCATE_INVOICE",
            "invoice_id": invoice.id,
            "resolution_notes": "Confirmed with client via telephone that payment QKH_EXC_RESOLVE_01 was for INV-MANUAL-001.",
        },
    )
    assert resolve_res.status_code == 200, resolve_res.text
    res_data = resolve_res.json()
    assert res_data["status"] == "RESOLVED"
    assert "telephone" in res_data["resolution_notes"]

    # 5. Verify Invoice and Payment were updated
    await db_session.refresh(invoice)
    await db_session.refresh(payment)
    assert invoice.status == "PAID"
    assert invoice.balance_due == Decimal("0.00")
    assert payment.allocated_amount == Decimal("17500.00")
    assert payment.unallocated_amount == Decimal("0.00")

    # 6. Verify Audit Log was generated
    stmt_audit = (
        select(AuditLog)
        .where(
            AuditLog.tenant_id == tenant_id,
            AuditLog.action == "RECONCILIATION_EXCEPTION_RESOLVED",
            AuditLog.resource_id == exception_rec.id,
        )
    )
    audit_event = (await db_session.execute(stmt_audit)).scalar_one()
    assert audit_event is not None
    assert audit_event.details["action"] == "ALLOCATE_INVOICE"
    assert audit_event.details["invoice_id"] == invoice.id
