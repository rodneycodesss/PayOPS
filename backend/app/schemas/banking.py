from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class BankAccountCreate(BaseModel):
    bank_name: str = Field(..., min_length=2, max_length=100, description="e.g. Equity Bank, KCB, NCBA, Stanbic")
    account_number: str = Field(..., min_length=4, max_length=50)
    account_name: str = Field(..., min_length=2, max_length=255)
    branch: Optional[str] = Field(None, max_length=100)
    currency: str = Field("KES", min_length=3, max_length=3)


class BankAccountResponse(BaseModel):
    id: str
    tenant_id: str
    bank_name: str
    account_number: str
    account_name: str
    branch: Optional[str]
    currency: str
    current_balance: Decimal
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BankTransactionResponse(BaseModel):
    id: str
    tenant_id: str
    bank_account_id: str
    transaction_date: date
    reference: str
    description: str
    transaction_type: str
    amount: Decimal
    currency: str
    balance_after: Optional[Decimal]
    is_reconciled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BankImportSummary(BaseModel):
    bank_account_id: str
    total_rows_read: int
    rows_imported: int
    duplicates_skipped: int
    errors_count: int
    errors: List[Dict[str, Any]] = []
    net_amount_imported: Decimal
    new_account_balance: Decimal
