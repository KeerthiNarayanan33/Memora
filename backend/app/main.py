"""
MeetGuard AI — FastAPI Main Application
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from app.config import settings
from app.database.session import create_tables, SessionLocal
from app.database.seed import seed_all

from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.meetings import router as meetings_router
from app.api.actions import router as actions_router
from app.api.providers import router as providers_router
from app.api.misc import (
    goals_router, speakers_router, search_router,
    analytics_router, ai_router, audit_router,
    unresolved_router, digest_router,
)
from app.services.storage_service import storage_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown"""
    logger.info(f"Starting Memora AI ({settings.app_env})")
    
    # Initialize Memora storage hierarchy
    storage_service.initialize()
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.local_storage_dir, exist_ok=True)
    os.makedirs("./data/demo", exist_ok=True)
    
    # Create tables
    create_tables()
    logger.info("Database tables created")
    
    # Seed demo data
    if settings.seed_demo_data:
        db = SessionLocal()
        try:
            seed_all(db)
        finally:
            db.close()
    
    yield
    logger.info("Memora AI shutting down")


app = FastAPI(
    title="Memora AI",
    description="Enterprise Meeting Intelligence Platform — From conversations to commitments.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
PREFIX = "/api/v1"
app.include_router(auth_router, prefix=PREFIX)
app.include_router(dashboard_router, prefix=PREFIX)
app.include_router(meetings_router, prefix=PREFIX)
app.include_router(actions_router, prefix=PREFIX)
app.include_router(goals_router, prefix=PREFIX)
app.include_router(speakers_router, prefix=PREFIX)
app.include_router(search_router, prefix=PREFIX)
app.include_router(analytics_router, prefix=PREFIX)
app.include_router(ai_router, prefix=PREFIX)
app.include_router(audit_router, prefix=PREFIX)
app.include_router(unresolved_router, prefix=PREFIX)
app.include_router(digest_router, prefix=PREFIX)
app.include_router(providers_router, prefix=PREFIX)


@app.get("/api/v1/health")
async def health():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.0.0",
        "env": settings.app_env,
        "demo_mode": settings.demo_mode,
    }


@app.get("/")
async def root():
    return {"message": "Memora AI API", "docs": "/docs"}
