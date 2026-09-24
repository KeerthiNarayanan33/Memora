"""
Storage Service — Local Directory Management & File Confinement
"""
import os
import shutil
from typing import Dict, Any, List
from app.config import settings

MEETGUARD_ROOT = os.getenv("MEETGUARD_DATA_DIR", os.path.abspath("./MeetGuardData"))

class StorageService:
    @staticmethod
    def initialize():
        """Ensure standard MeetGuardData directory hierarchy exists"""
        dirs = [
            os.path.join(MEETGUARD_ROOT, "meetings"),
            os.path.join(MEETGUARD_ROOT, "database"),
            os.path.join(MEETGUARD_ROOT, "speakers", "voice_profiles"),
            os.path.join(MEETGUARD_ROOT, "exports"),
            os.path.join(MEETGUARD_ROOT, "logs"),
            os.path.join(MEETGUARD_ROOT, "cloud_sync_cache"),
        ]
        for d in dirs:
            os.makedirs(d, exist_ok=True)
        return MEETGUARD_ROOT

    @staticmethod
    def get_meeting_dir(meeting_id: str) -> str:
        meeting_dir = os.path.join(MEETGUARD_ROOT, "meetings", meeting_id)
        os.makedirs(os.path.join(meeting_dir, "audio"), exist_ok=True)
        os.makedirs(os.path.join(meeting_dir, "transcript"), exist_ok=True)
        os.makedirs(os.path.join(meeting_dir, "analysis"), exist_ok=True)
        os.makedirs(os.path.join(meeting_dir, "evidence"), exist_ok=True)
        return meeting_dir

    @staticmethod
    def get_local_storage_stats() -> Dict[str, Any]:
        """Inspect local MeetGuard directory sizes and file counts"""
        total_size = 0
        file_count = 0
        for dirpath, dirnames, filenames in os.walk(MEETGUARD_ROOT):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                try:
                    total_size += os.path.getsize(fp)
                    file_count += 1
                except OSError:
                    pass
        
        return {
            "root_path": MEETGUARD_ROOT,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "file_count": file_count,
            "local_storage_enforced": True,
            "cloud_sync_disabled_default": True,
        }

storage_service = StorageService()
