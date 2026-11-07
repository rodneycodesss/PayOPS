import uuid
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, ForeignKey, JSON, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin


class WebhookEvent(Base, TimestampMixin):
    __tablename__ = "webhook_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # DARAJA, BANK, KRA, etc.
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    
    headers: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    raw_payload: Mapped[str] = mapped_column(Text, nullable=False)
    
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    processing_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_webhook_events_provider_processed", "provider", "processed"),
    )
