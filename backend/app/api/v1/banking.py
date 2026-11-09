from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import TenantContext, require_permission
from app.models.banking import BankAccount, BankTransaction
from app.schemas.banking import (
    BankAccountCreate,
    BankAccountResponse,
    BankTransactionResponse,
    BankImportSummary,
)
from app.services.bank_import_service import BankImportService

router = APIRouter(prefix="/banking", tags=["Banking & Statement Imports"])


@router.get("/accounts", response_model=List[BankAccountResponse])
async def list_bank_accounts(
    context: TenantContext = Depends(require_permission("bank:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists bank accounts for the tenant."""
    stmt = (
        select(BankAccount)
        .where(BankAccount.tenant_id == context.tenant_id)
        .order_by(BankAccount.created_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/accounts", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    account_data: BankAccountCreate,
    context: TenantContext = Depends(require_permission("bank:manage")),
    db: AsyncSession = Depends(get_db),
):
    """Registers a new business bank account."""
    account = BankAccount(
        tenant_id=context.tenant_id,
        bank_name=account_data.bank_name,
        account_number=account_data.account_number,
        account_name=account_data.account_name,
        branch=account_data.branch,
        currency=account_data.currency,
        current_balance=0,
        is_active=True,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.post("/accounts/{account_id}/import", response_model=BankImportSummary)
async def import_bank_statement(
    account_id: str,
    file: Optional[UploadFile] = File(None),
    csv_text: Optional[str] = Form(None),
    context: TenantContext = Depends(require_permission("bank:import")),
    db: AsyncSession = Depends(get_db),
):
    """
    Ingests bank statement CSV with SHA-256 row hash deduplication.
    Safely rejects malformed rows and updates running account balance.
    """
    content = ""
    if file:
        file_bytes = await file.read()
        content = file_bytes.decode("utf-8", errors="replace")
    elif csv_text:
        content = csv_text
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either a CSV file or csv_text form field must be provided",
        )

    try:
        summary = await BankImportService.import_csv_statement(
            db=db,
            tenant_id=context.tenant_id,
            bank_account_id=account_id,
            csv_text=content,
        )
        return summary
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/accounts/{account_id}/transactions", response_model=List[BankTransactionResponse])
async def list_bank_transactions(
    account_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission("bank:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists ingested bank transactions for an account."""
    stmt = (
        select(BankTransaction)
        .where(
            BankTransaction.tenant_id == context.tenant_id,
            BankTransaction.bank_account_id == account_id,
        )
        .order_by(BankTransaction.transaction_date.desc())
        .offset(offset)
        .limit(limit)
    )
    res = await db.execute(stmt)
    return res.scalars().all()
