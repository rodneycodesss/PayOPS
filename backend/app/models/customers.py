import uuid
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, TenantMixin


class Customer(Base, TimestampMixin, TenantMixin):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    kra_pin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Store customer credit balance (from overpayments) in exact NUMERIC(18, 2)
    credit_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_customers_tenant_email"),
    )
