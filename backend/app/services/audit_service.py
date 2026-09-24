"""
Audit Service — Immutable Compliance & RBAC Logging
"""
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database.models import AuditLog

class AuditService:
    @staticmethod
    def log(
        db: Session,
        event_type: str,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        description: Optional[str] = None,
        event_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        entry = AuditLog(
            id=str(uuid.uuid4()),
            event_type=event_type,
            user_id=user_id,
            org_id=org_id,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            event_metadata=event_metadata or {},
        )
        db.add(entry)
        return entry

audit_service = AuditService()
