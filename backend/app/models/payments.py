import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, TenantMixin


class PaymentProvider(Base, TimestampMixin, TenantMixin):
    __tablename__ = "payment_providers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Provider type: DARAJA_PAYBILL, DARAJA_TILL, BANK_MANUAL, STRIPE, etc.
    provider_type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Identifier (e.g. shortcode 174379, till number, bank account number)
    identifier: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Encrypted credentials at rest (Consumer Key, Consumer Secret, Passkey, API Tokens)
    encrypted_credentials: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    is_sandbox: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Verification status: unverified, verified
    verification_status: Mapped[str] = mapped_column(String(50), default="implemented_unverified", nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "provider_type", "identifier", name="uq_payment_providers_tenant_ident"),
    )


class Payment(Base, TimestampMixin, TenantMixin):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Provider: DARAJA, BANK, MANUAL
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    # External transaction reference (e.g. M-PESA Receipt QKH123456, Bank reference)
    provider_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Checkout request ID for STK Push
    checkout_request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    # Payment lifecycle state machine:
    # INITIATED -> PENDING -> SUCCEEDED | FAILED | CANCELLED | TIMED_OUT
    # Optional post-success states: PARTIALLY_REFUNDED | REFUNDED | REVERSED
    status: Mapped[str] = mapped_column(String(50), default="INITIATED", nullable=False, index=True)
    
    # Exact amount
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    unallocated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    
    # Sender details
    sender_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sender_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    payment_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(), nullable=False)
    
    # Raw webhook/callback link
    webhook_event_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("webhook_events.id", ondelete="SET NULL"), nullable=True)
    
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "provider", "provider_reference", name="uq_payments_tenant_provider_ref"),
        Index("ix_payments_tenant_status", "tenant_id", "status"),
        Index("ix_payments_tenant_date", "tenant_id", "payment_date"),
    )

    # Relationships
    allocations: Mapped[List["PaymentAllocation"]] = relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")


class PaymentAllocation(Base, TimestampMixin, TenantMixin):
    __tablename__ = "payment_allocations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id: Mapped[str] = mapped_column(String(36), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Exact amount allocated to invoice
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    
    # Status: ACTIVE, REVERSED
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)
    reversal_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index("ix_allocations_payment_invoice", "payment_id", "invoice_id"),
    )

    # Relationships
    payment: Mapped["Payment"] = relationship("Payment", back_populates="allocations")
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="allocations")
