import csv
import hashlib
import io
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.banking import BankAccount, BankTransaction
from app.schemas.banking import BankImportSummary


class BankImportService:
    """
    Parses and ingests bank statement feeds with SHA-256 row hash deduplication,
    safe handling of malformed rows, and account balance updates.
    """

    @classmethod
    def compute_row_hash(
        cls,
        bank_account_id: str,
        tx_date: date,
        reference: str,
        amount: Decimal,
        tx_type: str,
    ) -> str:
        """Computes deterministic SHA-256 hash identifying a unique bank statement line."""
        normalized = f"{bank_account_id}:{tx_date.isoformat()}:{reference.strip().upper()}:{amount:.2f}:{tx_type.strip().upper()}"
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    @classmethod
    def _parse_date(cls, date_str: str) -> Optional[date]:
        """Tries multiple date formats common in Kenyan bank statements."""
        date_str = date_str.strip()
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%m/%d/%Y",
            "%Y/%m/%d",
            "%d %b %Y",
            "%d %B %Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        return None

    @classmethod
    async def import_csv_statement(
        cls,
        db: AsyncSession,
        tenant_id: str,
        bank_account_id: str,
        csv_text: str,
    ) -> BankImportSummary:
        """
        Processes bank statement CSV content line-by-line.
        Safely captures malformed rows without failing the entire file,
        and prevents duplicate transactions via row hash.
        """
        # 1. Verify Bank Account exists and belongs to tenant
        stmt = (
            select(BankAccount)
            .where(
                BankAccount.id == bank_account_id,
                BankAccount.tenant_id == tenant_id,
            )
        )
        res = await db.execute(stmt)
        account = res.scalar_one_or_none()
        if not account:
            raise ValueError(f"Bank account {bank_account_id} not found for this tenant")

        # 2. Parse CSV
        reader = csv.reader(io.StringIO(csv_text.strip()))
        headers = None
        total_rows = 0
        rows_imported = 0
        duplicates_skipped = 0
        errors: List[Dict[str, Any]] = []
        net_amount_change = Decimal("0.00")

        # Fetch existing hashes for this account to optimize deduplication
        existing_hashes_stmt = (
            select(BankTransaction.row_hash)
            .where(
                BankTransaction.tenant_id == tenant_id,
                BankTransaction.bank_account_id == bank_account_id,
            )
        )
        hash_res = await db.execute(existing_hashes_stmt)
        existing_hashes = set(hash_res.scalars().all())

        for line_num, row in enumerate(reader, start=1):
            if not row or not any(field.strip() for field in row):
                continue

            # First non-empty row is header
            if headers is None:
                headers = [h.strip().lower() for h in row]
                continue

            total_rows += 1
            raw_line_str = ",".join(row)

            # Map columns by name or fallback to index
            row_dict = {}
            for idx, col_val in enumerate(row):
                if idx < len(headers):
                    row_dict[headers[idx]] = col_val.strip()

            # Identify fields
            date_raw = row_dict.get("date") or (row[0] if len(row) > 0 else "")
            ref_raw = row_dict.get("reference") or row_dict.get("ref") or (row[1] if len(row) > 1 else "")
            desc_raw = row_dict.get("description") or row_dict.get("particulars") or (row[2] if len(row) > 2 else "")
            amount_raw = row_dict.get("amount") or (row[3] if len(row) > 3 else "")
            type_raw = row_dict.get("type") or (row[4] if len(row) > 4 else "")

            # Validation 1: Date
            tx_date = cls._parse_date(date_raw)
            if not tx_date:
                errors.append({
                    "line": line_num,
                    "field": "date",
                    "value": date_raw,
                    "reason": f"Invalid date format on line {line_num}: '{date_raw}'",
                })
                continue

            # Validation 2: Reference
            reference = ref_raw.strip()
            if not reference:
                errors.append({
                    "line": line_num,
                    "field": "reference",
                    "value": ref_raw,
                    "reason": f"Missing transaction reference on line {line_num}",
                })
                continue

            # Validation 3: Amount
            clean_amt = amount_raw.replace(",", "").replace("KES", "").replace("$", "").strip()
            try:
                amount = Decimal(clean_amt)
                if amount <= 0:
                    raise InvalidOperation()
            except (InvalidOperation, ValueError):
                errors.append({
                    "line": line_num,
                    "field": "amount",
                    "value": amount_raw,
                    "reason": f"Invalid numerical amount on line {line_num}: '{amount_raw}'",
                })
                continue

            # Validation 4: Type (CREDIT or DEBIT)
            type_normalized = type_raw.upper().strip()
            if "CR" in type_normalized or "DEPOSIT" in type_normalized or type_normalized == "CREDIT":
                tx_type = "CREDIT"
            elif "DR" in type_normalized or "WITHDRAWAL" in type_normalized or type_normalized == "DEBIT":
                tx_type = "DEBIT"
            else:
                # Default to CREDIT if not specified or assume positive is credit
                tx_type = "CREDIT"

            # Compute row hash
            row_hash = cls.compute_row_hash(
                bank_account_id=bank_account_id,
                tx_date=tx_date,
                reference=reference,
                amount=amount,
                tx_type=tx_type,
            )

            # Deduplication Check
            if row_hash in existing_hashes:
                duplicates_skipped += 1
                continue

            # Record new transaction
            tx = BankTransaction(
                tenant_id=tenant_id,
                bank_account_id=bank_account_id,
                transaction_date=tx_date,
                reference=reference,
                description=desc_raw or "Bank Transaction",
                transaction_type=tx_type,
                amount=amount,
                currency=account.currency,
                row_hash=row_hash,
                raw_row_data=raw_line_str,
                is_reconciled=False,
            )
            db.add(tx)
            existing_hashes.add(row_hash)
            rows_imported += 1

            if tx_type == "CREDIT":
                net_amount_change += amount
            else:
                net_amount_change -= amount

        # Update account balance
        account.current_balance += net_amount_change
        await db.commit()
        await db.refresh(account)

        return BankImportSummary(
            bank_account_id=bank_account_id,
            total_rows_read=total_rows,
            rows_imported=rows_imported,
            duplicates_skipped=duplicates_skipped,
            errors_count=len(errors),
            errors=errors,
            net_amount_imported=net_amount_change,
            new_account_balance=account.current_balance,
        )
