import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.accounting import ChartOfAccounts, JournalEntry, LedgerEntry
from app.models.invoices import Invoice
from app.models.payments import Payment
from app.schemas.accounting import (
    JournalEntryCreate,
    LedgerLineCreate,
    TrialBalanceAccountLine,
    TrialBalanceResponse,
)
from app.services.audit_service import AuditService


class UnbalancedJournalEntryError(ValueError):
    """Raised when journal debits do not equal credits."""
    pass


class PostingService:
    """
    Single designated authority for writing to double-entry general ledger tables.
    Enforces the core financial invariants:
    1. Debits strictly equal credits per currency.
    2. Posted entries are append-only and immutable.
    3. Corrections occur exclusively through explicit reversing entries.
    """

    @classmethod
    async def get_next_entry_number(cls, db: AsyncSession, tenant_id: str) -> str:
        """Generates tenant-scoped sequential entry number e.g. JNL-2026-00001."""
        current_year = date.today().year
        stmt = (
            select(func.count(JournalEntry.id))
            .where(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.entry_number.like(f"JNL-{current_year}-%"),
            )
        )
        res = await db.execute(stmt)
        count = res.scalar() or 0
        return f"JNL-{current_year}-{count + 1:05d}"

    @classmethod
    async def create_and_post_journal(
        cls,
        db: AsyncSession,
        tenant_id: str,
        entry_date: date,
        narration: str,
        reference_type: str,
        reference_id: Optional[str],
        lines: List[LedgerLineCreate],
        user_id: Optional[str] = None,
        is_reversal: bool = False,
        reversed_entry_id: Optional[str] = None,
    ) -> JournalEntry:
        """
        Creates and posts a journal entry enforcing the double-entry invariant:
        sum(DEBITS) == sum(CREDITS).
        """
        if not lines or len(lines) < 2:
            raise UnbalancedJournalEntryError("A journal entry requires at least two lines (one debit and one credit).")

        # 1. Validate Debits == Credits
        total_debits = Decimal("0.00")
        total_credits = Decimal("0.00")

        for line in lines:
            if line.entry_type == "DEBIT":
                total_debits += line.amount
            elif line.entry_type == "CREDIT":
                total_credits += line.amount
            else:
                raise ValueError(f"Invalid entry type: {line.entry_type}")

        if total_debits != total_credits:
            raise UnbalancedJournalEntryError(
                f"Unbalanced journal entry: Debits (KES {total_debits:.2f}) != Credits (KES {total_credits:.2f}). "
                f"Net discrepancy: KES {abs(total_debits - total_credits):.2f}"
            )

        # 2. Resolve Chart of Accounts
        account_codes = {line.account_code for line in lines}
        coa_stmt = (
            select(ChartOfAccounts)
            .where(
                ChartOfAccounts.tenant_id == tenant_id,
                ChartOfAccounts.code.in_(account_codes),
            )
        )
        coa_res = await db.execute(coa_stmt)
        account_map = {acc.code: acc for acc in coa_res.scalars().all()}

        missing_codes = account_codes - set(account_map.keys())
        if missing_codes:
            raise ValueError(f"Accounts not found in Chart of Accounts: {missing_codes}")

        # 3. Create Journal Entry
        entry_number = await cls.get_next_entry_number(db, tenant_id)
        now_utc = datetime.now(timezone.utc)

        journal = JournalEntry(
            tenant_id=tenant_id,
            entry_number=entry_number,
            entry_date=entry_date,
            status="POSTED",
            narration=narration,
            reference_type=reference_type,
            reference_id=reference_id,
            is_reversal=is_reversal,
            reversed_entry_id=reversed_entry_id,
            posted_at=now_utc,
            posted_by=user_id,
        )
        db.add(journal)
        await db.flush()

        # 4. Create Ledger Lines
        for line in lines:
            account = account_map[line.account_code]
            ledger_line = LedgerEntry(
                tenant_id=tenant_id,
                journal_entry_id=journal.id,
                account_id=account.id,
                entry_type=line.entry_type,
                amount=line.amount,
                currency=account.currency,
                description=line.description or narration,
            )
            db.add(ledger_line)

        # 5. Audit Log
        await AuditService.log_event(
            db=db,
            action="JOURNAL_POSTED",
            resource_type="journal_entry",
            resource_id=journal.id,
            tenant_id=tenant_id,
            actor_email=user_id or "system",
            details={
                "entry_number": journal.entry_number,
                "narration": narration,
                "amount": str(total_debits),
                "lines_count": len(lines),
                "is_reversal": is_reversal,
            },
        )

        await db.commit()
        await db.refresh(journal)
        return journal

    @classmethod
    async def reverse_journal_entry(
        cls,
        db: AsyncSession,
        tenant_id: str,
        journal_entry_id: str,
        reason: str,
        user_id: Optional[str] = None,
    ) -> JournalEntry:
        """
        Reverses an existing posted journal entry:
        - Creates a new reversing entry with inverted debit/credits
        - Links back to the original entry ID
        - Marks original entry status as 'REVERSED'
        """
        stmt = (
            select(JournalEntry)
            .where(
                JournalEntry.id == journal_entry_id,
                JournalEntry.tenant_id == tenant_id,
            )
            .options(selectinload(JournalEntry.lines).selectinload(LedgerEntry.account))
        )
        res = await db.execute(stmt)
        original = res.scalar_one_or_none()
        if not original:
            raise ValueError(f"Journal entry {journal_entry_id} not found")

        if original.status == "REVERSED":
            raise ValueError(f"Journal entry {original.entry_number} has already been reversed")

        # Invert lines
        reversal_lines: List[LedgerLineCreate] = []
        for line in original.lines:
            inverted_type = "CREDIT" if line.entry_type == "DEBIT" else "DEBIT"
            reversal_lines.append(
                LedgerLineCreate(
                    account_code=line.account.code,
                    entry_type=inverted_type,
                    amount=line.amount,
                    description=f"Reversal of {original.entry_number}: {line.description or ''}",
                )
            )

        # Mark original as REVERSED
        original.status = "REVERSED"

        # Create reversing journal
        reversal_journal = await cls.create_and_post_journal(
            db=db,
            tenant_id=tenant_id,
            entry_date=date.today(),
            narration=f"Reversal of {original.entry_number}: {reason}",
            reference_type="REVERSAL",
            reference_id=original.id,
            lines=reversal_lines,
            user_id=user_id,
            is_reversal=True,
            reversed_entry_id=original.id,
        )

        return reversal_journal

    @classmethod
    async def post_invoice_issuance(
        cls,
        db: AsyncSession,
        tenant_id: str,
        invoice: Invoice,
        user_id: Optional[str] = None,
    ) -> JournalEntry:
        """
        Automated posting when an invoice is issued:
        - Debit 1200 (Accounts Receivable): invoice.total_amount
        - Credit 4000 (Operating Revenue): invoice.subtotal
        - Credit 2100 (VAT Output Tax Payable): invoice.tax_amount (if > 0)
        """
        lines: List[LedgerLineCreate] = [
            LedgerLineCreate(
                account_code="1200",
                entry_type="DEBIT",
                amount=invoice.total_amount,
                description=f"Accounts Receivable: Invoice {invoice.invoice_number}",
            ),
            LedgerLineCreate(
                account_code="4000",
                entry_type="CREDIT",
                amount=invoice.subtotal,
                description=f"Operating Revenue: Invoice {invoice.invoice_number}",
            ),
        ]

        if invoice.tax_amount > Decimal("0.00"):
            lines.append(
                LedgerLineCreate(
                    account_code="2100",
                    entry_type="CREDIT",
                    amount=invoice.tax_amount,
                    description=f"VAT Output Tax (16%): Invoice {invoice.invoice_number}",
                )
            )

        return await cls.create_and_post_journal(
            db=db,
            tenant_id=tenant_id,
            entry_date=invoice.issue_date,
            narration=f"Issuance of Tax Invoice {invoice.invoice_number}",
            reference_type="INVOICE_ISSUE",
            reference_id=invoice.id,
            lines=lines,
            user_id=user_id,
        )

    @classmethod
    async def post_payment_receipt(
        cls,
        db: AsyncSession,
        tenant_id: str,
        payment: Payment,
        user_id: Optional[str] = None,
    ) -> JournalEntry:
        """
        Automated posting upon receipt and reconciliation of payment:
        - Debit Clearing Account (1010 M-PESA Clearing or 1020 Bank): payment.amount
        - Credit 1200 (Accounts Receivable): payment.allocated_amount
        - Credit 2110 (Customer Overpayment Credit): payment.unallocated_amount (if overpaid)
        """
        clearing_account = "1010" if payment.provider == "DARAJA" else "1020"

        lines: List[LedgerLineCreate] = [
            LedgerLineCreate(
                account_code=clearing_account,
                entry_type="DEBIT",
                amount=payment.amount,
                description=f"Payment received via {payment.provider} ({payment.provider_reference})",
            ),
        ]

        if payment.allocated_amount > Decimal("0.00"):
            lines.append(
                LedgerLineCreate(
                    account_code="1200",
                    entry_type="CREDIT",
                    amount=payment.allocated_amount,
                    description=f"Settlement of Accounts Receivable: {payment.provider_reference}",
                )
            )

        if payment.unallocated_amount > Decimal("0.00"):
            lines.append(
                LedgerLineCreate(
                    account_code="2110",
                    entry_type="CREDIT",
                    amount=payment.unallocated_amount,
                    description=f"Customer Overpayment Credit Liability: {payment.provider_reference}",
                )
            )

        return await cls.create_and_post_journal(
            db=db,
            tenant_id=tenant_id,
            entry_date=payment.payment_date.date() if isinstance(payment.payment_date, datetime) else payment.payment_date,
            narration=f"Receipt of Payment {payment.provider_reference} (KES {payment.amount:.2f})",
            reference_type="PAYMENT_RECEIPT",
            reference_id=payment.id,
            lines=lines,
            user_id=user_id,
        )

    @classmethod
    async def generate_trial_balance(
        cls,
        db: AsyncSession,
        tenant_id: str,
        as_of_date: Optional[date] = None,
    ) -> TrialBalanceResponse:
        """
        Generates the standard Double-Entry Trial Balance report.
        Verifies that sum(all Debits) == sum(all Credits) across the general ledger.
        """
        target_date = as_of_date or date.today()

        # Fetch all accounts
        coa_stmt = (
            select(ChartOfAccounts)
            .where(ChartOfAccounts.tenant_id == tenant_id, ChartOfAccounts.is_active == True)
            .order_by(ChartOfAccounts.code.asc())
        )
        coa_res = await db.execute(coa_stmt)
        accounts = coa_res.scalars().all()

        account_lines: List[TrialBalanceAccountLine] = []
        total_debits = Decimal("0.00")
        total_credits = Decimal("0.00")

        for acc in accounts:
            stmt = (
                select(
                    func.coalesce(func.sum(case((LedgerEntry.entry_type == "DEBIT", LedgerEntry.amount), else_=Decimal("0.00"))), Decimal("0.00")),
                    func.coalesce(func.sum(case((LedgerEntry.entry_type == "CREDIT", LedgerEntry.amount), else_=Decimal("0.00"))), Decimal("0.00")),
                )
                .join(JournalEntry, LedgerEntry.journal_entry_id == JournalEntry.id)
                .where(
                    LedgerEntry.tenant_id == tenant_id,
                    LedgerEntry.account_id == acc.id,
                    JournalEntry.status == "POSTED",
                    JournalEntry.entry_date <= target_date,
                )
            )
            res = await db.execute(stmt)
            debits, credits = res.one()
            debits = Decimal(str(debits))
            credits = Decimal(str(credits))

            if debits > Decimal("0.00") or credits > Decimal("0.00"):
                if acc.account_type in ("ASSET", "EXPENSE"):
                    net_balance = debits - credits
                else:
                    net_balance = credits - debits

                account_lines.append(
                    TrialBalanceAccountLine(
                        account_code=acc.code,
                        account_name=acc.name,
                        account_type=acc.account_type,
                        total_debits=debits,
                        total_credits=credits,
                        net_balance=net_balance,
                    )
                )
                total_debits += debits
                total_credits += credits

        return TrialBalanceResponse(
            tenant_id=tenant_id,
            as_of_date=target_date,
            accounts=account_lines,
            total_debits=total_debits,
            total_credits=total_credits,
            is_balanced=(total_debits == total_credits),
        )
