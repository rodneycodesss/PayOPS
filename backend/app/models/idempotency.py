import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, TenantMixin


class IdempotencyRecord(Base, TimestampMixin, TenantMixin):
    __tablename__ = "idempotency_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False) # PENDING, COMPLETED, FAILED
    response_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_body: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "idempotency_key", name="uq_idempotency_tenant_key"),
        Index("ix_idempotency_expires", "expires_at"),
    )
