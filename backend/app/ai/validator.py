"""
MeetGuard AI — AI Output Validation
Zero-hallucination validation pipeline for LLM extractions.
"""
from typing import Optional
from loguru import logger


def validate_extraction(raw: dict, transcript_text: str) -> dict:
    """
    Validate and clean LLM extraction output.
    Enforces zero-hallucination rules.
    """
    validated = {
        "meeting_summary": raw.get("meeting_summary", ""),
        "key_points": raw.get("key_points", []),
        "sentiment_overall": raw.get("sentiment_overall", "NEUTRAL"),
        "decisions": [],
        "action_items": [],
        "unresolved_items": raw.get("unresolved_items", []),
        "risks": raw.get("risks", []),
        "follow_up_topics": raw.get("follow_up_topics", []),
        "validation_warnings": [],
    }
    
    # Validate decisions
    for dec in raw.get("decisions", []):
        if not dec.get("decision"):
            continue
        evidence = dec.get("evidence", "")
        if not evidence:
            validated["validation_warnings"].append(
                f"Decision '{dec['decision'][:50]}' has no evidence — marked as requires_review"
            )
            dec["requires_review"] = True
        else:
            # Check evidence exists in transcript (fuzzy)
            key_words = set(evidence.lower().split()) - {"the", "a", "is", "it", "we", "to", "and", "of"}
            match_score = sum(1 for w in key_words if w in transcript_text.lower())
            if match_score < len(key_words) * 0.3:
                dec["hallucination_risk"] = True
                validated["validation_warnings"].append(
                    f"Decision evidence not found in transcript: '{evidence[:50]}'"
                )
        validated["decisions"].append(dec)
    
    # Validate action items
    for ai in raw.get("action_items", []):
        if not ai.get("action"):
            continue
        
        # Evidence check
        evidence = ai.get("evidence", "")
        if not evidence:
            ai["requires_review"] = True
            ai["hallucination_risk"] = False
            validated["validation_warnings"].append(
                f"Action '{ai['action'][:50]}' has no evidence"
            )
        
        # Owner check
        owner = ai.get("owner", "UNRESOLVED")
        owner_explicit = ai.get("owner_explicit", False)
        if not owner or owner.strip() == "":
            ai["owner"] = "UNRESOLVED"
            ai["owner_explicit"] = False
        
        # Deadline check
        deadline = ai.get("deadline", "UNRESOLVED")
        if not deadline or deadline.strip() == "":
            ai["deadline"] = "UNRESOLVED"
            ai["deadline_explicit"] = False
        
        # Commitment check — never auto-elevate suggestions
        is_commitment = ai.get("is_commitment", False)
        commitment_type = ai.get("commitment_type", "EXPLICIT")
        if not is_commitment:
            logger.debug(f"Skipping non-commitment action: {ai['action'][:50]}")
            continue  # Don't include mere suggestions as action items
        
        validated["action_items"].append(ai)
    
    return validated


def detect_cross_meeting_matches(
    new_actions: list[dict],
    existing_actions: list,  # List of ActionItem ORM objects
) -> list[dict]:
    """
    Detect when new actions reference existing open action items.
    Returns list of matches: {new_action_text, existing_action_id, match_reason}
    """
    matches = []
    
    for new_action in new_actions:
        new_text = new_action.get("action", "").lower()
        new_owner = (new_action.get("owner") or "").lower()
        
        for existing in existing_actions:
            if existing.status == "COMPLETED":
                continue
            
            existing_text = (existing.action_text or "").lower()
            existing_owner = (existing.owner_name or "").lower()
            
            # Simple keyword overlap matching
            new_words = set(new_text.split()) - {"the", "a", "an", "is", "to", "and", "for", "of"}
            existing_words = set(existing_text.split()) - {"the", "a", "an", "is", "to", "and", "for", "of"}
            
            overlap = new_words & existing_words
            overlap_ratio = len(overlap) / max(len(new_words), 1)
            
            owner_match = new_owner and existing_owner and (
                new_owner in existing_owner or existing_owner in new_owner
            )
            
            if overlap_ratio > 0.4 and (owner_match or overlap_ratio > 0.6):
                matches.append({
                    "new_action_text": new_action.get("action"),
                    "existing_action_id": existing.id,
                    "match_reason": f"High keyword overlap ({overlap_ratio:.0%})",
                    "overlap_ratio": overlap_ratio,
                })
                break
    
    return matches
