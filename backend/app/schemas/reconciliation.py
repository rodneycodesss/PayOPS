from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ReconciliationRunCreate(BaseModel):
    date_window_days: int = Field(3, ge=1, le=30, description="Window in days for Tier 4 date matching")
    dry_run: bool = Field(False, description="Simulate matching without committing allocations")


class ReconciliationMatchResponse(BaseModel):
    id: str
    tenant_id: str
    run_id: Optional[str]
    payment_id: Optional[str]
    invoice_id: Optional[str]
    bank_transaction_id: Optional[str]
    rule_applied: str
    confidence: str
    matched_amount: Decimal
    currency: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReconciliationExceptionResponse(BaseModel):
    id: str
    tenant_id: str
    run_id: Optional[str]
    payment_id: Optional[str]
    bank_transaction_id: Optional[str]
    reason: str
    details: Optional[str]
    status: str
    resolution_notes: Optional[str]
    resolved_by: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReconciliationRunResponse(BaseModel):
    id: str
    tenant_id: str
    run_type: str
    status: str
    total_candidates: int
    matched_count: int
    exception_count: int
    summary_notes: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExceptionResolveRequest(BaseModel):
    action: str = Field(..., description="ALLOCATE_INVOICE, RECORD_CUSTOMER_CREDIT, or DISMISS")
    invoice_id: Optional[str] = Field(None, description="Target invoice ID if action is ALLOCATE_INVOICE")
    resolution_notes: str = Field(..., min_length=3, max_length=500)
