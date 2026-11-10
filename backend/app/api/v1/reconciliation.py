from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import TenantContext, require_permission
from app.models.reconciliation import (
    ReconciliationRun,
    ReconciliationMatch,
    ReconciliationException,
)
from app.schemas.reconciliation import (
    ReconciliationRunCreate,
    ReconciliationRunResponse,
    ReconciliationMatchResponse,
    ReconciliationExceptionResponse,
    ExceptionResolveRequest,
)
from app.services.reconciliation_service import ReconciliationService

router = APIRouter(prefix="/reconciliation", tags=["Reconciliation Engine"])


@router.post("/runs", response_model=ReconciliationRunResponse, status_code=status.HTTP_201_CREATED)
async def trigger_reconciliation_run(
    run_params: Optional[ReconciliationRunCreate] = None,
    context: TenantContext = Depends(require_permission("reconciliation:run")),
    db: AsyncSession = Depends(get_db),
):
    """Triggers an on-demand 5-tier deterministic reconciliation matching run."""
    date_window = run_params.date_window_days if run_params else 3
    run = await ReconciliationService.run_reconciliation(
        db=db,
        tenant_id=context.tenant_id,
        run_type="MANUAL",
        date_window_days=date_window,
        user_id=context.user_id,
    )
    return run


@router.get("/runs", response_model=List[ReconciliationRunResponse])
async def list_reconciliation_runs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission("reconciliation:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists past reconciliation runs for this tenant."""
    stmt = (
        select(ReconciliationRun)
        .where(ReconciliationRun.tenant_id == context.tenant_id)
        .order_by(ReconciliationRun.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/runs/{run_id}", response_model=ReconciliationRunResponse)
async def get_reconciliation_run(
    run_id: str,
    context: TenantContext = Depends(require_permission("reconciliation:view")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves specific reconciliation run details."""
    stmt = (
        select(ReconciliationRun)
        .where(
            ReconciliationRun.id == run_id,
            ReconciliationRun.tenant_id == context.tenant_id,
        )
    )
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Reconciliation run not found")
    return run


@router.get("/matches", response_model=List[ReconciliationMatchResponse])
async def list_matches(
    run_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission("reconciliation:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists successful reconciliation matches and allocations."""
    stmt = select(ReconciliationMatch).where(ReconciliationMatch.tenant_id == context.tenant_id)
    if run_id:
        stmt = stmt.where(ReconciliationMatch.run_id == run_id)
    stmt = stmt.order_by(ReconciliationMatch.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/exceptions", response_model=List[ReconciliationExceptionResponse])
async def list_exceptions(
    status_filter: Optional[str] = Query("OPEN", description="OPEN, RESOLVED, DISMISSED, or ALL"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission("reconciliation:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists reconciliation exceptions in the manual review queue."""
    stmt = select(ReconciliationException).where(ReconciliationException.tenant_id == context.tenant_id)
    if status_filter and status_filter.upper() != "ALL":
        stmt = stmt.where(ReconciliationException.status == status_filter.upper())
    stmt = stmt.order_by(ReconciliationException.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/exceptions/{exception_id}/resolve", response_model=ReconciliationExceptionResponse)
async def resolve_exception(
    exception_id: str,
    payload: ExceptionResolveRequest,
    context: TenantContext = Depends(require_permission("reconciliation:manage")),
    db: AsyncSession = Depends(get_db),
):
    """Manually resolves an exception with full audit tracking."""
    try:
        resolved = await ReconciliationService.resolve_exception(
            db=db,
            tenant_id=context.tenant_id,
            exception_id=exception_id,
            action=payload.action,
            invoice_id=payload.invoice_id,
            resolution_notes=payload.resolution_notes,
            user_id=context.user_id,
        )
        return resolved
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
