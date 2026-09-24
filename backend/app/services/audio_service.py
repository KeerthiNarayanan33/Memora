"""
Audio Service — Processing, Waveform Generation & Confinement
"""
import os
import random
from typing import Dict, Any, List
from app.config import settings
from app.services.storage_service import storage_service

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".mp4"}

class AudioService:
    @staticmethod
    def validate_file(filename: str, size_bytes: int):
        ext = os.path.splitext(filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported format {ext}. Allowed: {ALLOWED_EXTENSIONS}")
        if size_bytes > settings.max_upload_size_bytes:
            raise ValueError(f"File size exceeds maximum {settings.max_upload_size_mb}MB")
        return ext

    @staticmethod
    def save_meeting_audio(meeting_id: str, content: bytes, ext: str, storage_mode: str) -> str:
        meeting_dir = storage_service.get_meeting_dir(meeting_id)
        audio_path = os.path.join(meeting_dir, "audio", f"recording{ext}")
        with open(audio_path, "wb") as f:
            f.write(content)
        return audio_path

    @staticmethod
    def generate_waveform_data(num_samples: int = 50) -> List[float]:
        """Generate normalized amplitude envelope points for UI visualization"""
        points = []
        for i in range(num_samples):
            # Natural speech pattern simulation (peaks, valleys, pauses)
            base = 0.2 + 0.6 * abs(random.gauss(0, 0.4))
            points.append(round(min(1.0, max(0.05, base)), 2))
        return points

audio_service = AudioService()
