from typing import Any, Dict, Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


class AuditService:
    @staticmethod
    async def log_event(
        db: AsyncSession,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        actor_email: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """
        Persists an immutable audit log entry.
        Captures actor, action, resource, tenant, IP address, and user agent.
        """
        ip_address = None
        user_agent = None

        if request:
            # Extract client IP respecting forwarded headers
            forwarded_for = request.headers.get("x-forwarded-for")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()
            elif request.client:
                ip_address = request.client.host
            user_agent = request.headers.get("user-agent")

        audit_entry = AuditLog(
            tenant_id=tenant_id,
            actor_id=actor_id,
            actor_email=actor_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        db.add(audit_entry)
        await db.flush()
        return audit_entry
