import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, TenantMixin


class TaxConfiguration(Base, TimestampMixin, TenantMixin):
    __tablename__ = "tax_configurations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # STANDARD (16%), ZERO_RATED (0%), EXEMPT (0%)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class TaxSubmission(Base, TimestampMixin, TenantMixin):
    __tablename__ = "tax_submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # ETIMS_MANUAL, ETIMS_OSCU, ETIMS_VSCU
    provider: Mapped[str] = mapped_column(String(50), default="ETIMS_MANUAL", nullable=False)
    
    # PENDING, SUBMITTED, ACCEPTED, REJECTED, FAILED
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False, index=True)
    
    control_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    qr_code_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    raw_request: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    raw_response: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_tax_submissions_invoice", "invoice_id", "status"),
    )
