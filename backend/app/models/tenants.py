import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trading_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    kra_pin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    branches: Mapped[List["Branch"]] = relationship("Branch", back_populates="tenant", cascade="all, delete-orphan")
