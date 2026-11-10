from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import TenantContext, require_permission
from app.models.accounting import ChartOfAccounts, JournalEntry, LedgerEntry
from app.schemas.accounting import (
    ChartOfAccountsCreate,
    ChartOfAccountsResponse,
    JournalEntryCreate,
    JournalEntryResponse,
    TrialBalanceResponse,
)
from app.services.posting_service import PostingService, UnbalancedJournalEntryError

router = APIRouter(prefix="/accounting", tags=["General Ledger & Double-Entry"])


@router.get("/accounts", response_model=List[ChartOfAccountsResponse])
async def list_chart_of_accounts(
    context: TenantContext = Depends(require_permission("ledger:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists chart of accounts for the tenant."""
    stmt = (
        select(ChartOfAccounts)
        .where(ChartOfAccounts.tenant_id == context.tenant_id)
        .order_by(ChartOfAccounts.code.asc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/accounts", response_model=ChartOfAccountsResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_data: ChartOfAccountsCreate,
    context: TenantContext = Depends(require_permission("ledger:view")),
    db: AsyncSession = Depends(get_db),
):
    """Registers a new account in the tenant's Chart of Accounts."""
    existing = await db.execute(
        select(ChartOfAccounts).where(
            ChartOfAccounts.tenant_id == context.tenant_id,
            ChartOfAccounts.code == account_data.code,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account code {account_data.code} already exists",
        )

    acc = ChartOfAccounts(
        tenant_id=context.tenant_id,
        code=account_data.code,
        name=account_data.name,
        account_type=account_data.account_type,
        currency=account_data.currency,
        is_active=True,
        is_system=False,
    )
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return acc


@router.get("/journal-entries", response_model=List[JournalEntryResponse])
async def list_journal_entries(
    status_filter: Optional[str] = Query(None, description="POSTED or REVERSED"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission("ledger:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists general ledger journal entries with line details."""
    stmt = (
        select(JournalEntry)
        .where(JournalEntry.tenant_id == context.tenant_id)
        .options(selectinload(JournalEntry.lines))
    )
    if status_filter:
        stmt = stmt.where(JournalEntry.status == status_filter.upper())
    stmt = stmt.order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/journal-entries/{entry_id}", response_model=JournalEntryResponse)
async def get_journal_entry(
    entry_id: str,
    context: TenantContext = Depends(require_permission("ledger:view")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves specific journal entry details."""
    stmt = (
        select(JournalEntry)
        .where(
            JournalEntry.id == entry_id,
            JournalEntry.tenant_id == context.tenant_id,
        )
        .options(selectinload(JournalEntry.lines))
    )
    res = await db.execute(stmt)
    entry = res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return entry


@router.post("/journal-entries", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_journal(
    entry_data: JournalEntryCreate,
    context: TenantContext = Depends(require_permission("period:close")),
    db: AsyncSession = Depends(get_db),
):
    """
    Posts a manual journal entry enforcing double-entry balance:
    sum(Debits) == sum(Credits).
    """
    try:
        journal = await PostingService.create_and_post_journal(
            db=db,
            tenant_id=context.tenant_id,
            entry_date=entry_data.entry_date,
            narration=entry_data.narration,
            reference_type=entry_data.reference_type,
            reference_id=entry_data.reference_id,
            lines=entry_data.lines,
            user_id=context.user_id,
        )
        # Reload with lines
        stmt = (
            select(JournalEntry)
            .where(JournalEntry.id == journal.id)
            .options(selectinload(JournalEntry.lines))
        )
        res = await db.execute(stmt)
        return res.scalar_one()
    except UnbalancedJournalEntryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/journal-entries/{entry_id}/reverse", response_model=JournalEntryResponse)
async def reverse_journal_entry(
    entry_id: str,
    reason: str = Query("Manual correction reversal", min_length=3),
    context: TenantContext = Depends(require_permission("period:close")),
    db: AsyncSession = Depends(get_db),
):
    """
    Reverses an existing journal entry:
    Inverts debit and credits, links back to original, and marks original as REVERSED.
    """
    try:
        reversal = await PostingService.reverse_journal_entry(
            db=db,
            tenant_id=context.tenant_id,
            journal_entry_id=entry_id,
            reason=reason,
            user_id=context.user_id,
        )
        stmt = (
            select(JournalEntry)
            .where(JournalEntry.id == reversal.id)
            .options(selectinload(JournalEntry.lines))
        )
        res = await db.execute(stmt)
        return res.scalar_one()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/trial-balance", response_model=TrialBalanceResponse)
async def get_trial_balance(
    as_of_date: Optional[date] = Query(None),
    context: TenantContext = Depends(require_permission("ledger:view")),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates double-entry trial balance report verifying total debits equal total credits.
    """
    return await PostingService.generate_trial_balance(
        db=db,
        tenant_id=context.tenant_id,
        as_of_date=as_of_date,
    )
