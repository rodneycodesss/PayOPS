import uuid
from typing import List, Optional
from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # tenant_id is nullable: None for global/system predefined roles, or set for tenant-custom roles
    tenant_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_roles_tenant_name"),
    )

    # Relationships
    role_permissions: Mapped[List["RolePermission"]] = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    user_roles: Mapped[List["UserRole"]] = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")


class Permission(Base, TimestampMixin):
    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    module: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Relationships
    role_permissions: Mapped[List["RolePermission"]] = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")


class RolePermission(Base, TimestampMixin):
    __tablename__ = "role_permissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    role_id: Mapped[str] = mapped_column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_id: Mapped[str] = mapped_column(String(36), ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_perm"),
    )

    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="role_permissions")
    permission: Mapped["Permission"] = relationship("Permission", back_populates="role_permissions")


class UserRole(Base, TimestampMixin):
    __tablename__ = "user_roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id: Mapped[str] = mapped_column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="user_roles")
    role: Mapped["Role"] = relationship("Role", back_populates="user_roles")
