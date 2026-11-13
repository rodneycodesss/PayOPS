from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import TenantContext, get_tenant_context, require_permission, get_current_user
from app.models.users import User
from app.models.tuma import TumaProvisioningJob, IntegrationEvent, TumaChildAccount
from app.services.tuma_onboarding_service import TumaOnboardingService
from app.services.tuma_collection_service import TumaCollectionService

router = APIRouter(prefix="/tuma", tags=["Tuma Automated Gateway"])


# --- Schemas ---

class SettlementConnectRequest(BaseModel):
    bank_id: str = Field(..., min_length=1, description="UUID from /tuma/banks")
    bank_name: str = Field(..., min_length=2, description="Commercial bank name e.g. Equity Bank Kenya")
    account_number: str = Field(..., min_length=5, max_length=50, description="Settlement bank account number")


class SettlementChangeRequest(BaseModel):
    bank_id: str = Field(..., min_length=1)
    bank_name: str = Field(..., min_length=2)
    account_number: str = Field(..., min_length=5, max_length=50)
    reason: Optional[str] = Field(None, max_length=255)


class TumaStkPushRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Payment amount in KES")
    phone: str = Field(..., description="Kenyan mobile number e.g. 254712345678 or 0712345678")
    reference: str = Field(..., min_length=1, max_length=50, description="Invoice or order reference e.g. INV-0045")
    invoice_id: Optional[str] = None
    description: Optional[str] = Field(None, max_length=100)


# --- Tenant Onboarding Endpoints ---

@router.get("/onboarding/status")
async def get_onboarding_status(
    context: TenantContext = Depends(require_permission("payment:view")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves current Tuma automated onboarding status and settlement account."""
    return await TumaOnboardingService.get_onboarding_status(db, context.tenant_id)


@router.get("/banks")
async def list_available_banks(
    context: TenantContext = Depends(require_permission("payment:view")),
):
    """Retrieves list of supported Kenyan commercial banks from Tuma reference API."""
    return await TumaOnboardingService.list_available_banks()


@router.post("/settlement/connect")
async def connect_settlement_account(
    data: SettlementConnectRequest,
    context: TenantContext = Depends(require_permission("payment:manage")),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits tenant settlement account and automatically provisions dedicated child business profile.
    Owner/Admin only.
    """
    return await TumaOnboardingService.submit_settlement_details(
        db=db,
        tenant_id=context.tenant_id,
        bank_id=data.bank_id,
        bank_name=data.bank_name,
        account_number=data.account_number,
        user_id=context.user_id,
        user_email=context.user.email if context.user else None,
    )


@router.post("/settlement/change-request")
async def request_settlement_change(
    data: SettlementChangeRequest,
    user: User = Depends(get_current_user),
    context: TenantContext = Depends(require_permission("payment:manage")),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a high-security settlement details update request.
    Enforces audit trail and platform admin routing to prevent unauthorized redirection.
    """
    return await TumaOnboardingService.request_settlement_change(
        db=db,
        tenant_id=context.tenant_id,
        user=user,
        new_bank_id=data.bank_id,
        new_bank_name=data.bank_name,
        new_account_number=data.account_number,
        reason=data.reason,
    )


# --- Collections Endpoints ---

@router.post("/stk-push")
async def initiate_stk_push(
    data: TumaStkPushRequest,
    context: TenantContext = Depends(require_permission("payment:initiate")),
    db: AsyncSession = Depends(get_db),
):
    """Initiates an M-PESA STK Push prompt to customer handset via child gateway."""
    try:
        req = await TumaCollectionService.initiate_collection_request(
            db=db,
            tenant_id=context.tenant_id,
            amount=data.amount,
            phone=data.phone,
            reference=data.reference,
            invoice_id=data.invoice_id,
            description=data.description,
        )
        return {
            "checkout_request_id": req.checkout_request_id,
            "merchant_request_id": req.merchant_request_id,
            "amount": req.amount,
            "reference": req.reference,
            "status": req.status,
            "customer_message": "Payment prompt sent to customer handset",
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- Webhooks (Unguessable per-tenant token URL) ---

@router.post("/webhooks/{webhook_token}/stk")
async def handle_tuma_stk_webhook(
    webhook_token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Inbound asynchronous callback listener for Tuma M-PESA STK push confirmations.
    Unguessable token in URL path resolves and authenticates the tenant.
    """
    raw_body = await request.body()
    raw_str = raw_body.decode("utf-8")
    payload = await request.json()

    result = await TumaCollectionService.process_webhook_callback(
        db=db,
        webhook_token=webhook_token,
        payload=payload,
        raw_body_str=raw_str,
    )

    if result.get("status") == "rejected":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("detail"))

    return {"status": "success", "result": result}


# --- Platform Admin Endpoints (PayOps Staff Only) ---

@router.get("/admin/provisioning-jobs")
async def list_provisioning_jobs(
    context: TenantContext = Depends(require_permission("admin:system")),
    db: AsyncSession = Depends(get_db),
):
    """Lists all tenant Tuma provisioning jobs for platform monitoring."""
    stmt = select(TumaProvisioningJob).order_by(TumaProvisioningJob.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/admin/jobs/{job_id}/retry")
async def retry_provisioning_job(
    job_id: str,
    context: TenantContext = Depends(require_permission("admin:system")),
    db: AsyncSession = Depends(get_db),
):
    """Safely retries a stuck or failed tenant provisioning job."""
    stmt = select(TumaProvisioningJob).where(TumaProvisioningJob.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    child = await TumaOnboardingService.provision_child_business(db, job.tenant_id)
    return {"status": "retried", "child_status": child.status}


@router.get("/admin/orphans")
async def get_orphan_report(
    context: TenantContext = Depends(require_permission("admin:system")),
    db: AsyncSession = Depends(get_db),
):
    """Detects orphaned accounts or stuck provisioning jobs across all tenants."""
    return await TumaOnboardingService.detect_orphaned_accounts(db)


@router.get("/admin/audit-log")
async def list_integration_audit_log(
    context: TenantContext = Depends(require_permission("admin:system")),
    db: AsyncSession = Depends(get_db),
):
    """Lists integration events audit log (never exposes secrets or plain keys)."""
    stmt = select(IntegrationEvent).order_by(IntegrationEvent.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    return res.scalars().all()
