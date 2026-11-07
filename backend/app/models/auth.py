import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, TenantMixin


class RefreshToken(Base, TimestampMixin, TenantMixin):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    jti: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    family_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    replaced_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_refresh_tokens_family_revoked", "family_id", "is_revoked"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")
