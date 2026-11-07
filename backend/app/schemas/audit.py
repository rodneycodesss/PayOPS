from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: str
    tenant_id: Optional[str]
    actor_id: Optional[str]
    actor_email: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogFilter(BaseModel):
    action: Optional[str] = None
    resource_type: Optional[str] = None
    actor_email: Optional[str] = None
    skip: int = 0
    limit: int = 50
