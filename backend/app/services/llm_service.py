"""
LLM Service — Local Llama via Ollama Interface
Real dynamic model detection, health checking, and structured generation.
"""
import httpx
from typing import Optional, Dict, Any, List
from loguru import logger
from app.config import settings

class LLMService:
    def __init__(self):
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model
        self.timeout = settings.ollama_timeout

    async def get_status(self) -> Dict[str, Any]:
        """Detect whether Ollama and the requested Llama model are available"""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    raw_models = res.json().get("models", [])
                    models = [m.get("name", "") for m in raw_models]
                    
                    # Match configured model or any valid local model
                    active_model = self.model
                    model_found = any(self.model in m for m in models)
                    
                    if not model_found and models:
                        # Prefer any llama model, otherwise first available
                        llama_models = [m for m in models if "llama" in m.lower()]
                        if llama_models:
                            active_model = llama_models[0]
                            model_found = True
                        else:
                            active_model = models[0]
                            model_found = True
                        self.model = active_model
                        logger.info(f"[LLM] Selected active local model: {active_model}")

                    return {
                        "ollama_available": True,
                        "model_available": model_found,
                        "model_name": active_model if model_found else self.model,
                        "available_models": models,
                        "status_text": "LOCAL_AI_READY" if model_found else "MODEL_NOT_FOUND",
                    }
        except Exception as e:
            logger.debug(f"[LLM] Ollama not reachable at {self.base_url}: {e}")
        
        return {
            "ollama_available": False,
            "model_available": False,
            "model_name": self.model,
            "available_models": [],
            "status_text": "LOCAL_AI_OFFLINE",
        }

    async def generate_structured(self, prompt: str, system_prompt: str) -> Optional[str]:
        """Call Ollama /api/generate with JSON schema format and strict prompt"""
        status = await self.get_status()
        if not status["ollama_available"] or not status["model_available"]:
            logger.error(f"[LLM] Cannot generate: Ollama or model unavailable. Status: {status}")
            return None

        active_model = status["model_name"]
        try:
            logger.info(f"[LLM] Sending transcript to Ollama model '{active_model}'")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": active_model,
                        "prompt": prompt,
                        "system": system_prompt,
                        "stream": False,
                        "format": "json",
                        "options": {"temperature": 0.1, "top_p": 0.9}
                    }
                )
                if resp.status_code == 200:
                    response_text = resp.json().get("response")
                    logger.info(f"[LLM] Generation succeeded ({len(response_text or '')} chars)")
                    return response_text
                else:
                    logger.error(f"[LLM] Ollama returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"[LLM] Generation failed: {e}")
        return None

    async def generate_text(self, prompt: str, system: Optional[str] = None) -> Optional[str]:
        """Call Ollama /api/generate with free-form text output"""
        status = await self.get_status()
        if not status["ollama_available"] or not status["model_available"]:
            return None
        active_model = status["model_name"]
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                body = {
                    "model": active_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.4, "top_p": 0.9}
                }
                if system:
                    body["system"] = system
                resp = await client.post(f"{self.base_url}/api/generate", json=body)
                if resp.status_code == 200:
                    return resp.json().get("response")
        except Exception as e:
            logger.error(f"[LLM] Text generation failed: {e}")
        return None

llm_service = LLMService()
