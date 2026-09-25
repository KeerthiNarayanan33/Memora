"""Goals, Speakers, Search, Analytics, AI Status, Audit APIs"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database.session import get_db
from app.database.models import (
    Goal, GoalAction, GoalMeeting, SpeakerProfile, AuditLog, User,
    Meeting, ActionItem, Decision, TranscriptSegment, UnresolvedItem
)
from app.security.auth import get_current_user
from app.schemas import (
    GoalCreate, GoalOut, GoalUpdate, SpeakerCreate, SpeakerOut,
    SearchResult, AnalyticsData, AuditLogOut, AIStatus
)
from app.ai.ollama_client import OllamaClient

# ── Goals ─────────────────────────────────────────────────────────────────────
goals_router = APIRouter(prefix="/goals", tags=["Goals"])


def _goal_to_out(g: Goal) -> GoalOut:
    action_c = len(g.action_links)
    completed_c = sum(1 for gl in g.action_links if gl.action and gl.action.status == "COMPLETED")
    return GoalOut(
        id=g.id, title=g.title, description=g.description,
        target_date=g.target_date, status=g.status, progress_pct=g.progress_pct,
        created_at=g.created_at, action_count=action_c, completed_action_count=completed_c,
    )


@goals_router.get("", response_model=List[GoalOut])
async def list_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goals = db.query(Goal).filter(Goal.org_id == current_user.org_id).all()
    return [_goal_to_out(g) for g in goals]


@goals_router.post("", response_model=GoalOut, status_code=201)
async def create_goal(
    data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("ADMIN", "MANAGER"):
        raise HTTPException(status_code=403, detail="Manager or Admin required")
    
    g = Goal(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id,
        created_by=current_user.id,
        title=data.title,
        description=data.description,
        target_date=data.target_date,
        status="ACTIVE",
        progress_pct=0.0,
    )
    db.add(g)
    db.add(AuditLog(event_type="GOAL_CREATED", user_id=current_user.id,
                    org_id=current_user.org_id, description=f"Goal created: {data.title}"))
    db.commit()
    db.refresh(g)
    return _goal_to_out(g)


@goals_router.get("/{goal_id}", response_model=GoalOut)
async def get_goal(goal_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    g = db.query(Goal).filter(Goal.id == goal_id, Goal.org_id == current_user.org_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    return _goal_to_out(g)


@goals_router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: str, data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("ADMIN", "MANAGER"):
        raise HTTPException(status_code=403, detail="Manager or Admin required")
    g = db.query(Goal).filter(Goal.id == goal_id, Goal.org_id == current_user.org_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if data.title: g.title = data.title
    if data.description: g.description = data.description
    if data.target_date: g.target_date = data.target_date
    if data.status: g.status = data.status
    if data.progress_pct is not None: g.progress_pct = data.progress_pct
    g.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(g)
    return _goal_to_out(g)


@goals_router.get("/{goal_id}/actions")
async def get_goal_actions(goal_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    g = db.query(Goal).filter(Goal.id == goal_id, Goal.org_id == current_user.org_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    result = []
    for link in g.action_links:
        if link.action:
            result.append({
                "action_id": link.action_id,
                "action_text": link.action.action_text,
                "owner_name": link.action.owner_name,
                "status": link.action.status,
                "deadline_text": link.action.deadline_text,
                "is_ai_suggested": link.is_ai_suggested,
                "confirmed": link.confirmed,
                "meeting_id": link.action.meeting_id,
            })
    return result


@goals_router.post("/{goal_id}/actions")
async def link_action_to_goal(
    goal_id: str, action_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("ADMIN", "MANAGER"):
        raise HTTPException(status_code=403, detail="Manager or Admin required")
    
    existing = db.query(GoalAction).filter(GoalAction.goal_id == goal_id, GoalAction.action_id == action_id).first()
    if not existing:
        db.add(GoalAction(id=str(uuid.uuid4()), goal_id=goal_id, action_id=action_id, confirmed=True))
        db.commit()
    return {"status": "linked"}


# ── Speakers ──────────────────────────────────────────────────────────────────
speakers_router = APIRouter(prefix="/speakers", tags=["Speakers"])


@speakers_router.get("", response_model=List[SpeakerOut])
async def list_speakers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    speakers = db.query(SpeakerProfile).filter(SpeakerProfile.org_id == current_user.org_id).all()
    return [SpeakerOut.model_validate(s) for s in speakers]


@speakers_router.post("", response_model=SpeakerOut, status_code=201)
async def create_speaker(
    data: SpeakerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    
    sp = SpeakerProfile(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id,
        user_id=data.user_id,
        display_name=data.display_name,
        employee_id=data.employee_id,
        department=data.department,
        role_title=data.role_title,
        voice_enrolled=False,
        enrollment_status="NOT_ENROLLED",
    )
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return SpeakerOut.model_validate(sp)


@speakers_router.post("/{speaker_id}/enroll", response_model=SpeakerOut)
async def enroll_speaker_voice(
    speaker_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enroll or re-initialize a speaker's voice using an audio recording or file."""
    sp = db.query(SpeakerProfile).filter(
        SpeakerProfile.id == speaker_id,
        SpeakerProfile.org_id == current_user.org_id
    ).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Speaker profile not found")

    speaker_dir = os.path.join("data", "speakers")
    os.makedirs(speaker_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower() or ".webm"
    file_path = os.path.join(speaker_dir, f"{speaker_id}{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    sp.voice_embedding_path = file_path
    sp.voice_enrolled = True
    sp.enrollment_status = "ENROLLED"
    sp.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sp)

    return SpeakerOut.model_validate(sp)


@speakers_router.get("/{speaker_id}/sample")
async def get_speaker_voice_sample(
    speaker_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the audio sample for an enrolled speaker."""
    sp = db.query(SpeakerProfile).filter(
        SpeakerProfile.id == speaker_id,
        SpeakerProfile.org_id == current_user.org_id
    ).first()
    if not sp or not sp.voice_embedding_path or not os.path.exists(sp.voice_embedding_path):
        raise HTTPException(status_code=404, detail="Voice sample not found")

    ext = os.path.splitext(sp.voice_embedding_path)[1].lower()
    media_type = "audio/webm" if ext == ".webm" else "audio/wav" if ext == ".wav" else "audio/mpeg"
    return FileResponse(sp.voice_embedding_path, media_type=media_type, filename=f"{sp.display_name}_voice_sample{ext}")


@speakers_router.delete("/{speaker_id}/enroll", response_model=SpeakerOut)
async def reset_speaker_voice(
    speaker_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset voice enrollment for a speaker profile."""
    sp = db.query(SpeakerProfile).filter(
        SpeakerProfile.id == speaker_id,
        SpeakerProfile.org_id == current_user.org_id
    ).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Speaker profile not found")

    if sp.voice_embedding_path and os.path.exists(sp.voice_embedding_path):
        try:
            os.remove(sp.voice_embedding_path)
        except Exception:
            pass

    sp.voice_embedding_path = None
    sp.voice_enrolled = False
    sp.enrollment_status = "NOT_ENROLLED"
    sp.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sp)

    return SpeakerOut.model_validate(sp)


# ── Search ─────────────────────────────────────────────────────────────────────
search_router = APIRouter(prefix="/search", tags=["Search"])


@search_router.get("", response_model=List[SearchResult])
async def search(
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not q or len(q) < 2:
        return []
    
    results = []
    org_id = current_user.org_id
    pattern = f"%{q}%"
    
    # Search meetings
    meetings = db.query(Meeting).filter(
        Meeting.org_id == org_id,
        or_(Meeting.title.ilike(pattern), Meeting.summary.ilike(pattern))
    ).limit(5).all()
    for m in meetings:
        results.append(SearchResult(
            type="meeting", id=m.id, title=m.title,
            snippet=(m.summary or "")[:150],
            meeting_id=m.id, meeting_title=m.title, score=0.9,
        ))
    
    # Search actions
    actions = db.query(ActionItem).filter(
        ActionItem.org_id == org_id,
        or_(ActionItem.action_text.ilike(pattern), ActionItem.owner_name.ilike(pattern))
    ).limit(5).all()
    for a in actions:
        mtg = db.query(Meeting).filter(Meeting.id == a.meeting_id).first()
        results.append(SearchResult(
            type="action", id=a.id, title=a.action_text[:100],
            snippet=f"Owner: {a.owner_name} | Status: {a.status}",
            meeting_id=a.meeting_id,
            meeting_title=mtg.title if mtg else None,
            score=0.85,
        ))
    
    # Search decisions
    decisions = db.query(Decision).filter(
        Decision.org_id == org_id,
        or_(Decision.decision_text.ilike(pattern), Decision.evidence_text.ilike(pattern))
    ).limit(5).all()
    for d in decisions:
        mtg = db.query(Meeting).filter(Meeting.id == d.meeting_id).first()
        results.append(SearchResult(
            type="decision", id=d.id, title=d.decision_text[:100],
            snippet=d.evidence_text[:150],
            meeting_id=d.meeting_id,
            meeting_title=mtg.title if mtg else None,
            score=0.8,
        ))
    
    # Search transcript
    segments = db.query(TranscriptSegment).join(
        Meeting, Meeting.id == TranscriptSegment.meeting_id
    ).filter(
        Meeting.org_id == org_id,
        TranscriptSegment.text.ilike(pattern)
    ).limit(5).all()
    for s in segments:
        mtg = db.query(Meeting).filter(Meeting.id == s.meeting_id).first()
        results.append(SearchResult(
            type="transcript", id=s.id,
            title=f"{s.speaker_name or s.speaker_label}: {s.text[:60]}",
            snippet=s.text[:200],
            meeting_id=s.meeting_id,
            meeting_title=mtg.title if mtg else None,
            score=0.75,
        ))
    
    return sorted(results, key=lambda r: r.score, reverse=True)


# ── Analytics ─────────────────────────────────────────────────────────────────
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])


@analytics_router.get("", response_model=AnalyticsData)
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.org_id
    
    total_actions = db.query(ActionItem).filter(ActionItem.org_id == org_id).count()
    completed = db.query(ActionItem).filter(ActionItem.org_id == org_id, ActionItem.status == "COMPLETED").count()
    overdue = db.query(ActionItem).filter(ActionItem.org_id == org_id, ActionItem.status == "OVERDUE").count()
    unresolved = db.query(ActionItem).filter(ActionItem.org_id == org_id, ActionItem.status == "UNRESOLVED").count()
    total_meetings = db.query(Meeting).filter(Meeting.org_id == org_id).count()
    
    completion_rate = (completed / total_actions * 100) if total_actions > 0 else 0
    overdue_rate = (overdue / total_actions * 100) if total_actions > 0 else 0
    unresolved_rate = (unresolved / total_actions * 100) if total_actions > 0 else 0
    actions_per_meeting = (total_actions / total_meetings) if total_meetings > 0 else 0
    
    # Monthly meetings (last 6 months)
    monthly = []
    for i in range(5, -1, -1):
        month_start = datetime.now(timezone.utc).replace(day=1) - timedelta(days=i * 30)
        month_end = month_start + timedelta(days=30)
        count = db.query(Meeting).filter(
            Meeting.org_id == org_id,
            Meeting.meeting_date >= month_start,
            Meeting.meeting_date < month_end,
        ).count()
        monthly.append({
            "month": month_start.strftime("%b %Y"),
            "meetings": count,
        })
    
    # Status distribution
    statuses = ["NEW", "IN_PROGRESS", "COMPLETED", "OVERDUE", "UNRESOLVED", "CARRIED_OVER"]
    status_dist = {}
    for s in statuses:
        status_dist[s] = db.query(ActionItem).filter(
            ActionItem.org_id == org_id, ActionItem.status == s
        ).count()
    
    # Department distribution
    dept_dist = []
    users = db.query(User).filter(User.org_id == org_id).all()
    dept_map = {}
    for u in users:
        dept = u.department or "Unknown"
        actions = db.query(ActionItem).filter(ActionItem.org_id == org_id, ActionItem.owner_user_id == u.id).count()
        dept_map[dept] = dept_map.get(dept, 0) + actions
    for dept, count in dept_map.items():
        dept_dist.append({"department": dept, "actions": count})
    
    # Goal progress
    goals = db.query(Goal).filter(Goal.org_id == org_id).all()
    goal_prog = [{"title": g.title, "progress": g.progress_pct, "status": g.status} for g in goals]
    
    return AnalyticsData(
        action_completion_rate=round(completion_rate, 1),
        overdue_rate=round(overdue_rate, 1),
        avg_completion_days=None,
        actions_per_meeting=round(actions_per_meeting, 1),
        unresolved_rate=round(unresolved_rate, 1),
        monthly_meetings=monthly,
        status_distribution=status_dist,
        department_distribution=dept_dist,
        goal_progress=goal_prog,
    )


# ── AI Status ─────────────────────────────────────────────────────────────────
ai_router = APIRouter(prefix="/ai", tags=["AI"])


@ai_router.get("/status", response_model=AIStatus)
async def get_ai_status(current_user: User = Depends(get_current_user)):
    from app.config import settings
    client = OllamaClient()
    ollama_ok = await client.is_available()
    
    try:
        import faster_whisper
        whisper_ok = True
    except ImportError:
        whisper_ok = False
    
    try:
        import pyannote.audio
        diarization_ok = True
    except ImportError:
        diarization_ok = False
    
    mode = "REAL_AI" if ollama_ok else "DEMO_FALLBACK"
    
    return AIStatus(
        ollama_available=ollama_ok,
        model_name=settings.ollama_model,
        whisper_available=whisper_ok,
        speaker_diarization_available=diarization_ok,
        processing_mode=mode,
    )


# ── Audit Logs ────────────────────────────────────────────────────────────────
audit_router = APIRouter(prefix="/audit-logs", tags=["Audit"])


@audit_router.get("", response_model=List[AuditLogOut])
async def list_audit_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    
    logs = db.query(AuditLog).filter(
        AuditLog.org_id == current_user.org_id
    ).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [AuditLogOut.model_validate(l) for l in logs]


# ── Unresolved (global) ───────────────────────────────────────────────────────
unresolved_router = APIRouter(prefix="/unresolved", tags=["Unresolved"])


@unresolved_router.get("")
async def list_unresolved(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(UnresolvedItem).filter(
        UnresolvedItem.org_id == current_user.org_id,
        UnresolvedItem.resolved == False,
    ).order_by(UnresolvedItem.created_at.desc()).all()
    
    result = []
    for u in items:
        mtg = db.query(Meeting).filter(Meeting.id == u.meeting_id).first()
        result.append({
            "id": u.id,
            "meeting_id": u.meeting_id,
            "meeting_title": mtg.title if mtg else None,
            "item_type": u.item_type,
            "description": u.description,
            "reason": u.reason,
            "evidence_text": u.evidence_text,
            "resolved": u.resolved,
            "created_at": u.created_at,
        })
    return result


@unresolved_router.post("/{item_id}/resolve")
async def resolve_item(
    item_id: str,
    resolution_note: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("ADMIN", "MANAGER"):
        raise HTTPException(status_code=403, detail="Manager or Admin required")
    
    item = db.query(UnresolvedItem).filter(
        UnresolvedItem.id == item_id,
        UnresolvedItem.org_id == current_user.org_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.resolved = True
    item.resolved_by = current_user.id
    item.resolved_at = datetime.now(timezone.utc)
    item.resolution_note = resolution_note
    db.commit()
    return {"status": "resolved"}


# ── Digest ────────────────────────────────────────────────────────────────────
digest_router = APIRouter(prefix="/digest", tags=["Digest"])


@digest_router.get("/weekly")
async def get_weekly_digest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.org_id
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    completed = db.query(ActionItem).filter(
        ActionItem.org_id == org_id,
        ActionItem.status == "COMPLETED",
        ActionItem.completed_at >= week_ago,
    ).all()
    
    in_progress = db.query(ActionItem).filter(
        ActionItem.org_id == org_id,
        ActionItem.status == "IN_PROGRESS",
    ).all()
    
    overdue = db.query(ActionItem).filter(
        ActionItem.org_id == org_id,
        ActionItem.status == "OVERDUE",
    ).all()
    
    unresolved = db.query(ActionItem).filter(
        ActionItem.org_id == org_id,
        ActionItem.status == "UNRESOLVED",
    ).all()
    
    digest_text = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MEMORA AI — WEEKLY ACCOUNTABILITY DIGEST
  Week ending: {now.strftime('%B %d, %Y')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ COMPLETED THIS WEEK ({len(completed)}):
{chr(10).join(f'  ✓ {a.action_text[:60]} — {a.owner_name}' for a in completed) or '  None'}

🔄 IN PROGRESS ({len(in_progress)}):
{chr(10).join(f'  • {a.action_text[:60]} — {a.owner_name}' for a in in_progress) or '  None'}

🔴 OVERDUE ({len(overdue)}):
{chr(10).join(f'  ! {a.action_text[:60]} — {a.owner_name} (due: {a.deadline_text})' for a in overdue) or '  None'}

⚠️  UNRESOLVED OWNERSHIP ({len(unresolved)}):
{chr(10).join(f'  ? {a.action_text[:60]}' for a in unresolved) or '  None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by Memora AI | Privacy-First Enterprise Intelligence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    return {
        "digest_text": digest_text.strip(),
        "completed_count": len(completed),
        "in_progress_count": len(in_progress),
        "overdue_count": len(overdue),
        "unresolved_count": len(unresolved),
        "slack_integration": "unavailable",
        "email_integration": "unavailable",
        "note": "Copy the digest text above to share via Slack or email. External integrations require additional configuration.",
    }
