"""
MeetGuard AI — Demo Data Seeder
Provides 5 realistic synthetic enterprise meetings covering all demonstration scenarios.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from sqlalchemy.orm import Session

from app.database.models import (
    Organization, User, SpeakerProfile, Meeting, MeetingParticipant,
    TranscriptSegment, Decision, ActionItem, ActionHistory, UnresolvedItem,
    Goal, GoalAction, GoalMeeting, AuditLog
)
from app.security.auth import hash_password

# ─────────────────────────────────────────────────────────────────────────────
# IDs — fixed for reproducibility
# ─────────────────────────────────────────────────────────────────────────────
ORG_ID = "org-techcorp-001"

USER_ADMIN = "user-admin-001"
USER_ARUN = "user-arun-001"
USER_PRIYA = "user-priya-001"
USER_RAHUL = "user-rahul-001"
USER_ANANYA = "user-ananya-001"
USER_VIKRAM = "user-vikram-001"

SP_ARUN = "sp-arun-001"
SP_PRIYA = "sp-priya-001"
SP_RAHUL = "sp-rahul-001"
SP_ANANYA = "sp-ananya-001"
SP_VIKRAM = "sp-vikram-001"

MTG_1 = "mtg-product-strategy-001"
MTG_2 = "mtg-ambiguous-001"
MTG_3 = "mtg-missing-deadline-001"
MTG_4 = "mtg-followup-001"
MTG_5 = "mtg-completed-001"

GOAL_LAUNCH = "goal-launch-product-x"
GOAL_INFRA = "goal-infra-modernization"

def _now():
    return datetime.now(timezone.utc)

def _days_ago(n: int) -> datetime:
    return _now() - timedelta(days=n)

def _days_from_now(n: int) -> datetime:
    return _now() + timedelta(days=n)


def seed_all(db: Session):
    """Idempotently seed all demo data."""
    if db.query(Organization).filter_by(id=ORG_ID).first():
        return  # Already seeded

    _seed_org(db)
    _seed_users(db)
    _seed_speakers(db)
    _seed_goals(db)
    _seed_meeting_1(db)
    _seed_meeting_2(db)
    _seed_meeting_3(db)
    _seed_meeting_4(db)
    _seed_meeting_5(db)
    db.commit()
    print("[SEED] Demo data seeded successfully.")


def _seed_org(db: Session):
    org = Organization(
        id=ORG_ID,
        name="TechCorp Innovation Ltd.",
        domain="techcorp.example",
        mission="Build cutting-edge technology products that empower enterprise teams globally.",
        storage_policy="LOCAL_ONLY",
        retention_days=90,
        created_at=_days_ago(90),
    )
    db.add(org)


def _seed_users(db: Session):
    users = [
        User(
            id=USER_ADMIN,
            org_id=ORG_ID,
            email="admin@techcorp.example",
            name="Admin User",
            hashed_password=hash_password("admin123"),
            role="ADMIN",
            department="Management",
            is_active=True,
        ),
        User(
            id=USER_ARUN,
            org_id=ORG_ID,
            email="arun@techcorp.example",
            name="Arun Kumar",
            hashed_password=hash_password("arun123"),
            role="MANAGER",
            department="Engineering",
            is_active=True,
        ),
        User(
            id=USER_PRIYA,
            org_id=ORG_ID,
            email="priya@techcorp.example",
            name="Priya Sharma",
            hashed_password=hash_password("priya123"),
            role="MANAGER",
            department="Marketing",
            is_active=True,
        ),
        User(
            id=USER_RAHUL,
            org_id=ORG_ID,
            email="rahul@techcorp.example",
            name="Rahul Verma",
            hashed_password=hash_password("rahul123"),
            role="MEMBER",
            department="Engineering",
            is_active=True,
        ),
        User(
            id=USER_ANANYA,
            org_id=ORG_ID,
            email="ananya@techcorp.example",
            name="Ananya Singh",
            hashed_password=hash_password("ananya123"),
            role="MEMBER",
            department="Finance",
            is_active=True,
        ),
        User(
            id=USER_VIKRAM,
            org_id=ORG_ID,
            email="vikram@techcorp.example",
            name="Vikram Nair",
            hashed_password=hash_password("vikram123"),
            role="MEMBER",
            department="Operations",
            is_active=True,
        ),
    ]
    for u in users:
        db.add(u)


def _seed_speakers(db: Session):
    speakers = [
        SpeakerProfile(id=SP_ARUN, user_id=USER_ARUN, org_id=ORG_ID, display_name="Arun Kumar",
                       employee_id="EMP-001", department="Engineering", role_title="Engineering Manager",
                       voice_enrolled=True, enrollment_status="ENROLLED"),
        SpeakerProfile(id=SP_PRIYA, user_id=USER_PRIYA, org_id=ORG_ID, display_name="Priya Sharma",
                       employee_id="EMP-002", department="Marketing", role_title="Marketing Lead",
                       voice_enrolled=True, enrollment_status="ENROLLED"),
        SpeakerProfile(id=SP_RAHUL, user_id=USER_RAHUL, org_id=ORG_ID, display_name="Rahul Verma",
                       employee_id="EMP-003", department="Engineering", role_title="Backend Engineer",
                       voice_enrolled=True, enrollment_status="ENROLLED"),
        SpeakerProfile(id=SP_ANANYA, user_id=USER_ANANYA, org_id=ORG_ID, display_name="Ananya Singh",
                       employee_id="EMP-004", department="Finance", role_title="Finance Analyst",
                       voice_enrolled=False, enrollment_status="NOT_ENROLLED"),
        SpeakerProfile(id=SP_VIKRAM, user_id=USER_VIKRAM, org_id=ORG_ID, display_name="Vikram Nair",
                       employee_id="EMP-005", department="Operations", role_title="Operations Lead",
                       voice_enrolled=True, enrollment_status="ENROLLED"),
    ]
    for s in speakers:
        db.add(s)


def _seed_goals(db: Session):
    g1 = Goal(
        id=GOAL_LAUNCH,
        org_id=ORG_ID,
        created_by=USER_ADMIN,
        title="Launch Product X by October",
        description="Complete development, testing, and marketing for the full Product X launch by October 31.",
        target_date=_days_from_now(37),
        status="ACTIVE",
        progress_pct=68.0,
        created_at=_days_ago(45),
    )
    g2 = Goal(
        id=GOAL_INFRA,
        org_id=ORG_ID,
        created_by=USER_ADMIN,
        title="Modernize Infrastructure — Q4",
        description="Migrate legacy systems to cloud-native architecture before end of Q4.",
        target_date=_days_from_now(97),
        status="ACTIVE",
        progress_pct=35.0,
        created_at=_days_ago(30),
    )
    db.add(g1)
    db.add(g2)


# ─────────────────────────────────────────────────────────────────────────────
# MEETING 1: Clear Assignments — Product Strategy Meeting
# ─────────────────────────────────────────────────────────────────────────────

def _seed_meeting_1(db: Session):
    mtg = Meeting(
        id=MTG_1,
        org_id=ORG_ID,
        created_by=USER_ARUN,
        title="Product Strategy Meeting — Q4 Launch",
        description="Quarterly planning session for Product X launch. Reviewed timelines, assigned responsibilities, and addressed blockers.",
        meeting_date=_days_ago(14),
        duration_seconds=2700,
        classification="HIGHLY_CONFIDENTIAL",
        storage_policy="LOCAL_ONLY",
        storage_mode="LOCAL_ONLY",
        meeting_source="OFFLINE_RECORDING",
        ai_processing_mode="LOCAL_LLM",
        status="COMPLETED",
        processing_mode="DEMO_FALLBACK",
        summary=(
            "The team reviewed the Q4 launch plan for Product X. Arun confirmed the website redesign must be "
            "completed by September 26. Priya committed to delivering marketing collateral by September 24. "
            "Rahul was assigned final QA testing by September 25. The team agreed to a soft-launch on October 1 "
            "followed by a full public launch by October 15. Budget allocation of ₹8L was approved. "
            "Vikram flagged a risk around supplier delivery timelines."
        ),
        key_points=[
            "Website redesign deadline: September 26 (Arun)",
            "Marketing collateral deadline: September 24 (Priya)",
            "QA testing deadline: September 25 (Rahul)",
            "Soft-launch: October 1",
            "Full launch: October 15",
            "Budget ₹8L approved",
            "Supplier delivery risk flagged by Vikram",
        ],
        risks=["Supplier delay may impact hardware delivery timeline"],
        follow_up_topics=["Supplier contract finalization", "QA test case review"],
        sentiment_overall="POSITIVE",
        sentiment_details={
            "segments": [
                {"topic": "Budget approval", "sentiment": "POSITIVE", "timestamp": 1821.0},
                {"topic": "Supplier risk", "sentiment": "TENSION", "timestamp": 2205.0},
            ]
        },
        processing_completed_at=_days_ago(14),
        created_at=_days_ago(14),
    )
    db.add(mtg)

    participants = [
        MeetingParticipant(id=str(uuid.uuid4()), meeting_id=MTG_1, user_id=USER_ARUN, speaker_profile_id=SP_ARUN,
                           name="Arun Kumar", speaker_label="SPEAKER_00", identified=True),
        MeetingParticipant(id=str(uuid.uuid4()), meeting_id=MTG_1, user_id=USER_PRIYA, speaker_profile_id=SP_PRIYA,
                           name="Priya Sharma", speaker_label="SPEAKER_01", identified=True),
        MeetingParticipant(id=str(uuid.uuid4()), meeting_id=MTG_1, user_id=USER_RAHUL, speaker_profile_id=SP_RAHUL,
                           name="Rahul Verma", speaker_label="SPEAKER_02", identified=True),
        MeetingParticipant(id=str(uuid.uuid4()), meeting_id=MTG_1, user_id=USER_VIKRAM, speaker_profile_id=SP_VIKRAM,
                           name="Vikram Nair", speaker_label="SPEAKER_03", identified=True),
    ]
    for p in participants:
        db.add(p)

    segments = [
        ("seg-m1-01", 0, "SPEAKER_00", "Arun Kumar", SP_ARUN, 0.0, 12.5,
         "Alright everyone, let's get started. Today we need to finalize the Q4 launch plan for Product X.", 0.96),
        ("seg-m1-02", 1, "SPEAKER_00", "Arun Kumar", SP_ARUN, 13.0, 32.0,
         "Rahul, the website redesign is the critical path item. You need to complete it by September 26th. Is that confirmed?", 0.97),
        ("seg-m1-03", 2, "SPEAKER_02", "Rahul Verma", SP_RAHUL, 33.0, 45.0,
         "Yes, confirmed. The redesign will be done by September 25th, giving us a day of buffer.", 0.95),
        ("seg-m1-04", 3, "SPEAKER_00", "Arun Kumar", SP_ARUN, 46.0, 65.0,
         "Good. Priya, we need the marketing collateral ready before Rahul finishes. Can you commit to September 24th?", 0.96),
        ("seg-m1-05", 4, "SPEAKER_01", "Priya Sharma", SP_PRIYA, 66.0, 85.0,
         "Absolutely. I'll have all marketing materials — brochures, social media posts, and the press release — ready by September 24th.", 0.97),
        ("seg-m1-06", 5, "SPEAKER_00", "Arun Kumar", SP_ARUN, 86.0, 110.0,
         "Perfect. Rahul, after the website is live, you also own the final QA testing. I need that completed by September 25th.", 0.96),
        ("seg-m1-07", 6, "SPEAKER_02", "Rahul Verma", SP_RAHUL, 111.0, 125.0,
         "Understood. I'll run all test suites and document the results by September 25th.", 0.95),
        ("seg-m1-08", 7, "SPEAKER_00", "Arun Kumar", SP_ARUN, 126.0, 155.0,
         "The soft-launch is confirmed for October 1st, followed by the full public launch on October 15th. This is the official decision.", 0.98),
        ("seg-m1-09", 8, "SPEAKER_01", "Priya Sharma", SP_PRIYA, 156.0, 178.0,
         "Agreed. The marketing campaign will go live on October 1st to coincide with the soft-launch.", 0.96),
        ("seg-m1-10", 9, "SPEAKER_03", "Vikram Nair", SP_VIKRAM, 179.0, 210.0,
         "I need to flag a risk. Our primary supplier has not confirmed the hardware delivery schedule. If they're late, it could impact our October timeline.", 0.94),
        ("seg-m1-11", 10, "SPEAKER_00", "Arun Kumar", SP_ARUN, 211.0, 245.0,
         "That's a serious concern. Vikram, please follow up with the supplier and get a written confirmation by September 22nd.", 0.96),
        ("seg-m1-12", 11, "SPEAKER_03", "Vikram Nair", SP_VIKRAM, 246.0, 262.0,
         "Will do. I'll send a formal request today and get back to you by the 22nd.", 0.95),
        ("seg-m1-13", 12, "SPEAKER_00", "Arun Kumar", SP_ARUN, 1820.0, 1850.0,
         "One more item — the finance team has approved the ₹8 lakh budget for the launch campaign.", 0.97),
        ("seg-m1-14", 13, "SPEAKER_01", "Priya Sharma", SP_PRIYA, 1851.0, 1870.0,
         "That's great. I'll ensure we allocate it across digital, print, and event marketing channels.", 0.96),
    ]

    seg_objs = {}
    for s in segments:
        seg = TranscriptSegment(
            id=s[0], meeting_id=MTG_1, sequence=s[1], speaker_label=s[2],
            speaker_name=s[3], speaker_profile_id=s[4], speaker_confidence=0.92,
            start_time=s[5], end_time=s[6], text=s[7], confidence=s[8],
        )
        db.add(seg)
        seg_objs[s[0]] = seg

    # Decisions
    dec1 = Decision(
        id="dec-m1-launch-date",
        meeting_id=MTG_1, org_id=ORG_ID,
        decision_text="Product X soft-launch confirmed for October 1st; full public launch on October 15th.",
        evidence_text="The soft-launch is confirmed for October 1st, followed by the full public launch on October 15th. This is the official decision.",
        evidence_segment_id="seg-m1-08",
        evidence_timestamp=126.0,
        participants_involved=["Arun Kumar", "Priya Sharma", "Rahul Verma", "Vikram Nair"],
    )
    dec2 = Decision(
        id="dec-m1-budget",
        meeting_id=MTG_1, org_id=ORG_ID,
        decision_text="Launch campaign budget of ₹8 lakh approved by finance.",
        evidence_text="the finance team has approved the ₹8 lakh budget for the launch campaign.",
        evidence_segment_id="seg-m1-13",
        evidence_timestamp=1820.0,
        participants_involved=["Arun Kumar"],
    )
    db.add(dec1)
    db.add(dec2)

    # Action Items
    ai1 = ActionItem(
        id="act-m1-website",
        org_id=ORG_ID, meeting_id=MTG_1, decision_id="dec-m1-launch-date",
        action_text="Complete the website redesign for Product X launch.",
        owner_name="Rahul Verma", owner_user_id=USER_RAHUL, owner_explicit=True,
        deadline_text="September 25", deadline_date=_days_ago(14) + timedelta(days=11),
        deadline_explicit=True,
        status="COMPLETED",
        evidence_text="The website redesign is the critical path item. You need to complete it by September 26th... confirmed. The redesign will be done by September 25th.",
        evidence_segment_id="seg-m1-02",
        evidence_timestamp=13.0,
        confidence=0.97, is_commitment=True,
        completed_at=_days_ago(3),
        created_at=_days_ago(14),
    )
    ai2 = ActionItem(
        id="act-m1-marketing",
        org_id=ORG_ID, meeting_id=MTG_1,
        action_text="Prepare all marketing collateral including brochures, social media posts, and press release.",
        owner_name="Priya Sharma", owner_user_id=USER_PRIYA, owner_explicit=True,
        deadline_text="September 24", deadline_date=_days_ago(14) + timedelta(days=10),
        deadline_explicit=True,
        status="COMPLETED",
        evidence_text="Priya, we need the marketing collateral ready... I'll have all marketing materials — brochures, social media posts, and the press release — ready by September 24th.",
        evidence_segment_id="seg-m1-04",
        evidence_timestamp=46.0,
        confidence=0.97, is_commitment=True,
        completed_at=_days_ago(4),
        created_at=_days_ago(14),
    )
    ai3 = ActionItem(
        id="act-m1-qa",
        org_id=ORG_ID, meeting_id=MTG_1,
        action_text="Conduct final QA testing and document all test results.",
        owner_name="Rahul Verma", owner_user_id=USER_RAHUL, owner_explicit=True,
        deadline_text="September 25", deadline_date=_days_ago(14) + timedelta(days=11),
        deadline_explicit=True,
        status="COMPLETED",
        evidence_text="Rahul, after the website is live, you also own the final QA testing. I need that completed by September 25th.",
        evidence_segment_id="seg-m1-06",
        evidence_timestamp=86.0,
        confidence=0.96, is_commitment=True,
        completed_at=_days_ago(3),
        created_at=_days_ago(14),
    )
    ai4 = ActionItem(
        id="act-m1-supplier",
        org_id=ORG_ID, meeting_id=MTG_1,
        action_text="Follow up with supplier and obtain written hardware delivery confirmation.",
        owner_name="Vikram Nair", owner_user_id=USER_VIKRAM, owner_explicit=True,
        deadline_text="September 22", deadline_date=_days_ago(14) + timedelta(days=8),
        deadline_explicit=True,
        status="OVERDUE",
        evidence_text="Vikram, please follow up with the supplier and get a written confirmation by September 22nd.",
        evidence_segment_id="seg-m1-11",
        evidence_timestamp=211.0,
        confidence=0.96, is_commitment=True,
        created_at=_days_ago(14),
    )

    for ai in [ai1, ai2, ai3, ai4]:
        db.add(ai)

    # Action histories
    histories = [
        ActionHistory(id=str(uuid.uuid4()), action_id="act-m1-website", meeting_id=MTG_1,
                      old_status=None, new_status="NEW", change_type="CREATED",
                      note="Created from Product Strategy Meeting", created_at=_days_ago(14)),
        ActionHistory(id=str(uuid.uuid4()), action_id="act-m1-website", meeting_id=MTG_4,
                      old_status="NEW", new_status="IN_PROGRESS", change_type="STATUS_CHANGED",
                      note="70% complete per follow-up meeting", created_at=_days_ago(7)),
        ActionHistory(id=str(uuid.uuid4()), action_id="act-m1-website", meeting_id=MTG_5,
                      old_status="IN_PROGRESS", new_status="COMPLETED", change_type="STATUS_CHANGED",
                      note="Website redesign fully deployed per completion meeting", created_at=_days_ago(3)),
        ActionHistory(id=str(uuid.uuid4()), action_id="act-m1-supplier", meeting_id=MTG_1,
                      old_status=None, new_status="NEW", change_type="CREATED",
                      note="Created from Product Strategy Meeting", created_at=_days_ago(14)),
        ActionHistory(id=str(uuid.uuid4()), action_id="act-m1-supplier", meeting_id=None,
                      old_status="NEW", new_status="OVERDUE", change_type="STATUS_CHANGED",
                      note="Deadline passed without completion", created_at=_days_ago(2)),
    ]
    for h in histories:
        db.add(h)

    # Goal links
    db.add(GoalAction(id=str(uuid.uuid4()), goal_id=GOAL_LAUNCH, action_id="act-m1-website",
                      is_ai_suggested=False, confirmed=True))
    db.add(GoalAction(id=str(uuid.uuid4()), goal_id=GOAL_LAUNCH, action_id="act-m1-marketing",
                      is_ai_suggested=False, confirmed=True))
    db.add(GoalAction(id=str(uuid.uuid4()), goal_id=GOAL_LAUNCH, action_id="act-m1-qa",
                      is_ai_suggested=False, confirmed=True))
    db.add(GoalAction(id=str(uuid.uuid4()), goal_id=GOAL_LAUNCH, action_id="act-m1-supplier",
                      is_ai_suggested=True, confirmed=False))
    db.add(GoalMeeting(id=str(uuid.uuid4()), goal_id=GOAL_LAUNCH, meeting_id=MTG_1))


# ─────────────────────────────────────────────────────────────────────────────
# MEETING 2: Ambiguous Ownership — Finance Review
# ─────────────────────────────────────────────────────────────────────────────

def _seed_meeting_2(db: Session):
    mtg = Meeting(
        id=MTG_2,
        org_id=ORG_ID,
        created_by=USER_ARUN,
        title="Q4 Finance & Resource Planning",
        description="Finance review session covering budget verification, resource allocation, and risk assessment.",
        meeting_date=_days_ago(10),
        duration_seconds=1800,
        classification="HIGHLY_CONFIDENTIAL",
        storage_policy="LOCAL_ONLY",
        storage_mode="LOCAL_ONLY",
        meeting_source="OFFLINE_RECORDING",
        ai_processing_mode="LOCAL_LLM",
        status="COMPLETED",
        processing_mode="DEMO_FALLBACK",
        summary=(
            "Finance review for Q4 launch. Several items require ownership resolution. "
            "Budget verification was discussed but no specific person was assigned. "
            "A suggestion was made that Rahul could handle the database migration, "
            "but this was not formally confirmed. Ananya proposed a risk reserve fund "
            "but no decision was finalized. The meeting had several unresolved items "
            "requiring follow-up."
        ),
        key_points=[
            "Budget verification discussed — ownership unresolved",
            "Database migration suggested for Rahul — NOT formally assigned",
            "Risk reserve fund proposed — no decision made",
            "Q4 headcount request submitted",
        ],
        sentiment_overall="MIXED",
        sentiment_details={
            "segments": [
                {"topic": "Budget responsibility", "sentiment": "TENSION", "timestamp": 420.0},
                {"topic": "Database migration", "sentiment": "NEUTRAL", "timestamp": 680.0},
            ]
        },
        processing_completed_at=_days_ago(10),
        created_at=_days_ago(10),
    )
    db.add(mtg)

    segs = [
        ("seg-m2-01", 0, "SPEAKER_00", "Arun Kumar", SP_ARUN, 0.0, 20.0,
         "Let's review Q4 finances. We need someone to verify the budget allocations before the launch.", 0.95),
        ("seg-m2-02", 1, "SPEAKER_03", "Vikram Nair", SP_VIKRAM, 21.0, 40.0,
         "Someone from finance should check the numbers. It's an important step.", 0.94),
        ("seg-m2-03", 2, "SPEAKER_04", "Ananya Singh", SP_ANANYA, 41.0, 68.0,
         "I can look at it, but I'm also managing the Q3 close. It might need to be assigned formally.", 0.93),
        ("seg-m2-04", 3, "SPEAKER_00", "Arun Kumar", SP_ARUN, 69.0, 90.0,
         "We'll need to decide who owns this. Let's come back to it.", 0.95),
        ("seg-m2-05", 4, "SPEAKER_02", "Rahul Verma", SP_RAHUL, 410.0, 440.0,
         "On the database side, maybe Rahul — I mean, I can take a look at the migration options.", 0.88),
        ("seg-m2-06", 5, "SPEAKER_00", "Arun Kumar", SP_ARUN, 441.0, 475.0,
         "Maybe Rahul can handle the database migration. That could work.", 0.90),
        ("seg-m2-07", 6, "SPEAKER_04", "Ananya Singh", SP_ANANYA, 680.0, 720.0,
         "I'd like to propose we create a risk reserve fund for unexpected launch expenses.", 0.94),
        ("seg-m2-08", 7, "SPEAKER_00", "Arun Kumar", SP_ARUN, 721.0, 755.0,
         "That's an interesting idea. Let's think about it and decide in the next meeting.", 0.94),
        ("seg-m2-09", 8, "SPEAKER_03", "Vikram Nair", SP_VIKRAM, 756.0, 800.0,
         "Agreed. We should also request additional headcount for Q4 operations.", 0.93),
    ]

    for s in segs:
        seg = TranscriptSegment(
            id=s[0], meeting_id=MTG_2, sequence=s[1], speaker_label=s[2],
            speaker_name=s[3], speaker_profile_id=s[4], speaker_confidence=0.89,
            start_time=s[5], end_time=s[6], text=s[7], confidence=s[8],
        )
        db.add(seg)

    # Unresolved items — showcasing the system's ambiguity detection
    unresolved = [
        UnresolvedItem(
            id=str(uuid.uuid4()), meeting_id=MTG_2, org_id=ORG_ID,
            item_type="OWNER",
            description="Budget verification ownership unresolved",
            reason="The meeting discussed the need to verify budget allocations, but no specific person was explicitly assigned. Vikram said 'someone from finance' should check, and Ananya indicated availability but the task was not formally assigned.",
            evidence_text="Someone from finance should check the numbers... We'll need to decide who owns this. Let's come back to it.",
            evidence_segment_id="seg-m2-02",
        ),
        UnresolvedItem(
            id=str(uuid.uuid4()), meeting_id=MTG_2, org_id=ORG_ID,
            item_type="DECISION",
            description="Risk reserve fund — no decision reached",
            reason="Ananya proposed creating a risk reserve fund but the discussion was deferred to the next meeting. No decision was made.",
            evidence_text="I'd like to propose we create a risk reserve fund... Let's think about it and decide in the next meeting.",
            evidence_segment_id="seg-m2-07",
        ),
    ]
    for u in unresolved:
        db.add(u)

    # Action item with unresolved owner
    ai_budget = ActionItem(
        id="act-m2-budget",
        org_id=ORG_ID, meeting_id=MTG_2,
        action_text="Verify Q4 budget allocations before Product X launch.",
        owner_name="UNRESOLVED", owner_user_id=None, owner_explicit=False,
        deadline_text="UNRESOLVED", deadline_date=None, deadline_explicit=False,
        status="UNRESOLVED",
        evidence_text="Someone from finance should check the numbers. It's an important step. We'll need to decide who owns this.",
        evidence_segment_id="seg-m2-02",
        evidence_timestamp=21.0,
        confidence=0.78, is_commitment=False,
        requires_review=True,
        created_at=_days_ago(10),
    )
    db.add(ai_budget)

    # Database migration — suggestion NOT converted to commitment
    # (Not added as action item because it was only a suggestion "maybe Rahul can")


# ─────────────────────────────────────────────────────────────────────────────
# MEETING 3: Missing Deadline — Marketing Sprint
# ─────────────────────────────────────────────────────────────────────────────

def _seed_meeting_3(db: Session):
    mtg = Meeting(
        id=MTG_3,
        org_id=ORG_ID,
        created_by=USER_PRIYA,
        title="Marketing Sprint Planning",
        description="Sprint planning for Product X marketing campaign. Campaign strategy confirmed, timelines not fully specified.",
        meeting_date=_days_ago(7),
        duration_seconds=2100,
        classification="GENERAL",
        storage_policy="CLOUD",
        storage_mode="CLOUD",
        meeting_source="GOOGLE_MEET",
        ai_processing_mode="LOCAL_LLM",
        cloud_sync_scope="SUMMARY_AND_ACTIONS",
        cloud_synced=True,
        cloud_provider="GOOGLE_MEET",
        meeting_url="https://meet.google.com/q4-marketing-sprint",
        status="COMPLETED",
        processing_mode="DEMO_FALLBACK",
        summary=(
            "Marketing sprint planning for Product X. Priya confirmed she will prepare the investor presentation. "
            "However, no specific deadline was set. Social media campaign strategy was approved. "
            "Rahul committed to creating technical documentation for the product with no deadline set."
        ),
        key_points=[
            "Investor presentation assigned to Priya — no deadline specified",
            "Social media campaign strategy approved",
            "Technical documentation assigned to Rahul — no deadline specified",
            "Campaign budget allocated: ₹3.5L for digital, ₹2L for events",
        ],
        sentiment_overall="POSITIVE",
        processing_completed_at=_days_ago(7),
        created_at=_days_ago(7),
    )
    db.add(mtg)

    segs = [
        ("seg-m3-01", 0, "SPEAKER_01", "Priya Sharma", SP_PRIYA, 0.0, 22.0,
         "I'll prepare the investor presentation for Product X. It'll cover our market positioning and growth projections.", 0.96),
        ("seg-m3-02", 1, "SPEAKER_00", "Arun Kumar", SP_ARUN, 23.0, 42.0,
         "Great. When can we expect it?", 0.96),
        ("seg-m3-03", 2, "SPEAKER_01", "Priya Sharma", SP_PRIYA, 43.0, 62.0,
         "I'll work on it this week. I'll send it over when it's ready.", 0.95),
        ("seg-m3-04", 3, "SPEAKER_00", "Arun Kumar", SP_ARUN, 63.0, 88.0,
         "Alright. Rahul, we also need technical documentation for the developers who integrate with our APIs.", 0.95),
        ("seg-m3-05", 4, "SPEAKER_02", "Rahul Verma", SP_RAHUL, 89.0, 115.0,
         "I'll handle the technical documentation. I'll get it done as soon as the development work is finalized.", 0.94),
        ("seg-m3-06", 5, "SPEAKER_01", "Priya Sharma", SP_PRIYA, 450.0, 490.0,
         "The social media campaign plan has been approved by leadership. We'll run it across LinkedIn, Twitter, and Instagram.", 0.96),
        ("seg-m3-07", 6, "SPEAKER_00", "Arun Kumar", SP_ARUN, 491.0, 520.0,
         "Good. Campaign budget: ₹3.5L for digital, ₹2L for events. This is confirmed.", 0.97),
    ]

    for s in segs:
        seg = TranscriptSegment(
            id=s[0], meeting_id=MTG_3, sequence=s[1], speaker_label=s[2],
            speaker_name=s[3], speaker_profile_id=s[4], speaker_confidence=0.91,
            start_time=s[5], end_time=s[6], text=s[7], confidence=s[8],
        )
        db.add(seg)

    dec_social = Decision(
        id="dec-m3-social",
        meeting_id=MTG_3, org_id=ORG_ID,
        decision_text="Social media campaign approved to run across LinkedIn, Twitter, and Instagram.",
        evidence_text="The social media campaign plan has been approved by leadership. We'll run it across LinkedIn, Twitter, and Instagram.",
        evidence_segment_id="seg-m3-06",
        evidence_timestamp=450.0,
        participants_involved=["Priya Sharma", "Arun Kumar"],
    )
    db.add(dec_social)

    ai_presentation = ActionItem(
        id="act-m3-presentation",
        org_id=ORG_ID, meeting_id=MTG_3,
        action_text="Prepare investor presentation covering market positioning and growth projections for Product X.",
        owner_name="Priya Sharma", owner_user_id=USER_PRIYA, owner_explicit=True,
        deadline_text="UNRESOLVED", deadline_date=None, deadline_explicit=False,
        status="IN_PROGRESS",
        evidence_text="I'll prepare the investor presentation for Product X. It'll cover our market positioning and growth projections.",
        evidence_segment_id="seg-m3-01",
        evidence_timestamp=0.0,
        confidence=0.95, is_commitment=True,
        created_at=_days_ago(7),
    )
    ai_techdoc = ActionItem(
        id="act-m3-techdoc",
        org_id=ORG_ID, meeting_id=MTG_3,
        action_text="Create technical API documentation for developer integrations.",
        owner_name="Rahul Verma", owner_user_id=USER_RAHUL, owner_explicit=True,
        deadline_text="UNRESOLVED", deadline_date=None, deadline_explicit=False,
        status="NEW",
        evidence_text="I'll handle the technical documentation. I'll get it done as soon as the development work is finalized.",
        evidence_segment_id="seg-m3-05",
        evidence_timestamp=89.0,
        confidence=0.93, is_commitment=True,
        created_at=_days_ago(7),
    )
    for ai in [ai_presentation, ai_techdoc]:
        db.add(ai)

    # Unresolved — no deadlines
    db.add(UnresolvedItem(
        id=str(uuid.uuid4()), meeting_id=MTG_3, org_id=ORG_ID,
        item_type="DEADLINE",
        description="Investor presentation — no deadline specified",
        reason="Priya committed to preparing the investor presentation but when asked about the timeline, she said 'I'll send it over when it's ready' — no specific date was given.",
        evidence_text="When can we expect it? ... I'll work on it this week. I'll send it over when it's ready.",
        evidence_segment_id="seg-m3-02",
    ))
    db.add(UnresolvedItem(
        id=str(uuid.uuid4()), meeting_id=MTG_3, org_id=ORG_ID,
        item_type="DEADLINE",
        description="Technical documentation — no deadline specified",
        reason="Rahul committed to technical documentation but linked it to development completion with no specific date.",
        evidence_text="I'll get it done as soon as the development work is finalized.",
        evidence_segment_id="seg-m3-05",
    ))

    db.add(GoalAction(id=str(uuid.uuid4()), goal_id=GOAL_LAUNCH, action_id="act-m3-presentation",
                      is_ai_suggested=True, confirmed=False))
    db.add(GoalMeeting(id=str(uuid.uuid4()), goal_id=GOAL_LAUNCH, meeting_id=MTG_3))


# ─────────────────────────────────────────────────────────────────────────────
# MEETING 4: Cross-Meeting Follow-up
# ─────────────────────────────────────────────────────────────────────────────

def _seed_meeting_4(db: Session):
    mtg = Meeting(
        id=MTG_4,
        org_id=ORG_ID,
        created_by=USER_ARUN,
        title="Product X — Weekly Sync (Follow-up)",
        description="Weekly progress sync. References and updates actions from the Product Strategy Meeting.",
        meeting_date=_days_ago(7),
        duration_seconds=1500,
        classification="INTERNAL",
        storage_policy="LOCAL_AND_CLOUD",
        storage_mode="LOCAL_AND_CLOUD",
        meeting_source="MICROSOFT_TEAMS",
        ai_processing_mode="LOCAL_LLM",
        cloud_provider="MICROSOFT_TEAMS",
        meeting_url="https://teams.microsoft.com/l/meetup-join/product-sync",
        status="COMPLETED",
        processing_mode="DEMO_FALLBACK",
        summary=(
            "Weekly sync to track progress on Product X launch items. "
            "Rahul reported the website redesign is 70% complete and on track. "
            "Priya confirmed marketing collateral is complete. "
            "Vikram's supplier follow-up remains pending — item is now at risk of becoming overdue. "
            "Team agrees to escalate supplier issue if not resolved by end of week."
        ),
        key_points=[
            "Website redesign: 70% complete (Rahul) — references act-m1-website",
            "Marketing collateral: COMPLETED (Priya)",
            "Supplier confirmation still pending (Vikram) — OVERDUE RISK",
            "Escalation plan agreed if supplier unresponsive",
        ],
        sentiment_overall="NEUTRAL",
        sentiment_details={
            "segments": [
                {"topic": "Supplier delay risk", "sentiment": "TENSION", "timestamp": 680.0}
            ]
        },
        processing_completed_at=_days_ago(7),
        created_at=_days_ago(7),
    )
    db.add(mtg)

    segs = [
        ("seg-m4-01", 0, "SPEAKER_00", "Arun Kumar", SP_ARUN, 0.0, 25.0,
         "Let's start with the website redesign status. Rahul, where are we?", 0.96),
        ("seg-m4-02", 1, "SPEAKER_02", "Rahul Verma", SP_RAHUL, 26.0, 65.0,
         "The website is 70% complete. All major sections are done. I'm working on the final animations and mobile responsiveness. Should be done before the deadline.", 0.95),
        ("seg-m4-03", 2, "SPEAKER_00", "Arun Kumar", SP_ARUN, 66.0, 85.0,
         "Good. Priya, the marketing materials?", 0.96),
        ("seg-m4-04", 3, "SPEAKER_01", "Priya Sharma", SP_PRIYA, 86.0, 115.0,
         "All marketing collateral is complete. Brochures printed, social media posts scheduled, press release drafted and ready.", 0.97),
        ("seg-m4-05", 4, "SPEAKER_00", "Arun Kumar", SP_ARUN, 116.0, 145.0,
         "Excellent. Vikram, any update on the supplier confirmation?", 0.96),
        ("seg-m4-06", 5, "SPEAKER_03", "Vikram Nair", SP_VIKRAM, 146.0, 195.0,
         "Still waiting. I sent the formal request but haven't received a written confirmation yet. They've verbally indicated they're on track, but I need the written commitment.", 0.93),
        ("seg-m4-07", 6, "SPEAKER_00", "Arun Kumar", SP_ARUN, 196.0, 240.0,
         "That's concerning. Vikram, if you don't have written confirmation by end of this week, we need to escalate to their senior management and start exploring backup suppliers.", 0.95),
        ("seg-m4-08", 7, "SPEAKER_03", "Vikram Nair", SP_VIKRAM, 241.0, 270.0,
         "Understood. I'll push harder and escalate internally if needed.", 0.94),
    ]

    for s in segs:
        seg = TranscriptSegment(
            id=s[0], meeting_id=MTG_4, sequence=s[1], speaker_label=s[2],
            speaker_name=s[3], speaker_profile_id=s[4], speaker_confidence=0.90,
            start_time=s[5], end_time=s[6], text=s[7], confidence=s[8],
        )
        db.add(seg)

    # Cross-meeting action update for website (already added parent action, just history)
    # Action history entries were already added in meeting 1 seeder to simulate this flow

    db.add(GoalMeeting(id=str(uuid.uuid4()), goal_id=GOAL_LAUNCH, meeting_id=MTG_4))


# ─────────────────────────────────────────────────────────────────────────────
# MEETING 5: Completed Commitments — Final Status Meeting
# ─────────────────────────────────────────────────────────────────────────────

def _seed_meeting_5(db: Session):
    mtg = Meeting(
        id=MTG_5,
        org_id=ORG_ID,
        created_by=USER_ARUN,
        title="Product X — Pre-Launch Final Review",
        description="Final review before Product X soft-launch. Website deployed, QA passed, marketing ready.",
        meeting_date=_days_ago(3),
        duration_seconds=1200,
        classification="INTERNAL",
        storage_policy="LOCAL_ONLY",
        storage_mode="LOCAL_ONLY",
        meeting_source="UPLOADED_RECORDING",
        ai_processing_mode="LOCAL_LLM",
        status="COMPLETED",
        processing_mode="DEMO_FALLBACK",
        summary=(
            "Final pre-launch review confirming Product X is ready for October 1 soft-launch. "
            "Website redesign fully deployed by Rahul. QA testing passed with zero critical bugs. "
            "Marketing campaign live. Supplier delivery confirmed by Vikram (verbal — written pending). "
            "Team is confident about the October 1st launch date."
        ),
        key_points=[
            "Website redesign: FULLY DEPLOYED — act-m1-website COMPLETED",
            "QA testing: PASSED (zero critical bugs)",
            "Marketing campaign: LIVE",
            "Product X launch confirmed for October 1st",
        ],
        sentiment_overall="POSITIVE",
        processing_completed_at=_days_ago(3),
        created_at=_days_ago(3),
    )
    db.add(mtg)

    segs = [
        ("seg-m5-01", 0, "SPEAKER_02", "Rahul Verma", SP_RAHUL, 0.0, 35.0,
         "I'm pleased to confirm the website redesign has been fully deployed. All sections are live, mobile-responsive, and performance tested.", 0.97),
        ("seg-m5-02", 1, "SPEAKER_00", "Arun Kumar", SP_ARUN, 36.0, 55.0,
         "Excellent work, Rahul. What about QA?", 0.96),
        ("seg-m5-03", 2, "SPEAKER_02", "Rahul Verma", SP_RAHUL, 56.0, 95.0,
         "QA is complete. We ran all test suites — 847 tests, zero critical failures, 3 minor issues logged and resolved. The product is ready.", 0.97),
        ("seg-m5-04", 3, "SPEAKER_01", "Priya Sharma", SP_PRIYA, 96.0, 130.0,
         "The marketing campaign is live. Social posts are scheduled, press release distributed to 150 outlets, and the product launch event is confirmed.", 0.96),
        ("seg-m5-05", 4, "SPEAKER_00", "Arun Kumar", SP_ARUN, 131.0, 165.0,
         "This is great news. I'm confirming we proceed with the October 1st soft-launch as planned. Product X launch is officially on.", 0.98),
    ]

    for s in segs:
        seg = TranscriptSegment(
            id=s[0], meeting_id=MTG_5, sequence=s[1], speaker_label=s[2],
            speaker_name=s[3], speaker_profile_id=s[4], speaker_confidence=0.93,
            start_time=s[5], end_time=s[6], text=s[7], confidence=s[8],
        )
        db.add(seg)

    dec_launch = Decision(
        id="dec-m5-launch",
        meeting_id=MTG_5, org_id=ORG_ID,
        decision_text="Product X October 1st soft-launch officially confirmed — all systems ready.",
        evidence_text="I'm confirming we proceed with the October 1st soft-launch as planned. Product X launch is officially on.",
        evidence_segment_id="seg-m5-05",
        evidence_timestamp=131.0,
        participants_involved=["Arun Kumar", "Rahul Verma", "Priya Sharma"],
    )
    db.add(dec_launch)

    db.add(GoalMeeting(id=str(uuid.uuid4()), goal_id=GOAL_LAUNCH, meeting_id=MTG_5))
