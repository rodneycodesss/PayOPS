import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, TenantMixin


class TumaChildAccount(Base, TimestampMixin, TenantMixin):
    """
    Child business profile provisioned on Tuma API (https://api.tuma.co.ke).
    Represents an isolated merchant profile with its own API key and direct bank settlement.
    """
    __tablename__ = "tuma_child_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    
    tuma_business_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    # Lifecycle: awaiting_settlement, provisioning, active, needs_action, suspended, failed, deactivated
    status: Mapped[str] = mapped_column(String(50), default="awaiting_settlement", nullable=False, index=True)
    
    # Envelope encrypted at rest (AES-256 Fernet)
    api_key_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    
    bank_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    account_masked: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    
    # Unguessable token for secure per-tenant webhook dispatch
    webhook_token: Mapped[str] = mapped_column(String(64), unique=True, index=True, default=lambda: uuid.uuid4().hex + uuid.uuid4().hex[:32])
    
    last_error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    last_error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_tuma_child_tenant_status", "tenant_id", "status"),
    )


class TenantSettlementDetail(Base, TimestampMixin, TenantMixin):
    """
    Stores tenant's chosen settlement destination (Commercial Bank Account).
    Account number is encrypted at rest; display uses masked value.
    """
    __tablename__ = "tenant_settlement_details"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    
    destination_type: Mapped[str] = mapped_column(String(20), default="BANK", nullable=False)
    bank_id: Mapped[str] = mapped_column(String(50), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    account_masked: Mapped[str] = mapped_column(String(30), nullable=False)
    
    status: Mapped[str] = mapped_column(String(20), default="VERIFIED", nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        Index("ix_settlement_tenant_status", "tenant_id", "status"),
    )


class TumaProvisioningJob(Base, TimestampMixin, TenantMixin):
    """
    Tracks asynchronous automated onboarding steps with idempotency and retry backoff.
    """
    __tablename__ = "tuma_provisioning_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    
    step: Mapped[str] = mapped_column(String(50), default="VALIDATE", nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_retry_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_provisioning_tenant_status", "tenant_id", "status"),
    )


class TumaPaymentRequest(Base, TimestampMixin, TenantMixin):
    """
    Tracks outbound STK push payment requests initiated through Tuma API.
    """
    __tablename__ = "tuma_payment_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    
    checkout_request_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    merchant_request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    phone_masked: Mapped[str] = mapped_column(String(20), nullable=False)
    reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    invoice_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Status: INITIATED, SUCCEEDED, FAILED, CANCELLED, AWAITING_CONFIRMATION
    status: Mapped[str] = mapped_column(String(30), default="INITIATED", nullable=False, index=True)
    result_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    result_desc: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mpesa_receipt: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_payment_req_tenant_status", "tenant_id", "status"),
    )


class TumaWebhookEvent(Base, TimestampMixin):
    """
    PII-minimized audit trail of inbound webhook deliveries from Tuma API.
    """
    __tablename__ = "tuma_webhook_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Deduplication key = SHA-256(checkout_request_id + mpesa_receipt + status)
    dedupe_key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    raw_payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    status: Mapped[str] = mapped_column(String(30), default="RECEIVED", nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_tuma_webhooks_tenant_status", "tenant_id", "status"),
    )


class Collection(Base, TimestampMixin, TenantMixin):
    """
    Normalised immutable record of a successful inbound payment collection
    across any rail (Tuma STK, Daraja Paybill/Till, Bank CSV import).
    """
    __tablename__ = "collections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    
    source_transaction_id: Mapped[str] = mapped_column(String(100), nullable=False)
    channel: Mapped[str] = mapped_column(String(30), default="TUMA_STK", nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    
    payer_masked: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
    # Status: CLEARED, MATCHED, PARTIALLY_MATCHED, UNMATCHED
    status: Mapped[str] = mapped_column(String(30), default="CLEARED", nullable=False, index=True)
    matched_invoice_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    match_confidence: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    ledger_entry_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "source_transaction_id", name="uq_collections_tenant_source_tx"),
        Index("ix_collections_tenant_status", "tenant_id", "status"),
    )


class IntegrationEvent(Base, TimestampMixin):
    """
    Append-only security and operational audit trail for integration actions.
    Never stores plain secrets or raw sensitive tokens.
    """
    __tablename__ = "integration_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_integration_events_tenant_action", "tenant_id", "action"),
    )
