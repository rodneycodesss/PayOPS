from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import TenantContext, require_permission
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit & Compliance"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    actor_email: Optional[str] = Query(None, description="Filter by actor email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    context: TenantContext = Depends(require_permission("audit:view")),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the immutable audit trail for the organization.
    Strictly scoped to the authenticated tenant.
    """
    stmt = (
        select(AuditLog)
        .where(AuditLog.tenant_id == context.tenant_id)
        .order_by(desc(AuditLog.created_at))
    )

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
    if actor_email:
        stmt = stmt.where(AuditLog.actor_email == actor_email.lower().strip())

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())
