"""
MeetGuard AI — Pydantic Schemas
Complete request/response schemas for all API endpoints.
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: Optional[str]
    org_id: str
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str = "MEMBER"
    department: Optional[str] = None


# ── Organization ──────────────────────────────────────────────────────────────

class OrgOut(BaseModel):
    id: str
    name: str
    domain: Optional[str]
    mission: Optional[str]
    storage_policy: str
    retention_days: int
    class Config:
        from_attributes = True

class OrgUpdate(BaseModel):
    name: Optional[str] = None
    mission: Optional[str] = None
    storage_policy: Optional[str] = None
    retention_days: Optional[int] = None


# ── Speakers ──────────────────────────────────────────────────────────────────

class SpeakerOut(BaseModel):
    id: str
    display_name: str
    employee_id: Optional[str]
    department: Optional[str]
    role_title: Optional[str]
    voice_enrolled: bool
    enrollment_status: str
    user_id: Optional[str]
    class Config:
        from_attributes = True

class SpeakerCreate(BaseModel):
    display_name: str
    employee_id: Optional[str] = None
    department: Optional[str] = None
    role_title: Optional[str] = None
    user_id: Optional[str] = None


# ── Meetings ──────────────────────────────────────────────────────────────────

class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_date: datetime
    classification: str = "INTERNAL"
    storage_policy: str = "LOCAL_ONLY"
    storage_mode: Optional[str] = "LOCAL_ONLY"
    meeting_source: str = "OFFLINE_RECORDING"
    ai_processing_mode: str = "LOCAL_LLM"
    cloud_sync_scope: Optional[str] = "SUMMARY_AND_ACTIONS"
    cloud_provider: Optional[str] = None
    meeting_url: Optional[str] = None
    goal_id: Optional[str] = None
    participant_names: List[str] = []

class MeetingOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    meeting_date: datetime
    duration_seconds: Optional[int]
    classification: str
    storage_policy: str
    storage_mode: Optional[str] = "LOCAL_ONLY"
    meeting_source: Optional[str] = "OFFLINE_RECORDING"
    ai_processing_mode: Optional[str] = "LOCAL_LLM"
    cloud_sync_scope: Optional[str] = "SUMMARY_AND_ACTIONS"
    cloud_synced: Optional[bool] = False
    cloud_synced_at: Optional[datetime] = None
    cloud_provider: Optional[str] = None
    meeting_url: Optional[str] = None
    status: str
    processing_mode: Optional[str]
    summary: Optional[str]
    key_points: Optional[List[str]]
    sentiment_overall: Optional[str]
    created_at: datetime
    decision_count: int = 0
    action_count: int = 0
    unresolved_count: int = 0
    participant_count: int = 0
    class Config:
        from_attributes = True

class MeetingDetail(MeetingOut):
    risks: Optional[List[str]]
    follow_up_topics: Optional[List[str]]
    processing_error: Optional[str]
    processing_mode: Optional[str]

class CloudSyncRequest(BaseModel):
    sync_scope: str = "SUMMARY_AND_ACTIONS"  # "SUMMARY_AND_ACTIONS", "TRANSCRIPT", "FULL_MEETING"

class ProviderStatus(BaseModel):
    provider_id: str
    name: str
    icon: str
    is_configured: bool
    status_message: str
    auth_type: str
    supported_features: List[str]

class OnlineMeetingImport(BaseModel):
    provider: str  # "GOOGLE_MEET", "MICROSOFT_TEAMS", "ONEDRIVE", "UPLOADED_RECORDING"
    title: str
    meeting_url: Optional[str] = None
    meeting_date: datetime
    classification: str = "GENERAL"
    ai_processing_mode: str = "LOCAL_LLM"  # Even online meeting defaults to LOCAL_LLM!
    storage_mode: str = "CLOUD"
    cloud_sync_scope: str = "SUMMARY_AND_ACTIONS"
    participant_names: List[str] = []
    goal_id: Optional[str] = None
    transcript_sample: Optional[str] = None


# ── Transcript ────────────────────────────────────────────────────────────────

class TranscriptSegmentOut(BaseModel):
    id: str
    sequence: int
    speaker_label: Optional[str]
    speaker_name: Optional[str]
    speaker_confidence: Optional[float]
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float]
    class Config:
        from_attributes = True


# ── Decisions ─────────────────────────────────────────────────────────────────

class DecisionOut(BaseModel):
    id: str
    meeting_id: str
    decision_text: str
    evidence_text: str
    evidence_segment_id: Optional[str]
    evidence_timestamp: Optional[float]
    participants_involved: Optional[List[str]]
    hallucination_risk: bool
    requires_review: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── Action Items ──────────────────────────────────────────────────────────────

class ActionItemOut(BaseModel):
    id: str
    meeting_id: str
    org_id: str
    action_text: str
    owner_name: Optional[str]
    owner_explicit: bool
    deadline_text: Optional[str]
    deadline_date: Optional[datetime]
    deadline_explicit: bool
    status: str
    evidence_text: str
    evidence_segment_id: Optional[str]
    evidence_timestamp: Optional[float]
    confidence: Optional[float]
    is_commitment: bool
    hallucination_risk: bool
    requires_review: bool
    parent_action_id: Optional[str]
    times_carried_over: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    meeting_title: Optional[str] = None
    class Config:
        from_attributes = True

class ActionUpdate(BaseModel):
    status: Optional[str] = None
    owner_name: Optional[str] = None
    deadline_text: Optional[str] = None
    deadline_date: Optional[datetime] = None
    note: Optional[str] = None


# ── Unresolved Items ──────────────────────────────────────────────────────────

class UnresolvedItemOut(BaseModel):
    id: str
    meeting_id: str
    item_type: str
    description: str
    reason: str
    evidence_text: Optional[str]
    evidence_segment_id: Optional[str]
    resolved: bool
    resolved_at: Optional[datetime]
    resolution_note: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class ResolveUnresolvedRequest(BaseModel):
    resolution_note: str
    owner_name: Optional[str] = None


# ── Goals ─────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[datetime] = None

class GoalOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    target_date: Optional[datetime]
    status: str
    progress_pct: float
    created_at: datetime
    action_count: int = 0
    completed_action_count: int = 0
    class Config:
        from_attributes = True

class GoalActionLink(BaseModel):
    action_id: str
    is_ai_suggested: bool = False

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    status: Optional[str] = None
    progress_pct: Optional[float] = None


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_meetings: int
    total_actions: int
    completed_actions: int
    in_progress_actions: int
    new_actions: int
    overdue_actions: int
    unresolved_actions: int
    active_goals: int
    completion_rate: float
    recent_meetings: List[MeetingOut]
    overdue_actions_list: List[ActionItemOut]
    active_goals_list: List[GoalOut]


# ── Search ────────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    type: str   # meeting, action, decision, transcript
    id: str
    title: str
    snippet: str
    meeting_id: Optional[str]
    meeting_title: Optional[str]
    score: float


# ── Analytics ─────────────────────────────────────────────────────────────────

class AnalyticsData(BaseModel):
    action_completion_rate: float
    overdue_rate: float
    avg_completion_days: Optional[float]
    actions_per_meeting: float
    unresolved_rate: float
    monthly_meetings: List[dict]
    status_distribution: dict
    department_distribution: List[dict]
    goal_progress: List[dict]


# ── Processing ────────────────────────────────────────────────────────────────

class ProcessingStatus(BaseModel):
    meeting_id: str
    status: str
    progress_steps: List[dict]
    error: Optional[str]


# ── Audit ─────────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: str
    event_type: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    description: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


# ── AI Status ─────────────────────────────────────────────────────────────────

class AIStatus(BaseModel):
    ollama_available: bool
    model_name: str
    whisper_available: bool
    speaker_diarization_available: bool
    processing_mode: str  # REAL_AI or DEMO_FALLBACK
