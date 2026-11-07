import secrets
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import TenantContext, require_permission
from app.core.security import hash_token
from app.models.api_keys import ApiKey
from app.schemas.api_keys import ApiKeyCreate, ApiKeyCreatedResponse, ApiKeyResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api-keys", tags=["Service Accounts & API Keys"])


@router.post("", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    data: ApiKeyCreate,
    request: Request,
    context: TenantContext = Depends(require_permission("tenant:manage")),
    db: AsyncSession = Depends(get_db)
):
    """
    Provisions a scoped API key for external service accounts (e.g. n8n).
    Returns the raw API key once. The secret cannot be retrieved again.
    """
    # Generate key
    raw_secret = f"rpo_live_{secrets.token_urlsafe(32)}"
    key_prefix = raw_secret[:12]
    key_hash = hash_token(raw_secret)

    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)

    api_key_record = ApiKey(
        tenant_id=context.tenant_id,
        name=data.name.strip(),
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes=data.scopes,
        is_active=True,
        expires_at=expires_at,
    )
    db.add(api_key_record)
    await db.flush()

    await AuditService.log_event(
        db=db,
        action="API_KEY_CREATED",
        resource_type="api_key",
        resource_id=api_key_record.id,
        tenant_id=context.tenant_id,
        actor_id=context.user_id,
        actor_email=context.user.email if context.user else "System",
        details={"name": data.name, "scopes": data.scopes, "prefix": key_prefix},
        request=request
    )
    await db.commit()

    return ApiKeyCreatedResponse(
        id=api_key_record.id,
        tenant_id=api_key_record.tenant_id,
        name=api_key_record.name,
        raw_api_key=raw_secret,
        key_prefix=key_prefix,
        scopes=api_key_record.scopes,
        expires_at=api_key_record.expires_at,
        created_at=api_key_record.created_at,
    )


@router.get("", response_model=List[ApiKeyResponse])
async def list_api_keys(
    context: TenantContext = Depends(require_permission("tenant:manage")),
    db: AsyncSession = Depends(get_db)
):
    """Lists all active and revoked service account API keys for this tenant."""
    stmt = (
        select(ApiKey)
        .where(ApiKey.tenant_id == context.tenant_id)
        .order_by(ApiKey.created_at.desc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.delete("/{api_key_id}", status_code=status.HTTP_200_OK)
async def revoke_api_key(
    api_key_id: str,
    request: Request,
    context: TenantContext = Depends(require_permission("tenant:manage")),
    db: AsyncSession = Depends(get_db)
):
    """Immediately revokes an API key, preventing future access by that service account."""
    stmt = select(ApiKey).where(ApiKey.id == api_key_id, ApiKey.tenant_id == context.tenant_id)
    res = await db.execute(stmt)
    key_record = res.scalar_one_or_none()

    if not key_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    key_record.is_active = False

    await AuditService.log_event(
        db=db,
        action="API_KEY_REVOKED",
        resource_type="api_key",
        resource_id=key_record.id,
        tenant_id=context.tenant_id,
        actor_id=context.user_id,
        actor_email=context.user.email if context.user else "System",
        details={"name": key_record.name, "prefix": key_record.key_prefix},
        request=request
    )
    await db.commit()

    return {"message": "API key successfully revoked"}
