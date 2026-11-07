import secrets
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="e.g. n8n Automation Engine")
    scopes: List[str] = Field(..., min_length=1, description="List of permission codes to grant to this service account")
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class ApiKeyCreatedResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    raw_api_key: str = Field(..., description="Copy this key now. It will not be shown again.")
    key_prefix: str
    scopes: List[str]
    expires_at: Optional[datetime]
    created_at: datetime


class ApiKeyResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    key_prefix: str
    scopes: List[str]
    is_active: bool
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
