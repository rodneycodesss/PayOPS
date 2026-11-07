from typing import AsyncGenerator, Callable, List, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.models.tenants import Tenant
from app.models.users import User
from app.models.rbac import UserRole, Role, RolePermission, Permission

security_bearer = HTTPBearer(auto_error=True)


class TenantContext:
    """Encapsulates the authenticated tenant and user context for strict scoping."""
    def __init__(self, tenant: Tenant, user: User, permissions: List[str], roles: List[str]):
        self.tenant = tenant
        self.user = user
        self.permissions = permissions
        self.roles = roles
        self.tenant_id = tenant.id
        self.user_id = user.id

    def has_permission(self, permission: str) -> bool:
        if "super_admin" in self.roles or "tenant_owner" in self.roles:
            return True
        return permission in self.permissions


async def get_token_payload(
    credentials: HTTPAuthorizationCredentials = Security(security_bearer)
) -> dict:
    """Extracts and validates the Bearer JWT token."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type: expected access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def get_current_user(
    payload: dict = Depends(get_token_payload),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Retrieves the active user from the validated token payload."""
    user_id = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    
    if not user_id or not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user or tenant claim",
        )

    # Tenant-scoped user lookup
    stmt = (
        select(User)
        .where(User.id == user_id, User.tenant_id == tenant_id)
        .options(
            selectinload(User.user_roles)
            .selectinload(UserRole.role)
            .selectinload(Role.role_permissions)
            .selectinload(RolePermission.permission)
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or does not belong to specified tenant",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


async def get_tenant_context(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> TenantContext:
    """Constructs the verified TenantContext enforcing tenant isolation."""
    stmt = select(Tenant).where(Tenant.id == user.tenant_id)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()

    if not tenant or not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant organization is inactive or not found",
        )

    # Extract user roles and permissions
    roles = []
    permissions = set()
    for user_role in user.user_roles:
        roles.append(user_role.role.name)
        for rp in user_role.role.role_permissions:
            permissions.add(rp.permission.code)

    return TenantContext(
        tenant=tenant,
        user=user,
        permissions=list(permissions),
        roles=roles,
    )


def require_permission(permission_code: str) -> Callable:
    """FastAPI dependency factory enforcing granular RBAC permission."""
    async def permission_checker(context: TenantContext = Depends(get_tenant_context)) -> TenantContext:
        if not context.has_permission(permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires '{permission_code}'",
            )
        return context
    return permission_checker
