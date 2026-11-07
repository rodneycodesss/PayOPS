import uuid
from decimal import Decimal
from typing import Optional
from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, TenantMixin


class Product(Base, TimestampMixin, TenantMixin):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Exact unit price
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    
    # Tax category: STANDARD (16%), ZERO_RATED (0%), EXEMPT (0%)
    tax_category: Mapped[str] = mapped_column(String(50), default="STANDARD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "sku", name="uq_products_tenant_sku"),
    )
