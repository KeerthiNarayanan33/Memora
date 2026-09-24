"""
MeetGuard AI — Ollama/LLM Integration
Provides structured extraction with validation and demo fallback.
"""
import json
import httpx
from typing import Optional, Any
from loguru import logger

from app.config import settings


class OllamaClient:
    """Client for Ollama local LLM inference"""
    
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.timeout = settings.ollama_timeout
    
    async def is_available(self) -> bool:
        """Check if Ollama is running and model is available"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m["name"] for m in data.get("models", [])]
                    # Check if our model (or base name) is available
                    model_base = self.model.split(":")[0]
                    available = any(model_base in m for m in models)
                    logger.info(f"Ollama available. Models: {models}. Target model available: {available}")
                    return available
                return False
        except Exception as e:
            logger.warning(f"Ollama not available: {e}")
            return False
    
    async def generate(self, prompt: str, system: str = "") -> Optional[str]:
        """Generate text from Ollama"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "model": self.model,
                    "prompt": prompt,
                    "system": system,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.1,
                        "top_p": 0.9,
                    }
                }
                resp = await client.post(f"{self.base_url}/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data.get("response", "")
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            return None


EXTRACTION_SYSTEM_PROMPT = """You are a precise meeting intelligence AI. Your job is to extract structured information from meeting transcripts.

CRITICAL RULES:
1. NEVER invent people, owners, deadlines, decisions, or commitments.
2. Every action item MUST have a direct quote from the transcript as evidence.
3. If an owner is not EXPLICITLY named, set owner to "UNRESOLVED" and owner_explicit to false.
4. If a deadline is not EXPLICITLY stated, set deadline to "UNRESOLVED" and deadline_explicit to false.
5. Distinguish between: DISCUSSION, SUGGESTION, DECISION, COMMITMENT, ACTION.
6. "Maybe X can handle Y" is NOT a commitment — do not create an action item.
7. "X will do Y by Z" IS a commitment — create an action item.
8. Only mark is_commitment=true when the speaker explicitly commits.
9. Always output valid JSON matching the schema exactly.

AMBIGUITY DETECTION:
- "Someone should..." → owner=UNRESOLVED
- "Maybe we could..." → NOT an action item
- "Let's think about it" → NOT a decision
- "I'll do it when ready" → owner=explicit, deadline=UNRESOLVED"""


EXTRACTION_PROMPT_TEMPLATE = """Analyze this meeting transcript and extract structured information.

TRANSCRIPT:
{transcript}

Return ONLY valid JSON with this exact structure:
{{
  "meeting_summary": "2-3 sentence executive summary",
  "key_points": ["point1", "point2"],
  "sentiment_overall": "POSITIVE|NEUTRAL|TENSION|MIXED",
  "decisions": [
    {{
      "decision": "clear statement of what was decided",
      "evidence": "exact quote from transcript supporting this decision",
      "timestamp_hint": "approximate time in transcript",
      "participants": ["name1", "name2"]
    }}
  ],
  "action_items": [
    {{
      "action": "specific task to be done",
      "owner": "person's name or UNRESOLVED",
      "deadline": "specific date/time or UNRESOLVED",
      "confidence": 0.95,
      "evidence": "exact quote from transcript",
      "evidence_timestamp_hint": "approximate time",
      "owner_explicit": true,
      "deadline_explicit": false,
      "is_commitment": true,
      "commitment_type": "EXPLICIT|IMPLICIT"
    }}
  ],
  "unresolved_items": [
    {{
      "type": "OWNER|DEADLINE|DECISION|ACTION|CONFLICT",
      "description": "what is unresolved",
      "reason": "why it is unresolved",
      "evidence": "relevant quote"
    }}
  ],
  "risks": ["risk1", "risk2"],
  "follow_up_topics": ["topic1"]
}}"""


async def extract_from_transcript(transcript_text: str) -> Optional[dict]:
    """
    Extract structured meeting information using local LLM.
    Returns None if Ollama is unavailable.
    """
    client = OllamaClient()
    
    if not await client.is_available():
        logger.warning("Ollama unavailable — returning None to trigger demo fallback")
        return None
    
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(transcript=transcript_text)
    raw = await client.generate(prompt, system=EXTRACTION_SYSTEM_PROMPT)
    
    if not raw:
        return None
    
    try:
        # Try to parse JSON from response
        # Sometimes Ollama wraps in markdown code blocks
        raw = raw.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        
        data = json.loads(raw)
        logger.info(f"LLM extraction successful: {len(data.get('action_items', []))} actions, {len(data.get('decisions', []))} decisions")
        return data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON output: {e}\nRaw: {raw[:500]}")
        return None


ollama_client = OllamaClient()
