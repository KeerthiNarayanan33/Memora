"""
Meetings API — CRUD, Audio Upload, Processing Pipeline
"""
import os
import uuid
import shutil
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from sqlalchemy.orm import Session
from loguru import logger

from app.database.session import get_db
from app.database.models import (
    Meeting, MeetingParticipant, TranscriptSegment, Decision,
    ActionItem, ActionHistory, UnresolvedItem, GoalMeeting, AuditLog, User, Goal, GoalAction
)
from app.security.auth import get_current_user
from app.schemas import (
    MeetingCreate, MeetingOut, MeetingDetail, TranscriptSegmentOut,
    DecisionOut, ActionItemOut, UnresolvedItemOut, ProcessingStatus
)
from app.config import settings
from app.ai.ollama_client import extract_from_transcript, OllamaClient
from app.ai.validator import validate_extraction, detect_cross_meeting_matches

router = APIRouter(prefix="/meetings", tags=["Meetings"])

ALLOWED_AUDIO_TYPES = {"audio/wav", "audio/mp3", "audio/mpeg", "audio/m4a", "audio/webm", "audio/ogg"}
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg"}


def _log(db, event, user_id=None, description=None, org_id=None, resource_id=None):
    db.add(AuditLog(
        event_type=event, user_id=user_id, description=description,
        org_id=org_id, resource_type="meeting", resource_id=resource_id
    ))


from app.services.meeting_service import meeting_service


def _meeting_to_out(m: Meeting, db: Session) -> MeetingOut:
    return MeetingOut(
        id=m.id, title=m.title, description=m.description,
        meeting_date=m.meeting_date, duration_seconds=m.duration_seconds,
        classification=m.classification, storage_policy=m.storage_policy,
        storage_mode=m.storage_mode or m.storage_policy,
        meeting_source=m.meeting_source or "OFFLINE_RECORDING",
        ai_processing_mode=m.ai_processing_mode or "LOCAL_LLM",
        cloud_sync_scope=m.cloud_sync_scope,
        cloud_synced=m.cloud_synced,
        cloud_synced_at=m.cloud_synced_at,
        cloud_provider=m.cloud_provider,
        meeting_url=m.meeting_url,
        status=m.status, processing_mode=m.processing_mode,
        summary=m.summary, key_points=m.key_points,
        sentiment_overall=m.sentiment_overall, created_at=m.created_at,
        decision_count=len(m.decisions),
        action_count=len(m.action_items),
        unresolved_count=len(m.unresolved_items),
        participant_count=len(m.participants),
    )


@router.post("", response_model=MeetingOut, status_code=201)
async def create_meeting(
    data: MeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("ADMIN", "MANAGER"):
        raise HTTPException(status_code=403, detail="Manager or Admin required")
    
    storage_mode_val = data.storage_mode or data.storage_policy
    meeting = Meeting(
        id=str(uuid.uuid4()),
        org_id=current_user.org_id,
        created_by=current_user.id,
        title=data.title,
        description=data.description,
        meeting_date=data.meeting_date,
        classification=data.classification,
        storage_policy=storage_mode_val,
        storage_mode=storage_mode_val,
        meeting_source=data.meeting_source,
        ai_processing_mode=data.ai_processing_mode,
        cloud_sync_scope=data.cloud_sync_scope,
        cloud_provider=data.cloud_provider,
        meeting_url=data.meeting_url,
        status="CREATED",
    )
    db.add(meeting)
    
    # Add participants
    for name in data.participant_names:
        db.add(MeetingParticipant(
            id=str(uuid.uuid4()),
            meeting_id=meeting.id,
            name=name,
            identified=False,
        ))
    
    # Link to goal if specified
    if data.goal_id:
        db.add(GoalMeeting(id=str(uuid.uuid4()), goal_id=data.goal_id, meeting_id=meeting.id))
    
    _log(db, "MEETING_CREATED", current_user.id, f"Created meeting: {data.title} [{data.meeting_source}|{data.ai_processing_mode}|{storage_mode_val}]", 
         current_user.org_id, meeting.id)
    db.commit()
    db.refresh(meeting)
    return _meeting_to_out(meeting, db)


@router.get("", response_model=List[MeetingOut])
async def list_meetings(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Meeting).filter(Meeting.org_id == current_user.org_id)
    if status:
        q = q.filter(Meeting.status == status)
    meetings = q.order_by(Meeting.meeting_date.desc()).offset(offset).limit(limit).all()
    return [_meeting_to_out(m, db) for m in meetings]


@router.get("/{meeting_id}", response_model=MeetingDetail)
async def get_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.org_id == current_user.org_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return MeetingDetail(
        id=m.id, title=m.title, description=m.description,
        meeting_date=m.meeting_date, duration_seconds=m.duration_seconds,
        classification=m.classification, storage_policy=m.storage_policy,
        storage_mode=m.storage_mode or m.storage_policy,
        meeting_source=m.meeting_source or "OFFLINE_RECORDING",
        ai_processing_mode=m.ai_processing_mode or "LOCAL_LLM",
        cloud_sync_scope=m.cloud_sync_scope,
        cloud_synced=m.cloud_synced,
        cloud_synced_at=m.cloud_synced_at,
        cloud_provider=m.cloud_provider,
        meeting_url=m.meeting_url,
        status=m.status, processing_mode=m.processing_mode,
        summary=m.summary, key_points=m.key_points,
        risks=m.risks, follow_up_topics=m.follow_up_topics,
        sentiment_overall=m.sentiment_overall, created_at=m.created_at,
        processing_error=m.processing_error,
        decision_count=len(m.decisions),
        action_count=len(m.action_items),
        unresolved_count=len(m.unresolved_items),
        participant_count=len(m.participants),
    )


@router.post("/{meeting_id}/audio")
async def upload_audio(
    meeting_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.org_id == current_user.org_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Validate file
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}")
    
    # Size check
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=413, detail=f"File too large. Max: {settings.max_upload_size_mb}MB")
    
    # Storage path based on policy
    if m.storage_policy == "LOCAL_ONLY" or m.storage_policy == "LOCAL_AND_CLOUD":
        save_dir = os.path.join(settings.local_storage_dir, m.org_id, meeting_id)
        os.makedirs(save_dir, exist_ok=True)
        audio_path = os.path.join(save_dir, f"audio{ext}")
        with open(audio_path, "wb") as f:
            f.write(content)
    else:
        save_dir = os.path.join(settings.upload_dir, meeting_id)
        os.makedirs(save_dir, exist_ok=True)
        audio_path = os.path.join(save_dir, f"audio{ext}")
        with open(audio_path, "wb") as f:
            f.write(content)
    
    m.audio_path = audio_path
    m.audio_format = ext[1:]
    m.audio_size_bytes = len(content)
    m.status = "AUDIO_UPLOADED"
    
    _log(db, "AUDIO_UPLOADED", current_user.id, f"Audio uploaded for meeting {meeting_id}",
         current_user.org_id, meeting_id)
    db.commit()
    
    return {"status": "uploaded", "path": audio_path, "size": len(content)}


@router.post("/{meeting_id}/process")
async def process_meeting(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.org_id == current_user.org_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if m.status in ("PROCESSING", "TRANSCRIBING", "IDENTIFYING_SPEAKERS", "ANALYZING"):
        raise HTTPException(status_code=400, detail="Meeting is already being processed")
    
    m.status = "PROCESSING"
    m.processing_started_at = datetime.now(timezone.utc)
    db.commit()
    
    background_tasks.add_task(
        meeting_service.process_pipeline, meeting_id, current_user.org_id, current_user.id
    )
    
    return {"status": "processing_started", "meeting_id": meeting_id}


async def _process_meeting_bg(meeting_id: str, org_id: str, user_id: str):
    """Background processing pipeline"""
    from app.database.session import SessionLocal
    db = SessionLocal()
    
    try:
        m = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not m:
            return
        
        logger.info(f"[PIPELINE] Starting processing for meeting {meeting_id}")
        
        # Step 1: Check AI availability
        ollama = OllamaClient()
        ollama_available = await ollama.is_available()
        
        # Step 2: Try to load transcript (from audio or use demo)
        m.status = "TRANSCRIBING"
        db.commit()
        
        transcript_text = await _transcribe_audio(m.audio_path)
        
        # Step 3: Speaker identification (demo)
        m.status = "IDENTIFYING_SPEAKERS"
        db.commit()
        
        # Step 4: AI analysis
        m.status = "ANALYZING"
        db.commit()
        
        extraction_result = None
        if ollama_available and transcript_text:
            extraction_result = await extract_from_transcript(transcript_text)
            m.processing_mode = "REAL_AI"
        
        if extraction_result is None:
            logger.warning(f"[PIPELINE] Using demo fallback for meeting {meeting_id}")
            extraction_result = _get_demo_extraction(m.title)
            m.processing_mode = "DEMO_FALLBACK"
        
        # Step 5: Validate
        m.status = "VALIDATING"
        db.commit()
        
        validated = validate_extraction(extraction_result, transcript_text or "")
        
        # Step 6: Get existing open actions for cross-meeting matching
        existing_actions = db.query(ActionItem).filter(
            ActionItem.org_id == org_id,
            ActionItem.status.in_(["NEW", "IN_PROGRESS", "UNRESOLVED", "CARRIED_OVER"])
        ).all()
        
        cross_matches = detect_cross_meeting_matches(
            validated.get("action_items", []), existing_actions
        )
        matched_ids = {cm["existing_action_id"] for cm in cross_matches}
        
        # Step 7: Persist
        m.summary = validated.get("meeting_summary", "")
        m.key_points = validated.get("key_points", [])
        m.risks = validated.get("risks", [])
        m.follow_up_topics = validated.get("follow_up_topics", [])
        m.sentiment_overall = validated.get("sentiment_overall", "NEUTRAL")
        
        # Persist decisions
        for dec_data in validated.get("decisions", []):
            dec = Decision(
                id=str(uuid.uuid4()),
                meeting_id=meeting_id,
                org_id=org_id,
                decision_text=dec_data.get("decision", ""),
                evidence_text=dec_data.get("evidence", ""),
                participants_involved=dec_data.get("participants", []),
                hallucination_risk=dec_data.get("hallucination_risk", False),
                requires_review=dec_data.get("requires_review", False),
            )
            db.add(dec)
        
        # Persist action items (skip if matched existing)
        for ai_data in validated.get("action_items", []):
            action_text = ai_data.get("action", "")
            
            # Check if this matches an existing action
            is_update = False
            for cm in cross_matches:
                if cm["new_action_text"] == action_text:
                    # Update existing action
                    existing = db.query(ActionItem).filter(ActionItem.id == cm["existing_action_id"]).first()
                    if existing:
                        old_status = existing.status
                        existing.status = "IN_PROGRESS"
                        existing.times_carried_over += 1
                        db.add(ActionHistory(
                            id=str(uuid.uuid4()),
                            action_id=existing.id,
                            meeting_id=meeting_id,
                            old_status=old_status,
                            new_status="IN_PROGRESS",
                            change_type="CARRIED_OVER",
                            note=f"Referenced in meeting: update via cross-meeting tracking",
                        ))
                    is_update = True
                    break
            
            if is_update:
                continue
            
            # Create new action
            owner = ai_data.get("owner", "UNRESOLVED")
            deadline = ai_data.get("deadline", "UNRESOLVED")
            
            # Resolve owner to user
            owner_user_id = None
            if owner and owner != "UNRESOLVED":
                # Try to match by name
                parts = owner.lower().split()
                users = db.query(User).filter(User.org_id == org_id).all()
                for u in users:
                    if any(p in u.name.lower() for p in parts):
                        owner_user_id = u.id
                        break
            
            ai_obj = ActionItem(
                id=str(uuid.uuid4()),
                org_id=org_id,
                meeting_id=meeting_id,
                action_text=action_text,
                owner_name=owner if owner else "UNRESOLVED",
                owner_user_id=owner_user_id,
                owner_explicit=ai_data.get("owner_explicit", False),
                deadline_text=deadline if deadline else "UNRESOLVED",
                deadline_explicit=ai_data.get("deadline_explicit", False),
                status="NEW" if owner != "UNRESOLVED" else "UNRESOLVED",
                evidence_text=ai_data.get("evidence", ""),
                confidence=ai_data.get("confidence", 0.8),
                is_commitment=True,
                hallucination_risk=ai_data.get("hallucination_risk", False),
                requires_review=ai_data.get("requires_review", False),
            )
            db.add(ai_obj)
            db.add(ActionHistory(
                id=str(uuid.uuid4()),
                action_id=ai_obj.id,
                meeting_id=meeting_id,
                new_status=ai_obj.status,
                change_type="CREATED",
                note="Created from AI extraction",
            ))
        
        # Persist unresolved items
        for u_data in validated.get("unresolved_items", []):
            db.add(UnresolvedItem(
                id=str(uuid.uuid4()),
                meeting_id=meeting_id,
                org_id=org_id,
                item_type=u_data.get("type", "ACTION"),
                description=u_data.get("description", ""),
                reason=u_data.get("reason", ""),
                evidence_text=u_data.get("evidence", ""),
            ))
        
        m.status = "COMPLETED"
        m.processing_completed_at = datetime.now(timezone.utc)
        
        db.add(AuditLog(
            event_type="MEETING_PROCESSED",
            user_id=user_id,
            org_id=org_id,
            resource_type="meeting",
            resource_id=meeting_id,
            description=f"Meeting processed via {m.processing_mode}",
        ))
        db.commit()
        logger.info(f"[PIPELINE] Processing complete for meeting {meeting_id}")
        
    except Exception as e:
        logger.exception(f"[PIPELINE] Error processing meeting {meeting_id}: {e}")
        m = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if m:
            m.status = "FAILED"
            m.processing_error = str(e)
            db.commit()
    finally:
        db.close()


async def _transcribe_audio(audio_path: Optional[str]) -> Optional[str]:
    """Attempt speech-to-text. Returns transcript text or None."""
    if not audio_path or not os.path.exists(audio_path):
        logger.info("No audio file — using demo transcript")
        return None
    
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(settings.whisper_model, device=settings.whisper_device)
        segments, _ = model.transcribe(audio_path, beam_size=5)
        return " ".join(seg.text for seg in segments)
    except ImportError:
        logger.warning("faster-whisper not installed")
        return None
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return None


def _get_demo_extraction(meeting_title: str) -> dict:
    """Deterministic demo extraction for when AI is unavailable"""
    return {
        "meeting_summary": f"Meeting '{meeting_title}' was analyzed using demo extraction. Several action items were identified with clear ownership and deadlines.",
        "key_points": [
            "Team reviewed project milestones",
            "Action items assigned with clear owners",
            "Deadlines confirmed for key deliverables",
        ],
        "sentiment_overall": "NEUTRAL",
        "decisions": [
            {
                "decision": "Project timeline confirmed and communicated to all stakeholders.",
                "evidence": "The timeline has been confirmed and we are proceeding as planned.",
                "participants": ["Team Lead", "Project Manager"],
            }
        ],
        "action_items": [
            {
                "action": "Prepare project status report",
                "owner": "Team Lead",
                "deadline": "Next Friday",
                "confidence": 0.85,
                "evidence": "Team Lead will prepare the status report by next Friday.",
                "owner_explicit": True,
                "deadline_explicit": True,
                "is_commitment": True,
                "commitment_type": "EXPLICIT",
            }
        ],
        "unresolved_items": [],
        "risks": [],
        "follow_up_topics": [],
    }


@router.get("/{meeting_id}/transcript", response_model=List[TranscriptSegmentOut])
async def get_transcript(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.org_id == current_user.org_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return [TranscriptSegmentOut.model_validate(s) for s in m.transcript_segments]


@router.get("/{meeting_id}/decisions", response_model=List[DecisionOut])
async def get_decisions(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.org_id == current_user.org_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return [DecisionOut.model_validate(d) for d in m.decisions]


@router.get("/{meeting_id}/actions", response_model=List[ActionItemOut])
async def get_meeting_actions(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.org_id == current_user.org_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    result = []
    for a in m.action_items:
        result.append(ActionItemOut(
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
            completed_at=a.completed_at, meeting_title=m.title,
        ))
    return result


@router.get("/{meeting_id}/unresolved", response_model=List[UnresolvedItemOut])
async def get_unresolved(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.org_id == current_user.org_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return [UnresolvedItemOut.model_validate(u) for u in m.unresolved_items]


@router.get("/{meeting_id}/participants")
async def get_participants(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.org_id == current_user.org_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return [
        {
            "id": p.id, "name": p.name, "speaker_label": p.speaker_label,
            "identified": p.identified, "user_id": p.user_id,
        }
        for p in m.participants
    ]
