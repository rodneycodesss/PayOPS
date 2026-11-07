import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, TenantMixin


class User(Base, TimestampMixin, TenantMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Multi-factor authentication
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
    user_roles: Mapped[List["UserRole"]] = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
