"""
Dashboard API — Command Center Data
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.database.models import Meeting, ActionItem, Goal, User, UnresolvedItem
from app.security.auth import get_current_user
from app.schemas import DashboardStats, MeetingOut, ActionItemOut, GoalOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardStats)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.org_id
    now = datetime.now(timezone.utc)
    
    # Meeting counts
    total_meetings = db.query(Meeting).filter(Meeting.org_id == org_id).count()
    
    # Action counts
    actions = db.query(ActionItem).filter(ActionItem.org_id == org_id)
    total_actions = actions.count()
    completed = actions.filter(ActionItem.status == "COMPLETED").count()
    in_progress = actions.filter(ActionItem.status == "IN_PROGRESS").count()
    new_actions = actions.filter(ActionItem.status == "NEW").count()
    overdue = actions.filter(ActionItem.status == "OVERDUE").count()
    unresolved = actions.filter(ActionItem.status == "UNRESOLVED").count()
    
    # Goals
    active_goals = db.query(Goal).filter(Goal.org_id == org_id, Goal.status == "ACTIVE").count()
    
    completion_rate = (completed / total_actions * 100) if total_actions > 0 else 0.0
    
    # Recent meetings (last 5)
    recent_meetings_q = (
        db.query(Meeting)
        .filter(Meeting.org_id == org_id, Meeting.status == "COMPLETED")
        .order_by(Meeting.meeting_date.desc())
        .limit(5)
        .all()
    )
    
    recent_meetings = []
    for m in recent_meetings_q:
        d_count = len(m.decisions)
        a_count = len(m.action_items)
        u_count = len(m.unresolved_items)
        p_count = len(m.participants)
        out = MeetingOut(
            id=m.id, title=m.title, description=m.description,
            meeting_date=m.meeting_date, duration_seconds=m.duration_seconds,
            classification=m.classification, storage_policy=m.storage_policy,
            status=m.status, processing_mode=m.processing_mode,
            summary=m.summary, key_points=m.key_points,
            sentiment_overall=m.sentiment_overall, created_at=m.created_at,
            decision_count=d_count, action_count=a_count,
            unresolved_count=u_count, participant_count=p_count,
        )
        recent_meetings.append(out)
    
    # Overdue actions list
    overdue_list_q = (
        db.query(ActionItem)
        .filter(ActionItem.org_id == org_id, ActionItem.status == "OVERDUE")
        .order_by(ActionItem.deadline_date)
        .limit(10)
        .all()
    )
    overdue_actions_list = []
    for a in overdue_list_q:
        m = db.query(Meeting).filter(Meeting.id == a.meeting_id).first()
        out = ActionItemOut(
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
        overdue_actions_list.append(out)
    
    # Active goals
    goals_q = db.query(Goal).filter(Goal.org_id == org_id, Goal.status == "ACTIVE").limit(5).all()
    active_goals_list = []
    for g in goals_q:
        action_c = len(g.action_links)
        completed_c = sum(1 for gl in g.action_links if gl.action and gl.action.status == "COMPLETED")
        out = GoalOut(
            id=g.id, title=g.title, description=g.description,
            target_date=g.target_date, status=g.status,
            progress_pct=g.progress_pct, created_at=g.created_at,
            action_count=action_c, completed_action_count=completed_c,
        )
        active_goals_list.append(out)
    
    return DashboardStats(
        total_meetings=total_meetings,
        total_actions=total_actions,
        completed_actions=completed,
        in_progress_actions=in_progress,
        new_actions=new_actions,
        overdue_actions=overdue,
        unresolved_actions=unresolved,
        active_goals=active_goals,
        completion_rate=round(completion_rate, 1),
        recent_meetings=recent_meetings,
        overdue_actions_list=overdue_actions_list,
        active_goals_list=active_goals_list,
    )
