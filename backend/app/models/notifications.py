import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, String, Text, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, TenantMixin


class Notification(Base, TimestampMixin, TenantMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # EMAIL, SMS
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    message_body: Mapped[str] = mapped_column(Text, nullable=False)
    
    # PENDING, SENT, FAILED
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False, index=True)
    error_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class AutomationJob(Base, TimestampMixin, TenantMixin):
    __tablename__ = "automation_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # WF01..WF14, DAILY_RECONCILIATION, PERIOD_CLOSE
    job_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    trigger_source: Mapped[str] = mapped_column(String(50), default="N8N", nullable=False)
    
    # QUEUED, RUNNING, COMPLETED, FAILED
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", nullable=False, index=True)
    
    parameters: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    result_summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
