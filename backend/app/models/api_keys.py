import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, TenantMixin


class ApiKey(Base, TimestampMixin, TenantMixin):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "n8n Automation Service Account"
    key_prefix: Mapped[str] = mapped_column(String(12), nullable=False) # e.g. "rpo_live_..."
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True) # SHA-256
    
    # Scoped permissions granted to this key
    scopes: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_api_keys_tenant_active", "tenant_id", "is_active"),
    )
