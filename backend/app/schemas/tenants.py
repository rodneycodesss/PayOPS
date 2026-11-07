from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TenantResponse(BaseModel):
    id: str
    name: str
    trading_name: Optional[str]
    kra_pin: Optional[str]
    email: str
    phone: Optional[str]
    address: Optional[str]
    currency: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    trading_name: Optional[str] = Field(None, max_length=255)
    kra_pin: Optional[str] = Field(None, min_length=11, max_length=11)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class BranchCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    address: Optional[str] = None
    is_headquarters: bool = False


class BranchResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    code: str
    address: Optional[str]
    is_headquarters: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserInviteRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    role_name: str = Field(..., description="Role name to assign: finance_admin, accountant, cashier, auditor, viewer")
    temp_password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    full_name: str
    is_active: bool
    mfa_enabled: bool
    roles: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    is_system: bool
    permissions: List[str]

    model_config = ConfigDict(from_attributes=True)
