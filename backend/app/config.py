"""
MeetGuard AI — Backend Configuration
"""
import os
from typing import Literal, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # Application
    app_name: str = "MeetGuard AI"
    app_env: Literal["development", "production", "demo"] = "development"
    debug: bool = True
    log_level: str = "INFO"
    
    # Security
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    
    # Database
    database_url: str = "sqlite:///./data/meetguard.db"
    
    # Ollama / LLM
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:1b"
    ollama_timeout: int = 120
    
    # Speech
    whisper_model: str = "tiny"
    whisper_device: str = "cpu"
    
    # Storage
    storage_mode: Literal["local", "cloud", "local_and_cloud"] = "local"
    upload_dir: str = "./data/uploads"
    local_storage_dir: str = "./data/local"
    max_upload_size_mb: int = 100
    
    # Cloud Storage (optional)
    cloud_provider: str = "none"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_bucket_name: str = ""
    aws_region: str = "us-east-1"
    
    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Data retention
    retention_days: int = 90
    
    # Demo
    demo_mode: bool = False
    seed_demo_data: bool = True
    
    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]
    
    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
