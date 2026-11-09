from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StkPushRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^(?:254|\+254|0)?[17]\d{8}$", description="Kenyan mobile number e.g. 254712345678")
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Exact payment amount in KES")
    account_reference: str = Field(..., min_length=1, max_length=50, description="e.g. Invoice number INV-001 or Account ID")
    transaction_desc: Optional[str] = Field("Payment via Rodstar", max_length=100)


class StkPushResponse(BaseModel):
    payment_id: str
    checkout_request_id: str
    merchant_request_id: Optional[str]
    status: str
    customer_message: str
    is_simulated: bool = False


class PaymentResponse(BaseModel):
    id: str
    tenant_id: str
    provider: str
    provider_reference: str
    checkout_request_id: Optional[str]
    status: str
    amount: Decimal
    allocated_amount: Decimal
    unallocated_amount: Decimal
    currency: str
    sender_phone: Optional[str]
    sender_name: Optional[str]
    account_reference: Optional[str]
    payment_date: datetime
    created_at: datetime
    metadata_json: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentProviderCreate(BaseModel):
    provider_type: str = Field(..., description="DARAJA_PAYBILL, DARAJA_TILL, or BANK_MANUAL")
    name: str = Field(..., min_length=2, max_length=100)
    identifier: str = Field(..., min_length=3, max_length=50, description="Shortcode, Till number, or Account number")
    is_sandbox: bool = True
    consumer_key: Optional[str] = None
    consumer_secret: Optional[str] = None
    passkey: Optional[str] = None


class PaymentProviderResponse(BaseModel):
    id: str
    tenant_id: str
    provider_type: str
    name: str
    identifier: str
    is_sandbox: bool
    is_active: bool
    verification_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class C2BValidationConfirmationPayload(BaseModel):
    TransactionType: Optional[str] = None
    TransID: str = Field(..., description="M-PESA receipt number e.g. QKH123456")
    TransTime: Optional[str] = None
    TransAmount: Decimal = Field(..., gt=0)
    BusinessShortCode: Optional[str] = None
    BillRefNumber: Optional[str] = None
    InvoiceNumber: Optional[str] = None
    OrgAccountBalance: Optional[Decimal] = None
    ThirdPartyTransID: Optional[str] = None
    MSISDN: Optional[str] = None
    FirstName: Optional[str] = None
    MiddleName: Optional[str] = None
    LastName: Optional[str] = None
