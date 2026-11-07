import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, TenantMixin


class Invoice(Base, TimestampMixin, TenantMixin):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # State machine: DRAFT -> ISSUED_INTERNAL -> PENDING_SUBMISSION -> UNDER_REVIEW -> SUBMITTED -> ACCEPTED | REJECTED | FAILED -> CORRECTED
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False, index=True)
    
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Exact monetary amounts
    subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    balance_due: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # eTIMS tracking
    # Rule: Only eTIMS provider adapter may set to ACCEPTED; manual mode marks "manually recorded"
    etims_status: Mapped[str] = mapped_column(String(50), default="NOT_SUBMITTED", nullable=False, index=True)
    etims_control_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    etims_qr_code_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    etims_submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Manual review recording
    manual_recording_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    manual_recorded_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    manual_recorded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    manual_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "invoice_number", name="uq_invoices_tenant_number"),
        Index("ix_invoices_tenant_status", "tenant_id", "status"),
        Index("ix_invoices_tenant_due", "tenant_id", "due_date"),
    )

    # Relationships
    items: Mapped[List["InvoiceItem"]] = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    allocations: Mapped[List["PaymentAllocation"]] = relationship("PaymentAllocation", back_populates="invoice", cascade="all, delete-orphan")
    credit_notes: Mapped[List["CreditNote"]] = relationship("CreditNote", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base, TimestampMixin):
    __tablename__ = "invoice_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("1.0000"), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("16.00"), nullable=False) # 16.00% VAT standard
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    # Relationship
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")


class CreditNote(Base, TimestampMixin, TenantMixin):
    __tablename__ = "credit_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    credit_note_number: Mapped[str] = mapped_column(String(100), nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="ISSUED", nullable=False) # ISSUED, APPLIED, VOID

    __table_args__ = (
        UniqueConstraint("tenant_id", "credit_note_number", name="uq_credit_notes_tenant_number"),
    )

    # Relationship
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="credit_notes")
