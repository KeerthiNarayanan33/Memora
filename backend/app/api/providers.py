"""
Providers & Cloud Service API Router
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User, Meeting
from app.security.auth import get_current_user
from app.schemas import ProviderStatus, OnlineMeetingImport, CloudSyncRequest, MeetingOut
from app.services.cloud_service import cloud_service
from app.services.storage_service import storage_service
from app.services.meeting_service import meeting_service

router = APIRouter(tags=["Providers & Cloud"])

@router.get("/providers", response_model=List[ProviderStatus])
async def list_providers(current_user: User = Depends(get_current_user)):
    """List available online meeting providers with configuration status"""
    return [ProviderStatus(**p) for p in cloud_service.list_providers()]

@router.post("/providers/import", response_model=MeetingOut)
async def import_online_meeting(
    data: OnlineMeetingImport,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import an online meeting (e.g. from Google Meet, Microsoft Teams, or uploaded recording).
    Crucially: AI processing is LOCAL (Local Llama) even for online meetings!
    """
    meeting = meeting_service.create_meeting(
        db=db,
        org_id=current_user.org_id,
        user_id=current_user.id,
        title=data.title,
        meeting_date=data.meeting_date,
        description=f"Imported from {data.provider} ({data.meeting_url or 'Direct Upload'})",
        classification=data.classification,
        storage_policy=data.storage_mode,
        storage_mode=data.storage_mode,
        meeting_source=data.provider,
        ai_processing_mode=data.ai_processing_mode,  # LOCAL_LLM
        cloud_sync_scope=data.cloud_sync_scope,
        cloud_provider=data.provider,
        meeting_url=data.meeting_url,
        goal_id=data.goal_id,
        participant_names=data.participant_names
    )

    # Automatically queue background processing
    background_tasks.add_task(
        meeting_service.process_pipeline,
        meeting.id,
        current_user.org_id,
        current_user.id
    )

    return MeetingOut.model_validate(meeting)

@router.post("/meetings/{meeting_id}/cloud-sync")
async def trigger_cloud_sync(
    meeting_id: str,
    req: CloudSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicitly synchronize extracted meeting outputs to cloud under configured scope"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.org_id == current_user.org_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    decisions = [
        {"decision_text": d.decision_text, "confidence": d.confidence}
        for d in meeting.decisions
    ]
    actions = [
        {"action_text": a.action_text, "owner_name": a.owner_name, "deadline_text": a.deadline_text}
        for a in meeting.action_items
    ]

    res = cloud_service.sync_to_cloud(
        meeting_id=meeting.id,
        title=meeting.title,
        summary=meeting.summary,
        decisions=decisions,
        actions=actions,
        scope=req.sync_scope
    )

    meeting.cloud_synced = True
    meeting.cloud_synced_at = res["synced_at"]
    meeting.cloud_sync_scope = req.sync_scope
    db.commit()

    return res

@router.get("/storage/local-stats")
async def get_local_storage_stats(current_user: User = Depends(get_current_user)):
    """Inspect local MeetGuard filesystem storage statistics"""
    return storage_service.get_local_storage_stats()
