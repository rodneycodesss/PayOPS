import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, TenantMixin


class ReconciliationRun(Base, TimestampMixin, TenantMixin):
    __tablename__ = "reconciliation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # AUTOMATIC, MANUAL
    run_type: Mapped[str] = mapped_column(String(50), default="AUTOMATIC", nullable=False)
    
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    total_candidates: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    matched_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    exception_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # PENDING, RUNNING, COMPLETED, FAILED
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    summary_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class ReconciliationMatch(Base, TimestampMixin, TenantMixin):
    __tablename__ = "reconciliation_matches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    run_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("reconciliation_runs.id", ondelete="SET NULL"), nullable=True)
    
    payment_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("payments.id", ondelete="CASCADE"), nullable=True, index=True)
    invoice_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=True, index=True)
    bank_transaction_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bank_transactions.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Rule tier applied:
    # 1: EXACT_TX_REF, 2: EXACT_INVOICE_REF, 3: EXACT_AMOUNT_CUSTOMER, 4: EXACT_AMOUNT_DATE, 5: MANUAL_ALLOCATION
    rule_applied: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[str] = mapped_column(String(20), default="HIGH", nullable=False) # HIGH, MEDIUM, LOW
    
    matched_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)


class ReconciliationException(Base, TimestampMixin, TenantMixin):
    __tablename__ = "reconciliation_exceptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    run_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("reconciliation_runs.id", ondelete="SET NULL"), nullable=True)
    
    payment_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("payments.id", ondelete="CASCADE"), nullable=True, index=True)
    bank_transaction_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bank_transactions.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Reason: AMBIGUOUS_MATCH, UNMATCHED_PAYMENT, UNMATCHED_BANK_TX, OVERPAYMENT
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Status: OPEN, RESOLVED, DISMISSED
    status: Mapped[str] = mapped_column(String(50), default="OPEN", nullable=False, index=True)
    
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_rec_exceptions_tenant_status", "tenant_id", "status"),
    )
