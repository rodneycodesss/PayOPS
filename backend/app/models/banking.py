import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, TenantMixin


class BankAccount(Base, TimestampMixin, TenantMixin):
    __tablename__ = "bank_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(100), nullable=False)
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    branch: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "account_number", name="uq_bank_accounts_tenant_number"),
    )


class BankTransaction(Base, TimestampMixin, TenantMixin):
    __tablename__ = "bank_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    bank_account_id: Mapped[str] = mapped_column(String(36), ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # CREDIT (deposit) or DEBIT (withdrawal)
    transaction_type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    balance_after: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    
    # Row hash prevents duplicates across repeated imports
    row_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    raw_row_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Reconciliation status
    is_reconciled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    matched_payment_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "row_hash", name="uq_bank_transactions_tenant_row_hash"),
        Index("ix_bank_tx_tenant_date", "tenant_id", "transaction_date"),
    )
