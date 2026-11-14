from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import TenantContext, get_tenant_context, require_permission
from app.models.payments import PaymentProvider
from app.services.payment_service import PaymentService
from app.schemas.payments import (
    StkPushRequest,
    StkPushResponse,
    PaymentResponse,
    PaymentProviderCreate,
    PaymentProviderResponse,
    C2BValidationConfirmationPayload,
)

router = APIRouter(prefix="/payments", tags=["Payments & Ingestion"])


@router.post("/stk-push", response_model=StkPushResponse)
async def initiate_stk_push(
    request_data: StkPushRequest,
    request: Request,
    context: TenantContext = Depends(require_permission("payment:initiate")),
    db: AsyncSession = Depends(get_db),
):
    """Initiates an M-PESA STK Push prompt to customer handset via Tuma API or Safaricom Daraja."""
    from app.core.config import settings
    base_url = str(request.base_url).rstrip("/")
    is_daraja = (request_data.provider or "").upper() in ("DARAJA", "DARAJA_PAYBILL", "DARAJA_TILL")
    if is_daraja:
        callback_url = f"{base_url}/api/v1/payments/daraja/callback"
    else:
        callback_url = settings.TUMA_CALLBACK_URL or f"{base_url}/api/v1/payments/tuma/callback"

    return await PaymentService.initiate_stk_push(
        db=db,
        tenant_id=context.tenant_id,
        request=request_data,
        callback_url=str(callback_url),
    )


@router.post("/tuma/callback")
async def tuma_webhook_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Inbound asynchronous webhook callback listener for Tuma API Payment Gateway STK Push responses.
    """
    raw_body = await request.body()
    raw_str = raw_body.decode("utf-8")
    payload = await request.json()

    # Process callback idempotently
    payment = await PaymentService.process_tuma_callback(
        db=db,
        tenant_id=None,  # Resolved automatically from in-flight checkout request
        callback_payload=payload,
        raw_payload_str=raw_str,
    )
    return {
        "status": "success",
        "result_code": 0,
        "result_desc": "Callback accepted",
        "payment_id": payment.id,
        "payment_status": payment.status,
    }


@router.post("/daraja/callback")
async def daraja_stk_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Inbound asynchronous callback listener for Safaricom Daraja STK Push responses.
    Handles CustomerPayBillOnline and CustomerBuyGoodsOnline callback payloads.
    """
    raw_body = await request.body()
    raw_str = raw_body.decode("utf-8")
    payload = await request.json()

    payment = await PaymentService.process_tuma_callback(
        db=db,
        tenant_id=None,
        callback_payload=payload,
        raw_payload_str=raw_str,
    )
    return {
        "ResultCode": 0,
        "ResultDesc": "Callback accepted",
        "payment_id": payment.id,
        "status": payment.status,
    }


@router.post("/daraja/c2b-validation")
async def daraja_c2b_validation(
    payload: Dict[str, Any],
):
    """Safaricom Daraja C2B validation hook. Accepts valid transactions."""
    return {
        "ResultCode": 0,
        "ResultDesc": "Accepted",
    }


@router.post("/daraja/c2b-confirmation")
async def daraja_c2b_confirmation(
    payload: C2BValidationConfirmationPayload,
    request: Request,
    context: TenantContext = Depends(get_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    """Safaricom Daraja C2B confirmation hook for Paybill and Till. Records payment with deduplication."""
    raw_body = await request.body()
    raw_str = raw_body.decode("utf-8")

    payment = await PaymentService.process_c2b_confirmation(
        db=db,
        tenant_id=context.tenant_id,
        payload=payload,
        raw_payload_str=raw_str,
    )
    return {
        "ResultCode": 0,
        "ResultDesc": "Confirmation processed",
        "payment_id": payment.id,
    }


@router.post("/daraja/register-c2b")
async def register_daraja_c2b(
    request: Request,
    context: TenantContext = Depends(require_permission("payment:manage")),
    db: AsyncSession = Depends(get_db),
):
    """
    Registers C2B validation and confirmation URLs with Safaricom Daraja for this tenant's Paybill or Till.
    """
    client, provider = await PaymentService.get_or_create_daraja_client(db, context.tenant_id)
    base_url = str(request.base_url).rstrip("/")
    val_url = f"{base_url}/api/v1/payments/daraja/c2b-validation"
    conf_url = f"{base_url}/api/v1/payments/daraja/c2b-confirmation"
    resp = await client.register_c2b_urls(
        validation_url=val_url,
        confirmation_url=conf_url,
    )
    return {
        "status": "success",
        "detail": "Daraja C2B URLs registered successfully",
        "validation_url": val_url,
        "confirmation_url": conf_url,
        "daraja_response": resp,
    }


@router.get("/", response_model=List[PaymentResponse])
async def list_payments(
    status: Optional[str] = Query(None, description="INITIATED, SUCCEEDED, CANCELLED, FAILED, TIMED_OUT"),
    provider: Optional[str] = Query(None, description="TUMA_MPESA, TUMA, BANK, MANUAL, DARAJA"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission("payment:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists customer payment transactions with filtering and pagination."""
    payments, _ = await PaymentService.list_payments(
        db=db,
        tenant_id=context.tenant_id,
        status=status,
        provider=provider,
        limit=limit,
        offset=offset,
    )
    return payments


@router.get("/providers", response_model=List[PaymentProviderResponse])
async def list_payment_providers(
    context: TenantContext = Depends(require_permission("payment:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists configured payment provider integrations for this tenant."""
    stmt = select(PaymentProvider).where(PaymentProvider.tenant_id == context.tenant_id)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/providers", response_model=PaymentProviderResponse)
async def create_or_update_provider(
    provider_data: PaymentProviderCreate,
    context: TenantContext = Depends(require_permission("payment:manage")),
    db: AsyncSession = Depends(get_db),
):
    """Configures a payment provider with encrypted credentials at rest."""
    return await PaymentService.save_payment_provider(
        db=db,
        tenant_id=context.tenant_id,
        data=provider_data,
    )
