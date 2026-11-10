from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class InvoiceItemCreate(BaseModel):
    description: str = Field(..., min_length=2, max_length=255)
    quantity: Decimal = Field(Decimal("1.0000"), gt=0)
    unit_price: Decimal = Field(..., gt=0, decimal_places=2)
    tax_rate: Decimal = Field(Decimal("16.00"), ge=0, le=100, description="VAT percentage: 16.00 standard, 0.00 zero-rated or exempt")


class InvoiceItemResponse(BaseModel):
    id: str
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    customer_id: str
    issue_date: date = Field(default_factory=date.today)
    due_date: date = Field(default_factory=lambda: date.today())
    notes: Optional[str] = Field(None, max_length=500)
    items: List[InvoiceItemCreate] = Field(..., min_length=1)


class InvoiceResponse(BaseModel):
    id: str
    tenant_id: str
    customer_id: str
    customer_name: Optional[str] = None
    invoice_number: str
    status: str
    issue_date: date
    due_date: date
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    currency: str
    notes: Optional[str] = None
    etims_status: str
    etims_control_number: Optional[str] = None
    manual_recording_ref: Optional[str] = None
    created_at: datetime
    items: List[InvoiceItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class CreditNoteCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    reason: str = Field(..., min_length=3, max_length=255)


class CreditNoteResponse(BaseModel):
    id: str
    tenant_id: str
    invoice_id: str
    credit_note_number: str
    amount: Decimal = Field(..., validation_alias="total_amount")
    total_amount: Decimal = Field(..., validation_alias="total_amount")
    subtotal: Decimal
    tax_amount: Decimal
    currency: str
    reason: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ManualRecordETIMSRequest(BaseModel):
    manual_recording_ref: str = Field(..., min_length=2, max_length=100, description="Physical receipt book number, internal eTIMS reference, or filing voucher")
    manual_notes: str = Field(..., min_length=3, max_length=500)
