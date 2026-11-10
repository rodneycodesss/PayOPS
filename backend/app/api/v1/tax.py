from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import TenantContext, require_permission
from app.models.tax import TaxConfiguration, TaxSubmission

router = APIRouter(prefix="/tax", tags=["Tax & eTIMS Compliance"])


@router.get("/configurations")
async def list_tax_configurations(
    context: TenantContext = Depends(require_permission("tax:manage")),
    db: AsyncSession = Depends(get_db),
):
    """Lists configured tax rates (16% Standard VAT, Zero-Rated, Exempt)."""
    stmt = (
        select(TaxConfiguration)
        .where(TaxConfiguration.tenant_id == context.tenant_id)
        .order_by(TaxConfiguration.rate.desc())
    )
    res = await db.execute(stmt)
    configs = res.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "rate": str(c.rate),
            "is_default": c.is_default,
            "is_active": c.is_active,
        }
        for c in configs
    ]


@router.get("/submissions")
async def list_tax_submissions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission("etims:review")),
    db: AsyncSession = Depends(get_db),
):
    """Lists historical eTIMS tax submissions and manual records."""
    stmt = (
        select(TaxSubmission)
        .where(TaxSubmission.tenant_id == context.tenant_id)
        .order_by(TaxSubmission.submitted_at.desc())
        .offset(offset)
        .limit(limit)
    )
    res = await db.execute(stmt)
    submissions = res.scalars().all()
    return [
        {
            "id": s.id,
            "invoice_id": s.invoice_id,
            "provider": s.provider,
            "status": s.status,
            "control_number": s.control_number,
            "qr_code_url": s.qr_code_url,
            "submitted_at": s.submitted_at,
        }
        for s in submissions
    ]
