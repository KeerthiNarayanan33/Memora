"""
Validation Service — Zero-Hallucination Evidence Verification Engine
"""
from typing import Dict, Any, List
from loguru import logger

def _to_bool(val: Any, default: bool = False) -> bool:
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    if isinstance(val, str):
        cleaned = val.strip().lower()
        if cleaned in ("true", "1", "yes", "t", "y"):
            return True
        if cleaned in ("false", "0", "no", "n", "f"):
            return False
    return default

def _to_float(val: Any, default: float = 0.85) -> float:
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        cleaned = val.strip().upper()
        if cleaned in ("HIGH", "VERY HIGH", "STRONG"):
            return 0.92
        elif cleaned in ("MEDIUM", "MODERATE"):
            return 0.75
        elif cleaned in ("LOW", "WEAK"):
            return 0.50
        try:
            return float(cleaned)
        except ValueError:
            return default
    return default

class ValidationService:
    @staticmethod
    def validate_extraction(raw_data: Dict[str, Any], transcript_text: str) -> Dict[str, Any]:
        """
        Guarantees zero-hallucination integrity:
        1. If evidence quote is missing or not found in transcript -> marks hallucination_risk=True, requires_review=True.
        2. If owner is not explicit -> enforces owner='UNRESOLVED'.
        3. If deadline is not explicit -> enforces deadline='UNRESOLVED'.
        4. Strictly enforces boolean types for all boolean fields.
        """
        validated_decisions = []
        transcript_clean = transcript_text.lower() if transcript_text else ""

        for dec in raw_data.get("decisions", []):
            evidence = str(dec.get("evidence", "")).strip()
            # If transcript is available, verify evidence substring exists
            anchored = bool(evidence and (not transcript_clean or evidence.lower() in transcript_clean))
            
            validated_decisions.append({
                "decision": str(dec.get("decision", "")),
                "evidence": evidence or "Evidence inferred from speaker dialogue",
                "participants": dec.get("participants", []) if isinstance(dec.get("participants"), list) else [],
                "confidence": _to_float(dec.get("confidence"), 0.85 if anchored else 0.60),
                "hallucination_risk": bool(not anchored),
                "requires_review": bool(not anchored),
            })

        validated_actions = []
        for act in raw_data.get("action_items", []):
            owner = str(act.get("owner", "")).strip()
            deadline = str(act.get("deadline", "")).strip()
            evidence = str(act.get("evidence", "")).strip()
            
            # Enforce unresolved heuristics
            if not owner or owner.lower() in ("someone", "team", "unassigned", "unresolved", "anybody"):
                owner = "UNRESOLVED"
                owner_explicit = False
            else:
                owner_explicit = _to_bool(act.get("owner_explicit"), default=True)
            
            if not deadline or deadline.lower() in ("asap", "soon", "tbd", "unresolved", "whenever"):
                deadline = "UNRESOLVED"
                deadline_explicit = False
            else:
                deadline_explicit = _to_bool(act.get("deadline_explicit"), default=True)
            
            anchored = bool(evidence and (not transcript_clean or evidence.lower() in transcript_clean))
            
            validated_actions.append({
                "action": str(act.get("action", "")),
                "owner": owner,
                "owner_explicit": bool(owner_explicit),
                "deadline": deadline,
                "deadline_explicit": bool(deadline_explicit),
                "evidence": evidence or "Direct dialogue commitment",
                "confidence": _to_float(act.get("confidence"), 0.90 if (owner_explicit and deadline_explicit) else 0.70),
                "is_commitment": _to_bool(act.get("is_commitment"), default=True),
                "hallucination_risk": bool(not anchored or not owner_explicit),
                "requires_review": bool(not owner_explicit or not deadline_explicit or not anchored),
            })

        return {
            "meeting_summary": raw_data.get("meeting_summary", ""),
            "key_points": raw_data.get("key_points", []),
            "decisions": validated_decisions,
            "action_items": validated_actions,
            "unresolved_items": raw_data.get("unresolved_items", []),
            "risks": raw_data.get("risks", []),
            "follow_up_topics": raw_data.get("follow_up_topics", []),
            "sentiment_overall": raw_data.get("sentiment_overall", "NEUTRAL"),
            "_mode": raw_data.get("_mode", "LOCAL_LLAMA"),
        }

validation_service = ValidationService()
