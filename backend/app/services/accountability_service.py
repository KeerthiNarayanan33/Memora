"""
Accountability Service — Cross-Meeting Tracking & Action Lifecycle
"""
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import ActionItem, ActionHistory, Meeting

class AccountabilityService:
    @staticmethod
    def match_cross_meeting_actions(
        db: Session,
        org_id: str,
        new_actions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Cross-meeting accountability:
        Detects if a new extracted action refers to an existing open action item
        to update its status/velocity instead of creating duplicate records.
        """
        open_actions = db.query(ActionItem).filter(
            ActionItem.org_id == org_id,
            ActionItem.status.in_(["NEW", "IN_PROGRESS", "UNRESOLVED", "CARRIED_OVER"])
        ).all()

        matches = []
        for new_act in new_actions:
            new_text = new_act.get("action", "").lower()
            for existing in open_actions:
                exist_text = existing.action_text.lower()
                # Similarity check via significant token overlap
                new_tokens = set(t for t in new_text.split() if len(t) > 3)
                exist_tokens = set(t for t in exist_text.split() if len(t) > 3)
                
                if new_tokens and exist_tokens:
                    overlap = len(new_tokens & exist_tokens) / max(len(new_tokens), len(exist_tokens))
                    if overlap >= 0.5:
                        matches.append({
                            "new_action_text": new_act.get("action"),
                            "existing_action_id": existing.id,
                            "existing_title": existing.action_text,
                            "match_confidence": round(overlap, 2),
                        })
                        break

        return matches

    @staticmethod
    def update_action_status(
        db: Session,
        action_id: str,
        new_status: str,
        user_id: Optional[str] = None,
        note: Optional[str] = None
    ) -> ActionItem:
        action = db.query(ActionItem).filter(ActionItem.id == action_id).first()
        if not action:
            raise ValueError(f"Action {action_id} not found")
        
        old_status = action.status
        action.status = new_status
        if new_status == "COMPLETED":
            action.completed_at = datetime.now(timezone.utc)
            
        history = ActionHistory(
            id=str(uuid.uuid4()),
            action_id=action.id,
            meeting_id=action.meeting_id,
            old_status=old_status,
            new_status=new_status,
            change_type="STATUS_CHANGED",
            note=note or f"Status changed from {old_status} to {new_status}",
        )
        db.add(history)
        return action

    @staticmethod
    def sweep_overdue(db: Session, org_id: str) -> int:
        now = datetime.now(timezone.utc)
        overdue_items = db.query(ActionItem).filter(
            ActionItem.org_id == org_id,
            ActionItem.status.in_(["NEW", "IN_PROGRESS"]),
            ActionItem.deadline_date != None,
            ActionItem.deadline_date < now
        ).all()

        for item in overdue_items:
            item.status = "OVERDUE"
            db.add(ActionHistory(
                id=str(uuid.uuid4()),
                action_id=item.id,
                meeting_id=item.meeting_id,
                old_status="IN_PROGRESS",
                new_status="OVERDUE",
                change_type="AUTO_OVERDUE",
                note="Automatically marked OVERDUE by SLA engine",
            ))
        return len(overdue_items)

accountability_service = AccountabilityService()
