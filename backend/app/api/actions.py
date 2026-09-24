"""Actions API — Tracker with status management"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import ActionItem, ActionHistory, AuditLog, User, Meeting
from app.security.auth import get_current_user
from app.schemas import ActionItemOut, ActionUpdate

router = APIRouter(prefix="/actions", tags=["Actions"])


def _to_out(a: ActionItem, db: Session) -> ActionItemOut:
    m = db.query(Meeting).filter(Meeting.id == a.meeting_id).first()
    return ActionItemOut(
        id=a.id, meeting_id=a.meeting_id, org_id=a.org_id,
        action_text=a.action_text, owner_name=a.owner_name,
        owner_explicit=a.owner_explicit, deadline_text=a.deadline_text,
        deadline_date=a.deadline_date, deadline_explicit=a.deadline_explicit,
        status=a.status, evidence_text=a.evidence_text,
        evidence_segment_id=a.evidence_segment_id,
        evidence_timestamp=a.evidence_timestamp,
        confidence=a.confidence, is_commitment=a.is_commitment,
        hallucination_risk=a.hallucination_risk, requires_review=a.requires_review,
        parent_action_id=a.parent_action_id, times_carried_over=a.times_carried_over,
        created_at=a.created_at, updated_at=a.updated_at,
        completed_at=a.completed_at,
        meeting_title=m.title if m else None,
    )


@router.get("", response_model=List[ActionItemOut])
async def list_actions(
    status: Optional[str] = None,
    owner: Optional[str] = None,
    meeting_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(ActionItem).filter(ActionItem.org_id == current_user.org_id)
    if status:
        q = q.filter(ActionItem.status == status)
    if owner:
        q = q.filter(ActionItem.owner_name.ilike(f"%{owner}%"))
    if meeting_id:
        q = q.filter(ActionItem.meeting_id == meeting_id)
    
    actions = q.order_by(ActionItem.created_at.desc()).offset(offset).limit(limit).all()
    return [_to_out(a, db) for a in actions]


@router.get("/overdue", response_model=List[ActionItemOut])
async def get_overdue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Also auto-mark overdue
    now = datetime.now(timezone.utc)
    actions = db.query(ActionItem).filter(
        ActionItem.org_id == current_user.org_id,
        ActionItem.status.in_(["NEW", "IN_PROGRESS"]),
        ActionItem.deadline_date != None,
        ActionItem.deadline_date < now,
    ).all()
    
    for a in actions:
        a.status = "OVERDUE"
        db.add(ActionHistory(
            id=__import__("uuid").uuid4().__str__(),
            action_id=a.id,
            old_status="NEW",
            new_status="OVERDUE",
            change_type="STATUS_CHANGED",
            note="Auto-marked overdue: deadline passed",
        ))
    db.commit()
    
    overdue = db.query(ActionItem).filter(
        ActionItem.org_id == current_user.org_id,
        ActionItem.status == "OVERDUE",
    ).all()
    return [_to_out(a, db) for a in overdue]


@router.get("/unresolved", response_model=List[ActionItemOut])
async def get_unresolved(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    actions = db.query(ActionItem).filter(
        ActionItem.org_id == current_user.org_id,
        ActionItem.status == "UNRESOLVED",
    ).all()
    return [_to_out(a, db) for a in actions]


@router.get("/{action_id}", response_model=ActionItemOut)
async def get_action(
    action_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(ActionItem).filter(
        ActionItem.id == action_id, ActionItem.org_id == current_user.org_id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Action not found")
    return _to_out(a, db)


@router.patch("/{action_id}", response_model=ActionItemOut)
async def update_action(
    action_id: str,
    data: ActionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(ActionItem).filter(
        ActionItem.id == action_id, ActionItem.org_id == current_user.org_id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Action not found")
    
    # Permission: MEMBER can only update own actions
    if current_user.role == "MEMBER" and a.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own actions")
    
    old_status = a.status
    if data.status:
        a.status = data.status
        if data.status == "COMPLETED":
            a.completed_at = datetime.now(timezone.utc)
    if data.owner_name:
        a.owner_name = data.owner_name
        a.owner_explicit = True
    if data.deadline_text:
        a.deadline_text = data.deadline_text
        a.deadline_explicit = True
    if data.deadline_date:
        a.deadline_date = data.deadline_date
    
    a.updated_at = datetime.now(timezone.utc)
    
    if data.status and data.status != old_status:
        db.add(ActionHistory(
            id=__import__("uuid").uuid4().__str__(),
            action_id=a.id,
            changed_by=current_user.id,
            old_status=old_status,
            new_status=data.status,
            change_type="STATUS_CHANGED",
            note=data.note,
        ))
        db.add(AuditLog(
            event_type="ACTION_UPDATED",
            user_id=current_user.id,
            org_id=current_user.org_id,
            resource_type="action",
            resource_id=action_id,
            description=f"Status changed: {old_status} → {data.status}",
        ))
    
    db.commit()
    db.refresh(a)
    return _to_out(a, db)


@router.get("/{action_id}/history")
async def get_action_history(
    action_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(ActionItem).filter(
        ActionItem.id == action_id, ActionItem.org_id == current_user.org_id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Action not found")
    
    return [
        {
            "id": h.id,
            "old_status": h.old_status,
            "new_status": h.new_status,
            "change_type": h.change_type,
            "note": h.note,
            "meeting_id": h.meeting_id,
            "created_at": h.created_at,
        }
        for h in a.history
    ]
