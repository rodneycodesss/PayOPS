from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    kra_pin: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    currency: str = Field("KES", max_length=3)


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    kra_pin: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    kra_pin: Optional[str]
    address: Optional[str]
    credit_balance: Decimal
    currency: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
