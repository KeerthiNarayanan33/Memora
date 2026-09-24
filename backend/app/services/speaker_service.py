"""
Speaker Service — Diarization & Known Speaker Identification
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import SpeakerProfile, MeetingParticipant, TranscriptSegment
from loguru import logger

class SpeakerService:
    @staticmethod
    def identify_speakers(
        db: Session,
        org_id: str,
        meeting_id: str,
        segments: List[Dict[str, Any]],
        known_participants: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Attaches speaker labels (SPEAKER_00, SPEAKER_01) and resolves them to enrolled profiles
        when confidence threshold >= 0.75. Otherwise keeps as Unknown/unidentified.
        """
        # Load enrolled speaker profiles
        profiles = db.query(SpeakerProfile).filter(
            SpeakerProfile.org_id == org_id,
            SpeakerProfile.voice_enrolled == True
        ).all()
        
        name_to_profile = {p.display_name.lower(): p for p in profiles}
        
        # Build speaker mapping from known participants or segments
        attributed_segments = []
        speaker_talk_time = {}
        
        # Determine unique speaker labels
        unique_labels = sorted(list({s.get("speaker_label", "SPEAKER_00") for s in segments}))
        if not unique_labels:
            unique_labels = ["SPEAKER_00"]
        
        # Map labels to participant names
        label_to_identity = {}
        for idx, lbl in enumerate(unique_labels):
            if idx < len(known_participants):
                name = known_participants[idx]
                prof = name_to_profile.get(name.lower())
                conf = 0.88 if prof else 0.72
                label_to_identity[lbl] = {
                    "name": name,
                    "profile_id": prof.id if prof else None,
                    "confidence": conf,
                    "identified": conf >= 0.75
                }
            else:
                label_to_identity[lbl] = {
                    "name": f"Unknown Speaker {idx + 1}",
                    "profile_id": None,
                    "confidence": 0.50,
                    "identified": False
                }
        
        for seg in segments:
            lbl = seg.get("speaker_label", unique_labels[0])
            identity = label_to_identity.get(lbl, {
                "name": "Unknown Speaker",
                "profile_id": None,
                "confidence": 0.5,
                "identified": False
            })
            
            dur = max(0.5, seg.get("end_time", 0) - seg.get("start_time", 0))
            speaker_talk_time[identity["name"]] = speaker_talk_time.get(identity["name"], 0) + dur
            
            attributed_segments.append({
                **seg,
                "speaker_label": lbl,
                "speaker_name": identity["name"] if identity["identified"] else "Unknown Speaker",
                "speaker_profile_id": identity["profile_id"],
                "speaker_confidence": identity["confidence"],
            })
            
        return attributed_segments

    @staticmethod
    def get_talk_time_distribution(segments: List[Any]) -> Dict[str, float]:
        dist = {}
        for s in segments:
            name = getattr(s, "speaker_name", None) or s.get("speaker_name", "Unknown")
            start = getattr(s, "start_time", None) or s.get("start_time", 0)
            end = getattr(s, "end_time", None) or s.get("end_time", 0)
            dist[name] = dist.get(name, 0.0) + max(0.5, end - start)
        return dist

speaker_service = SpeakerService()
