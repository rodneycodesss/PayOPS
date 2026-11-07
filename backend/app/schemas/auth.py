from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    # Business profile
    business_name: str = Field(..., min_length=2, max_length=255, description="Registered legal name")
    trading_name: Optional[str] = Field(None, max_length=255, description="Trading name if different")
    kra_pin: Optional[str] = Field(None, min_length=11, max_length=11, description="Kenyan KRA PIN (e.g. P051234567Z)")
    
    # Primary owner user
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    phone: Optional[str] = Field(None, max_length=50)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = Field(None, min_length=6, max_length=6, description="6-digit TOTP code if MFA enabled")


class TokenResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: int = 1800  # seconds
    mfa_required: bool = False
    temp_token: Optional[str] = None  # Returned when MFA verification is pending


class RefreshRequest(BaseModel):
    refresh_token: str


class RevokeRequest(BaseModel):
    refresh_token: Optional[str] = None


class MfaSetupResponse(BaseModel):
    secret: str
    otpauth_url: str


class MfaVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class UserProfileResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    full_name: str
    is_active: bool
    is_verified: bool
    mfa_enabled: bool
    roles: List[str]
    permissions: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
