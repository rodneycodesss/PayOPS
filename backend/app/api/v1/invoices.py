from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import TenantContext, require_permission
from app.models.invoices import Invoice, CreditNote
from app.schemas.invoices import (
    InvoiceCreate,
    InvoiceResponse,
    CreditNoteCreate,
    CreditNoteResponse,
    ManualRecordETIMSRequest,
)
from app.services.invoice_service import InvoiceService
from app.integrations.etims.provider import ManualReviewTaxAdapter

router = APIRouter(prefix="/invoices", tags=["Invoicing & Billing"])


@router.get("/", response_model=List[InvoiceResponse])
async def list_invoices(
    status_filter: Optional[str] = Query(None, description="DRAFT, ISSUED_INTERNAL, PARTIALLY_PAID, PAID, CANCELLED"),
    customer_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission("invoice:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists customer invoices with filtering and pagination."""
    stmt = (
        select(Invoice)
        .where(Invoice.tenant_id == context.tenant_id)
        .options(selectinload(Invoice.items), selectinload(Invoice.customer))
    )
    if status_filter:
        stmt = stmt.where(Invoice.status == status_filter.upper())
    if customer_id:
        stmt = stmt.where(Invoice.customer_id == customer_id)

    stmt = stmt.order_by(Invoice.issue_date.desc(), Invoice.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    context: TenantContext = Depends(require_permission("invoice:create")),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new invoice in DRAFT status with computed VAT lines."""
    try:
        return await InvoiceService.create_invoice_draft(
            db=db,
            tenant_id=context.tenant_id,
            data=data,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    context: TenantContext = Depends(require_permission("invoice:view")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full invoice details including line items."""
    stmt = (
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.tenant_id == context.tenant_id)
        .options(selectinload(Invoice.items), selectinload(Invoice.customer))
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/{invoice_id}/issue", response_model=InvoiceResponse)
async def issue_invoice(
    invoice_id: str,
    context: TenantContext = Depends(require_permission("invoice:issue")),
    db: AsyncSession = Depends(get_db),
):
    """
    Finalizes and issues an invoice:
    Transitions status to ISSUED_INTERNAL and automatically posts double-entry ledger entries.
    """
    try:
        return await InvoiceService.issue_invoice(
            db=db,
            tenant_id=context.tenant_id,
            invoice_id=invoice_id,
            user_id=context.user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: str,
    context: TenantContext = Depends(require_permission("invoice:view")),
    db: AsyncSession = Depends(get_db),
):
    """Generates and streams a branded PDF document for the invoice."""
    try:
        pdf_bytes = await InvoiceService.generate_invoice_pdf(
            db=db,
            tenant_id=context.tenant_id,
            invoice_id=invoice_id,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="invoice_{invoice_id}.pdf"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{invoice_id}/credit-notes", response_model=CreditNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_credit_note(
    invoice_id: str,
    data: CreditNoteCreate,
    context: TenantContext = Depends(require_permission("credit_note:manage")),
    db: AsyncSession = Depends(get_db),
):
    """Issues a credit note against an invoice."""
    try:
        return await InvoiceService.create_credit_note(
            db=db,
            tenant_id=context.tenant_id,
            invoice_id=invoice_id,
            data=data,
            user_id=context.user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{invoice_id}/etims/manual-record", response_model=InvoiceResponse)
async def manual_record_etims(
    invoice_id: str,
    payload: ManualRecordETIMSRequest,
    context: TenantContext = Depends(require_permission("etims:record_manual")),
    db: AsyncSession = Depends(get_db),
):
    """
    Release 1 Compliance: Marks invoice as manually recorded under internal review.
    Strict invariant: NEVER marks invoice as 'ACCEPTED' by KRA without provider verification.
    """
    adapter = ManualReviewTaxAdapter(
        recording_ref=payload.manual_recording_ref,
        notes=payload.manual_notes,
        recorded_by_user_id=context.user_id or "finance_user",
    )
    invoice, _ = await InvoiceService.submit_to_tax_authority(
        db=db,
        tenant_id=context.tenant_id,
        invoice_id=invoice_id,
        provider=adapter,
        user_id=context.user_id,
    )
    return invoice
