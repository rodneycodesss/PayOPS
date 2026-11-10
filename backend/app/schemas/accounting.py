from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ChartOfAccountsCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    account_type: str = Field(..., description="ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE")
    currency: str = Field("KES", min_length=3, max_length=3)


class ChartOfAccountsResponse(BaseModel):
    id: str
    tenant_id: str
    code: str
    name: str
    account_type: str
    currency: str
    is_active: bool
    is_system: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LedgerLineCreate(BaseModel):
    account_code: str = Field(..., description="Chart of accounts code, e.g. 1010, 1200, 4000")
    entry_type: str = Field(..., pattern=r"^(DEBIT|CREDIT)$", description="DEBIT or CREDIT")
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: Optional[str] = Field(None, max_length=255)


class JournalEntryCreate(BaseModel):
    entry_date: date = Field(default_factory=date.today)
    narration: str = Field(..., min_length=3, max_length=500)
    reference_type: str = Field("MANUAL_JOURNAL", max_length=50)
    reference_id: Optional[str] = Field(None, max_length=100)
    lines: List[LedgerLineCreate] = Field(..., min_length=2, description="At least one debit and one credit line")


class LedgerEntryResponse(BaseModel):
    id: str
    account_id: str
    entry_type: str
    amount: Decimal
    currency: str
    description: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class JournalEntryResponse(BaseModel):
    id: str
    tenant_id: str
    entry_number: str
    entry_date: date
    status: str
    narration: str
    reference_type: str
    reference_id: Optional[str]
    is_reversal: bool
    reversed_entry_id: Optional[str]
    posted_at: Optional[datetime]
    posted_by: Optional[str]
    created_at: datetime
    lines: List[LedgerEntryResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TrialBalanceAccountLine(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    total_debits: Decimal
    total_credits: Decimal
    net_balance: Decimal


class TrialBalanceResponse(BaseModel):
    tenant_id: str
    as_of_date: date
    accounts: List[TrialBalanceAccountLine]
    total_debits: Decimal
    total_credits: Decimal
    is_balanced: bool
