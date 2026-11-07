import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, TenantMixin


class ChartOfAccounts(Base, TimestampMixin, TenantMixin):
    __tablename__ = "chart_of_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Account category: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_coa_tenant_code"),
    )

    # Relationship
    ledger_entries: Mapped[List["LedgerEntry"]] = relationship("LedgerEntry", back_populates="account")


class JournalEntry(Base, TimestampMixin, TenantMixin):
    __tablename__ = "journal_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    entry_number: Mapped[str] = mapped_column(String(100), nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Status: DRAFT, POSTED, REVERSED
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False, index=True)
    narration: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Financial origin: INVOICE_ISSUE, PAYMENT_RECEIPT, ALLOCATION, REFUND, REVERSAL, CREDIT_NOTE, TAX_ADJUSTMENT
    reference_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    # Invariant: Reversals link to the original entry
    is_reversal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reversed_entry_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)
    
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    posted_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "entry_number", name="uq_journal_tenant_entry_number"),
        Index("ix_journal_tenant_date", "tenant_id", "entry_date"),
    )

    # Relationships
    lines: Mapped[List["LedgerEntry"]] = relationship("LedgerEntry", back_populates="journal_entry", cascade="all, delete-orphan")


class LedgerEntry(Base, TimestampMixin, TenantMixin):
    __tablename__ = "ledger_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    journal_entry_id: Mapped[str] = mapped_column(String(36), ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("chart_of_accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # DEBIT or CREDIT
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False)
    
    # Exact monetary amount
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        Index("ix_ledger_tenant_account", "tenant_id", "account_id"),
    )

    # Relationships
    journal_entry: Mapped["JournalEntry"] = relationship("JournalEntry", back_populates="lines")
    account: Mapped["ChartOfAccounts"] = relationship("ChartOfAccounts", back_populates="ledger_entries")
