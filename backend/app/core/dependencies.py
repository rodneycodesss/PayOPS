from datetime import datetime, timezone
from typing import AsyncGenerator, Callable, List, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, APIKeyHeader
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_token, hash_token
from app.models.tenants import Tenant
from app.models.users import User
from app.models.rbac import UserRole, Role, RolePermission, Permission
from app.models.api_keys import ApiKey

security_bearer = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


class TenantContext:
    """Encapsulates the authenticated tenant and user context for strict scoping."""
    def __init__(
        self,
        tenant: Tenant,
        user: Optional[User],
        permissions: List[str],
        roles: List[str],
        is_service_account: bool = False
    ):
        self.tenant = tenant
        self.user = user
        self.permissions = permissions
        self.roles = roles
        self.tenant_id = tenant.id
        self.user_id = user.id if user else None
        self.is_service_account = is_service_account

    def has_permission(self, permission: str) -> bool:
        if "super_admin" in self.roles or "owner" in self.roles:
            return True
        return permission in self.permissions


async def get_tenant_context(
    bearer_creds: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    api_key: Optional[str] = Security(api_key_header),
    db: AsyncSession = Depends(get_db)
) -> TenantContext:
    """
    Constructs the verified TenantContext enforcing tenant isolation.
    Supports either:
    1. Scoped service account API key (X-API-Key: rpo_...)
    2. User JWT Bearer access token (Authorization: Bearer eyJ...)
    """
    # 1. Check API Key authentication (for n8n Service Accounts)
    if api_key:
        key_hash = hash_token(api_key.strip())
        stmt = select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
        res = await db.execute(stmt)
        key_record = res.scalar_one_or_none()

        if not key_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked API key",
            )

        now_utc = datetime.now(timezone.utc)
        if key_record.expires_at:
            key_expires = key_record.expires_at
            if key_expires.tzinfo is None:
                key_expires = key_expires.replace(tzinfo=timezone.utc)
            if key_expires < now_utc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API key has expired",
                )

        # Update last used timestamp
        key_record.last_used_at = now_utc
        await db.commit()

        # Load Tenant
        tenant_stmt = select(Tenant).where(Tenant.id == key_record.tenant_id)
        tenant_res = await db.execute(tenant_stmt)
        tenant = tenant_res.scalar_one_or_none()

        if not tenant or not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant organization is inactive or not found",
            )

        return TenantContext(
            tenant=tenant,
            user=None,
            permissions=key_record.scopes,
            roles=["service_account"],
            is_service_account=True,
        )

    # 2. Check Bearer Token authentication (for Web Users)
    if bearer_creds:
        token = bearer_creds.credentials
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

        tenant_stmt = select(Tenant).where(Tenant.id == user.tenant_id)
        tenant = (await db.execute(tenant_stmt)).scalar_one_or_none()

        if not tenant or not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant organization is inactive or not found",
            )

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
            is_service_account=False,
        )

    # 3. Neither provided
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided. Provide either Authorization Bearer token or X-API-Key.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    context: TenantContext = Depends(get_tenant_context)
) -> User:
    """Retrieves the active user from context. Fails if called by service account without a user."""
    if not context.user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires user session context",
        )
    return context.user


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
