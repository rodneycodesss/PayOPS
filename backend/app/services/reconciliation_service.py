import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.reconciliation import (
    ReconciliationRun,
    ReconciliationMatch,
    ReconciliationException,
)
from app.models.payments import Payment, PaymentAllocation
from app.models.invoices import Invoice
from app.models.customers import Customer
from app.services.audit_service import AuditService


class ReconciliationService:
    """
    Deterministic 5-Tier Reconciliation Engine.
    Executes matching in strict priority:
    1. Exact transaction reference
    2. Exact invoice reference
    3. Exact amount and customer
    4. Exact amount and date within configurable window
    5. Fallback to manual exception review
    Enforces hard rules:
    - Never auto-allocate ambiguous matches
    - Partials allocate and leave remainder open
    - Overpayments become customer credit, never silent revenue
    """

    @classmethod
    async def run_reconciliation(
        cls,
        db: AsyncSession,
        tenant_id: str,
        run_type: str = "AUTOMATIC",
        date_window_days: int = 3,
        user_id: Optional[str] = None,
    ) -> ReconciliationRun:
        """Executes a full reconciliation cycle for the tenant."""
        now_utc = datetime.now(timezone.utc)
        run = ReconciliationRun(
            tenant_id=tenant_id,
            run_type=run_type,
            status="RUNNING",
            started_at=now_utc,
            total_candidates=0,
            matched_count=0,
            exception_count=0,
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)

        # 1. Fetch unallocated successful payments for this tenant
        payment_stmt = (
            select(Payment)
            .where(
                Payment.tenant_id == tenant_id,
                Payment.status == "SUCCEEDED",
                Payment.unallocated_amount > Decimal("0.00"),
            )
            .order_by(Payment.payment_date.asc())
        )
        p_res = await db.execute(payment_stmt)
        candidate_payments = list(p_res.scalars().all())
        run.total_candidates = len(candidate_payments)

        if not candidate_payments:
            run.status = "COMPLETED"
            run.completed_at = datetime.now(timezone.utc)
            run.summary_notes = "No unallocated candidate payments found."
            await db.commit()
            return run

        # 2. Fetch open invoices for this tenant
        inv_stmt = (
            select(Invoice)
            .where(
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_(["ISSUED_INTERNAL", "PARTIALLY_PAID"]),
                Invoice.balance_due > Decimal("0.00"),
            )
            .order_by(Invoice.issue_date.asc())
        )
        inv_res = await db.execute(inv_stmt)
        open_invoices = list(inv_res.scalars().all())

        # Pre-fetch customers for fast lookup
        cust_stmt = select(Customer).where(Customer.tenant_id == tenant_id)
        cust_res = await db.execute(cust_stmt)
        customers = {c.id: c for c in cust_res.scalars().all()}
        cust_by_phone = {c.phone.strip(): c for c in customers.values() if c.phone}

        matched_count = 0
        exception_count = 0

        for payment in candidate_payments:
            if payment.unallocated_amount <= Decimal("0.00"):
                continue

            # Identify customer if possible
            customer = None
            if payment.customer_id and payment.customer_id in customers:
                customer = customers[payment.customer_id]
            elif payment.sender_phone and payment.sender_phone.strip() in cust_by_phone:
                customer = cust_by_phone[payment.sender_phone.strip()]
                payment.customer_id = customer.id

            match_result, rule_applied, confidence = cls._evaluate_candidate_matches(
                payment=payment,
                customer=customer,
                open_invoices=open_invoices,
                date_window_days=date_window_days,
            )

            if match_result == "AMBIGUOUS":
                # Hard rule: Never auto-allocate ambiguous matches
                ex = ReconciliationException(
                    tenant_id=tenant_id,
                    run_id=run.id,
                    payment_id=payment.id,
                    reason="AMBIGUOUS_MATCH",
                    details=f"Multiple eligible invoice candidates detected under {rule_applied}. Diverted to manual review.",
                    status="OPEN",
                )
                db.add(ex)
                exception_count += 1

            elif isinstance(match_result, Invoice):
                matched_invoice = match_result
                # Allocate payment to invoice
                allocated = await cls._execute_allocation(
                    db=db,
                    run=run,
                    payment=payment,
                    invoice=matched_invoice,
                    customer=customer,
                    rule_applied=rule_applied,
                    confidence=confidence,
                )
                matched_count += 1
                # If invoice is fully paid, remove from open candidates
                if matched_invoice.balance_due <= Decimal("0.00"):
                    if matched_invoice in open_invoices:
                        open_invoices.remove(matched_invoice)

            else:
                # No match found -> Tier 5 Manual Review
                ex = ReconciliationException(
                    tenant_id=tenant_id,
                    run_id=run.id,
                    payment_id=payment.id,
                    reason="UNMATCHED_PAYMENT",
                    details=f"No matching open invoices found for payment {payment.provider_reference} (KES {payment.unallocated_amount}).",
                    status="OPEN",
                )
                db.add(ex)
                exception_count += 1

        run.matched_count = matched_count
        run.exception_count = exception_count
        run.status = "COMPLETED"
        run.completed_at = datetime.now(timezone.utc)
        run.summary_notes = f"Completed run: {matched_count} payments auto-allocated, {exception_count} exceptions diverted to manual review."

        await db.commit()
        await db.refresh(run)
        return run

    @classmethod
    def _evaluate_candidate_matches(
        cls,
        payment: Payment,
        customer: Optional[Customer],
        open_invoices: List[Invoice],
        date_window_days: int,
    ) -> Tuple[Any, str, str]:
        """
        Evaluates open invoices against payment across the 5 deterministic tiers.
        Returns (Invoice | 'AMBIGUOUS' | None, rule_applied, confidence).
        """
        # --- Tier 1: Exact Transaction Reference ---
        # Checks if payment's receipt number or reference is cited in invoice notes or manual ref
        t1_candidates = []
        payment_refs = {payment.provider_reference.upper().strip()}
        if payment.checkout_request_id:
            payment_refs.add(payment.checkout_request_id.upper().strip())

        for inv in open_invoices:
            notes_str = (inv.notes or "").upper()
            manual_ref_str = (inv.manual_recording_ref or "").upper()
            if any(pref in notes_str or pref in manual_ref_str for pref in payment_refs):
                t1_candidates.append(inv)

        if len(t1_candidates) == 1:
            return t1_candidates[0], "R1_EXACT_TX_REF", "EXACT"
        elif len(t1_candidates) > 1:
            return "AMBIGUOUS", "R1_EXACT_TX_REF", "AMBIGUOUS"

        # --- Tier 2: Exact Invoice Reference ---
        # Checks if payment's account_reference quotes the invoice_number
        if payment.account_reference:
            acc_ref = payment.account_reference.upper().strip().replace(" ", "").replace("-", "")
            t2_candidates = []
            for inv in open_invoices:
                clean_inv_num = inv.invoice_number.upper().strip().replace(" ", "").replace("-", "")
                if acc_ref == clean_inv_num or clean_inv_num in acc_ref or acc_ref in clean_inv_num:
                    t2_candidates.append(inv)

            if len(t2_candidates) == 1:
                return t2_candidates[0], "R2_EXACT_INVOICE_REF", "HIGH"
            elif len(t2_candidates) > 1:
                return "AMBIGUOUS", "R2_EXACT_INVOICE_REF", "AMBIGUOUS"

        # --- Tier 3: Exact Amount and Customer ---
        if customer:
            t3_candidates = [
                inv for inv in open_invoices
                if inv.customer_id == customer.id and inv.balance_due == payment.unallocated_amount
            ]
            if len(t3_candidates) == 1:
                return t3_candidates[0], "R3_EXACT_AMOUNT_CUSTOMER", "HIGH"
            elif len(t3_candidates) > 1:
                return "AMBIGUOUS", "R3_EXACT_AMOUNT_CUSTOMER", "AMBIGUOUS"

        # --- Tier 4: Exact Amount and Date within Configurable Window ---
        payment_date = payment.payment_date.date() if isinstance(payment.payment_date, datetime) else payment.payment_date
        t4_candidates = []
        for inv in open_invoices:
            if inv.balance_due == payment.unallocated_amount:
                diff_days = abs((inv.issue_date - payment_date).days)
                if diff_days <= date_window_days:
                    t4_candidates.append(inv)

        if len(t4_candidates) == 1:
            return t4_candidates[0], "R4_EXACT_AMOUNT_DATE", "MEDIUM"
        elif len(t4_candidates) > 1:
            return "AMBIGUOUS", "R4_EXACT_AMOUNT_DATE", "AMBIGUOUS"

        # --- Tier 5: Fallback to Manual Exception Review ---
        return None, "R5_MANUAL_REVIEW", "LOW"

    @classmethod
    async def _execute_allocation(
        cls,
        db: AsyncSession,
        run: Optional[ReconciliationRun],
        payment: Payment,
        invoice: Invoice,
        customer: Optional[Customer],
        rule_applied: str,
        confidence: str,
    ) -> Decimal:
        """
        Executes financial allocation between a payment and an invoice:
        - Allocates up to invoice balance due or available unallocated payment amount
        - Handles partials by keeping balance visible
        - Converts overpayments to customer credit, not silent revenue
        - Creates ReconciliationMatch and PaymentAllocation records
        """
        allocation_amount = min(payment.unallocated_amount, invoice.balance_due)

        # 1. Create PaymentAllocation record
        allocation = PaymentAllocation(
            tenant_id=payment.tenant_id,
            payment_id=payment.id,
            invoice_id=invoice.id,
            allocated_amount=allocation_amount,
            currency="KES",
            status="ACTIVE",
        )
        db.add(allocation)

        # 2. Update Invoice balance
        invoice.paid_amount += allocation_amount
        invoice.balance_due = invoice.total_amount - invoice.paid_amount
        if invoice.balance_due <= Decimal("0.00"):
            invoice.status = "PAID"
        else:
            invoice.status = "PARTIALLY_PAID"

        # 3. Update Payment balances
        payment.allocated_amount += allocation_amount
        payment.unallocated_amount = payment.amount - payment.allocated_amount

        # 4. Handle Overpayment: excess becomes customer credit
        if payment.unallocated_amount > Decimal("0.00") and invoice.status == "PAID":
            if customer:
                customer.credit_balance += payment.unallocated_amount

        # 5. Record ReconciliationMatch
        match = ReconciliationMatch(
            tenant_id=payment.tenant_id,
            run_id=run.id if run else None,
            payment_id=payment.id,
            invoice_id=invoice.id,
            rule_applied=rule_applied,
            confidence=confidence,
            matched_amount=allocation_amount,
            currency="KES",
        )
        db.add(match)

        return allocation_amount

    @classmethod
    async def resolve_exception(
        cls,
        db: AsyncSession,
        tenant_id: str,
        exception_id: str,
        action: str,
        invoice_id: Optional[str],
        resolution_notes: str,
        user_id: Optional[str],
    ) -> ReconciliationException:
        """
        Resolves an exception manually with complete audit trail:
        - ALLOCATE_INVOICE: Manually matches payment to selected invoice
        - RECORD_CUSTOMER_CREDIT: Credits unallocated payment to customer balance
        - DISMISS: Closes exception without allocation
        """
        stmt = (
            select(ReconciliationException)
            .where(
                ReconciliationException.id == exception_id,
                ReconciliationException.tenant_id == tenant_id,
            )
        )
        res = await db.execute(stmt)
        exception_rec = res.scalar_one_or_none()
        if not exception_rec:
            raise ValueError(f"Exception {exception_id} not found")

        if exception_rec.status == "RESOLVED":
            return exception_rec

        now_utc = datetime.now(timezone.utc)

        if action == "ALLOCATE_INVOICE":
            if not invoice_id:
                raise ValueError("invoice_id is required for ALLOCATE_INVOICE action")

            inv_stmt = select(Invoice).where(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id)
            target_invoice = (await db.execute(inv_stmt)).scalar_one_or_none()
            if not target_invoice:
                raise ValueError(f"Target invoice {invoice_id} not found")

            pay_stmt = select(Payment).where(Payment.id == exception_rec.payment_id)
            payment = (await db.execute(pay_stmt)).scalar_one_or_none()
            if not payment:
                raise ValueError("Payment associated with this exception was not found")

            cust_stmt = select(Customer).where(Customer.id == target_invoice.customer_id)
            customer = (await db.execute(cust_stmt)).scalar_one_or_none()

            await cls._execute_allocation(
                db=db,
                run=None,
                payment=payment,
                invoice=target_invoice,
                customer=customer,
                rule_applied="R5_MANUAL_ALLOCATION",
                confidence="MANUAL_CONFIRMED",
            )
            exception_rec.status = "RESOLVED"

        elif action == "RECORD_CUSTOMER_CREDIT":
            pay_stmt = select(Payment).where(Payment.id == exception_rec.payment_id)
            payment = (await db.execute(pay_stmt)).scalar_one_or_none()
            if payment and payment.customer_id:
                cust_stmt = select(Customer).where(Customer.id == payment.customer_id)
                customer = (await db.execute(cust_stmt)).scalar_one_or_none()
                if customer:
                    customer.credit_balance += payment.unallocated_amount
            exception_rec.status = "RESOLVED"

        elif action == "DISMISS":
            exception_rec.status = "DISMISSED"
        else:
            raise ValueError(f"Invalid resolution action: {action}")

        exception_rec.resolution_notes = resolution_notes
        exception_rec.resolved_by = user_id
        exception_rec.resolved_at = now_utc

        # Audit logging
        await AuditService.log_event(
            db=db,
            action="RECONCILIATION_EXCEPTION_RESOLVED",
            resource_type="reconciliation_exception",
            resource_id=exception_rec.id,
            tenant_id=tenant_id,
            actor_email=user_id or "system",
            details={
                "action": action,
                "invoice_id": invoice_id,
                "notes": resolution_notes,
                "payment_id": exception_rec.payment_id,
            },
        )

        await db.commit()
        await db.refresh(exception_rec)
        return exception_rec
