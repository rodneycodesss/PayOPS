import uuid
from typing import Optional
from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, TenantMixin


class Branch(Base, TimestampMixin, TenantMixin):
    __tablename__ = "branches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_headquarters: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_branches_tenant_code"),
    )

    # Relationship
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="branches")
