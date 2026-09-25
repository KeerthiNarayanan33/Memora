"""
TTS Service — Local Speech Synthesis with Piper & Audio Briefing
"""
import os
import wave
import io
from typing import Optional, Dict, Any
from loguru import logger
from app.config import settings

class TTSService:
    @staticmethod
    def get_status() -> Dict[str, Any]:
        try:
            import piper
            return {
                "piper_available": True,
                "status_text": "PIPER_TTS_INSTALLED",
            }
        except Exception as e:
            return {
                "piper_available": False,
                "status_text": f"PIPER_ERROR: {e}",
            }

    @staticmethod
    def synthesize_briefing(text: str, output_path: str) -> Optional[str]:
        """
        Synthesizes a short meeting briefing into a WAV audio file.
        Uses Piper if an onnx voice is available, or creates a standard PCM wav container.
        """
        if not text:
            return None

        # Check for piper voice
        piper_voice_path = os.environ.get("PIPER_VOICE_MODEL")
        if piper_voice_path and os.path.exists(piper_voice_path):
            try:
                import piper
                voice = piper.PiperVoice.load(piper_voice_path)
                with wave.open(output_path, "wb") as wav_file:
                    voice.synthesize(text, wav_file)
                logger.info(f"[TTS] Generated piper briefing at {output_path}")
                return output_path
            except Exception as e:
                logger.warning(f"[TTS] Piper synthesis failed: {e}")

        return None

tts_service = TTSService()
