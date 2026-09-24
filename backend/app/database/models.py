"""
MeetGuard AI — SQLAlchemy Database Models
Designed for SQLite MVP with easy PostgreSQL migration path.
"""
from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import DeclarativeBase, relationship


def utcnow():
    return datetime.now(timezone.utc)


def gen_id():
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


# ── Users & Organizations ────────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String(200), nullable=False)
    domain = Column(String(100), unique=True, nullable=True)
    mission = Column(Text, nullable=True)
    storage_policy = Column(
        Enum("LOCAL_ONLY", "CLOUD", "LOCAL_AND_CLOUD", name="storage_policy"),
        default="LOCAL_ONLY"
    )
    retention_days = Column(Integer, default=90)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    users = relationship("User", back_populates="organization")
    meetings = relationship("Meeting", back_populates="organization")
    goals = relationship("Goal", back_populates="organization")


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=gen_id)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(
        Enum("ADMIN", "MANAGER", "MEMBER", name="user_role"),
        default="MEMBER"
    )
    department = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    organization = relationship("Organization", back_populates="users")
    speaker_profile = relationship("SpeakerProfile", back_populates="user", uselist=False)
    action_items = relationship("ActionItem", foreign_keys="ActionItem.owner_user_id", back_populates="owner_user")


# ── Speaker Profiles ─────────────────────────────────────────────────────────

class SpeakerProfile(Base):
    __tablename__ = "speaker_profiles"
    
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    display_name = Column(String(200), nullable=False)
    employee_id = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    role_title = Column(String(100), nullable=True)
    voice_enrolled = Column(Boolean, default=False)
    voice_embedding_path = Column(String(500), nullable=True)
    enrollment_status = Column(
        Enum("NOT_ENROLLED", "PENDING", "ENROLLED", "FAILED", name="enrollment_status"),
        default="NOT_ENROLLED"
    )
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    user = relationship("User", back_populates="speaker_profile")


# ── Meetings ──────────────────────────────────────────────────────────────────

class Meeting(Base):
    __tablename__ = "meetings"
    
    id = Column(String, primary_key=True, default=gen_id)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    meeting_date = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    
    classification = Column(
        Enum("HIGHLY_CONFIDENTIAL", "INTERNAL", "GENERAL", name="classification"),
        default="INTERNAL"
    )
    storage_policy = Column(
        Enum("LOCAL_ONLY", "CLOUD", "LOCAL_AND_CLOUD", name="meeting_storage"),
        default="LOCAL_ONLY"
    )
    meeting_source = Column(
        Enum("OFFLINE_RECORDING", "GOOGLE_MEET", "MICROSOFT_TEAMS", "ONEDRIVE", "UPLOADED_RECORDING", name="meeting_source"),
        default="OFFLINE_RECORDING"
    )
    ai_processing_mode = Column(
        Enum("LOCAL_LLM", "CLOUD_LLM", "HYBRID", name="ai_processing_mode"),
        default="LOCAL_LLM"
    )
    storage_mode = Column(
        Enum("LOCAL_ONLY", "CLOUD", "LOCAL_AND_CLOUD", name="meeting_storage_mode"),
        default="LOCAL_ONLY"
    )
    cloud_sync_scope = Column(
        Enum("SUMMARY_AND_ACTIONS", "TRANSCRIPT", "FULL_MEETING", name="cloud_sync_scope"),
        default="SUMMARY_AND_ACTIONS"
    )
    cloud_synced = Column(Boolean, default=False)
    cloud_synced_at = Column(DateTime, nullable=True)
    cloud_provider = Column(String(50), nullable=True)
    meeting_url = Column(String(500), nullable=True)
    
    status = Column(
        Enum(
            "CREATED", "AUDIO_UPLOADED", "PROCESSING", "TRANSCRIBING",
            "IDENTIFYING_SPEAKERS", "ANALYZING", "VALIDATING", "COMPLETED", "FAILED",
            name="meeting_status"
        ),
        default="CREATED"
    )
    processing_mode = Column(
        Enum("REAL_AI", "DEMO_FALLBACK", name="processing_mode"),
        nullable=True
    )
    
    audio_path = Column(String(500), nullable=True)
    audio_format = Column(String(20), nullable=True)
    audio_size_bytes = Column(Integer, nullable=True)
    
    summary = Column(Text, nullable=True)
    key_points = Column(JSON, nullable=True)
    risks = Column(JSON, nullable=True)
    follow_up_topics = Column(JSON, nullable=True)
    
    sentiment_overall = Column(String(50), nullable=True)
    sentiment_details = Column(JSON, nullable=True)
    
    processing_error = Column(Text, nullable=True)
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    organization = relationship("Organization", back_populates="meetings")
    participants = relationship("MeetingParticipant", back_populates="meeting", cascade="all, delete-orphan")
    transcript_segments = relationship("TranscriptSegment", back_populates="meeting", cascade="all, delete-orphan", order_by="TranscriptSegment.start_time")
    decisions = relationship("Decision", back_populates="meeting", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting")
    unresolved_items = relationship("UnresolvedItem", back_populates="meeting", cascade="all, delete-orphan")
    goal_links = relationship("GoalMeeting", back_populates="meeting")


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"
    
    id = Column(String, primary_key=True, default=gen_id)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    speaker_profile_id = Column(String, ForeignKey("speaker_profiles.id"), nullable=True)
    name = Column(String(200), nullable=False)
    speaker_label = Column(String(50), nullable=True)  # "SPEAKER_00", "SPEAKER_01"
    identified = Column(Boolean, default=False)
    
    __table_args__ = (
        Index("ix_mp_meeting", "meeting_id"),
    )
    
    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User")
    speaker_profile = relationship("SpeakerProfile")


# ── Transcript ────────────────────────────────────────────────────────────────

class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    
    id = Column(String, primary_key=True, default=gen_id)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False)
    sequence = Column(Integer, nullable=False)
    speaker_label = Column(String(50), nullable=True)   # raw diarization label
    speaker_name = Column(String(200), nullable=True)   # identified name
    speaker_profile_id = Column(String, ForeignKey("speaker_profiles.id"), nullable=True)
    speaker_confidence = Column(Float, nullable=True)
    
    start_time = Column(Float, nullable=False)   # seconds
    end_time = Column(Float, nullable=False)     # seconds
    text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)    # ASR confidence
    
    __table_args__ = (
        Index("ix_ts_meeting_seq", "meeting_id", "sequence"),
    )
    
    meeting = relationship("Meeting", back_populates="transcript_segments")


# ── Decisions ─────────────────────────────────────────────────────────────────

class Decision(Base):
    __tablename__ = "decisions"
    
    id = Column(String, primary_key=True, default=gen_id)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    
    decision_text = Column(Text, nullable=False)
    evidence_text = Column(Text, nullable=False)
    evidence_segment_id = Column(String, ForeignKey("transcript_segments.id"), nullable=True)
    evidence_timestamp = Column(Float, nullable=True)
    participants_involved = Column(JSON, nullable=True)
    
    hallucination_risk = Column(Boolean, default=False)
    requires_review = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=utcnow)
    
    meeting = relationship("Meeting", back_populates="decisions")
    evidence_segment = relationship("TranscriptSegment")
    action_items = relationship("ActionItem", back_populates="decision")
    goal_links = relationship("GoalDecision", back_populates="decision")


# ── Action Items ──────────────────────────────────────────────────────────────

class ActionItem(Base):
    __tablename__ = "action_items"
    
    id = Column(String, primary_key=True, default=gen_id)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False)  # originating meeting
    decision_id = Column(String, ForeignKey("decisions.id"), nullable=True)
    
    action_text = Column(Text, nullable=False)
    owner_name = Column(String(200), nullable=True)   # UNRESOLVED if not explicit
    owner_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    owner_explicit = Column(Boolean, default=False)   # was owner named in transcript?
    
    deadline_text = Column(String(200), nullable=True)   # UNRESOLVED if not explicit
    deadline_date = Column(DateTime, nullable=True)
    deadline_explicit = Column(Boolean, default=False)
    
    status = Column(
        Enum(
            "NEW", "IN_PROGRESS", "COMPLETED", "OVERDUE",
            "UNRESOLVED", "CARRIED_OVER", "CANCELLED",
            name="action_status"
        ),
        default="NEW"
    )
    
    evidence_text = Column(Text, nullable=False)
    evidence_segment_id = Column(String, ForeignKey("transcript_segments.id"), nullable=True)
    evidence_timestamp = Column(Float, nullable=True)
    
    confidence = Column(Float, nullable=True)
    is_commitment = Column(Boolean, default=False)
    hallucination_risk = Column(Boolean, default=False)
    requires_review = Column(Boolean, default=False)
    
    # Cross-meeting tracking
    parent_action_id = Column(String, ForeignKey("action_items.id"), nullable=True)
    times_carried_over = Column(Integer, default=0)
    
    # Goal alignment
    # Linked via GoalAction table
    
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    meeting = relationship("Meeting", back_populates="action_items")
    decision = relationship("Decision", back_populates="action_items")
    owner_user = relationship("User", foreign_keys=[owner_user_id], back_populates="action_items")
    evidence_segment = relationship("TranscriptSegment")
    history = relationship("ActionHistory", back_populates="action", cascade="all, delete-orphan", order_by="ActionHistory.created_at")
    goal_links = relationship("GoalAction", back_populates="action")
    child_actions = relationship("ActionItem", foreign_keys=[parent_action_id])


class ActionHistory(Base):
    """Immutable audit trail for action item changes"""
    __tablename__ = "action_history"
    
    id = Column(String, primary_key=True, default=gen_id)
    action_id = Column(String, ForeignKey("action_items.id"), nullable=False)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=True)
    changed_by = Column(String, ForeignKey("users.id"), nullable=True)
    
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    note = Column(Text, nullable=True)
    change_type = Column(String(50), nullable=False)  # CREATED, STATUS_CHANGED, CARRIED_OVER, etc.
    
    created_at = Column(DateTime, default=utcnow)
    
    action = relationship("ActionItem", back_populates="history")


# ── Unresolved Items ──────────────────────────────────────────────────────────

class UnresolvedItem(Base):
    __tablename__ = "unresolved_items"
    
    id = Column(String, primary_key=True, default=gen_id)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    
    item_type = Column(String(50), nullable=False)  # OWNER, DEADLINE, DECISION, ACTION, CONFLICT
    description = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    evidence_text = Column(Text, nullable=True)
    evidence_segment_id = Column(String, ForeignKey("transcript_segments.id"), nullable=True)
    
    resolved = Column(Boolean, default=False)
    resolved_by = Column(String, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_note = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utcnow)
    
    meeting = relationship("Meeting", back_populates="unresolved_items")


# ── Company Goals ─────────────────────────────────────────────────────────────

class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(String, primary_key=True, default=gen_id)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(DateTime, nullable=True)
    
    status = Column(
        Enum("ACTIVE", "AT_RISK", "COMPLETED", "ARCHIVED", name="goal_status"),
        default="ACTIVE"
    )
    progress_pct = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    organization = relationship("Organization", back_populates="goals")
    action_links = relationship("GoalAction", back_populates="goal", cascade="all, delete-orphan")
    decision_links = relationship("GoalDecision", back_populates="goal", cascade="all, delete-orphan")
    meeting_links = relationship("GoalMeeting", back_populates="goal", cascade="all, delete-orphan")


class GoalAction(Base):
    __tablename__ = "goal_actions"
    
    id = Column(String, primary_key=True, default=gen_id)
    goal_id = Column(String, ForeignKey("goals.id"), nullable=False)
    action_id = Column(String, ForeignKey("action_items.id"), nullable=False)
    is_ai_suggested = Column(Boolean, default=False)
    confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    
    goal = relationship("Goal", back_populates="action_links")
    action = relationship("ActionItem", back_populates="goal_links")


class GoalDecision(Base):
    __tablename__ = "goal_decisions"
    
    id = Column(String, primary_key=True, default=gen_id)
    goal_id = Column(String, ForeignKey("goals.id"), nullable=False)
    decision_id = Column(String, ForeignKey("decisions.id"), nullable=False)
    is_ai_suggested = Column(Boolean, default=False)
    confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    
    goal = relationship("Goal", back_populates="decision_links")
    decision = relationship("Decision", back_populates="goal_links")


class GoalMeeting(Base):
    __tablename__ = "goal_meetings"
    
    id = Column(String, primary_key=True, default=gen_id)
    goal_id = Column(String, ForeignKey("goals.id"), nullable=False)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    
    goal = relationship("Goal", back_populates="meeting_links")
    meeting = relationship("Meeting", back_populates="goal_links")


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=gen_id)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    event_type = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    event_metadata = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=utcnow, index=True)
