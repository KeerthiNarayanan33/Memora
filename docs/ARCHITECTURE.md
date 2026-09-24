# MeetGuard AI — System Architecture

## Overview

MeetGuard AI is a privacy-first enterprise meeting intelligence platform that transforms raw meeting conversations into structured accountability records with full evidence trails.

## Core Principle

**Meetings should not end when the meeting ends.**

Every decision, commitment, and action extracted from a meeting is backed by verifiable transcript evidence. No hallucinations. No invented owners. No fabricated deadlines.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│  Dashboard | Meetings | Actions | Decisions | Goals | Analytics  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────▼───────────────────────────────────────┐
│                     BACKEND (FastAPI + Python)                   │
│                                                                  │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │   Auth   │  │  Meetings  │  │  AI Pipeline │  │ Tracker  │  │
│  └──────────┘  └────────────┘  └──────────────┘  └──────────┘  │
│                                                                  │
│  ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Storage   │  │   Speakers   │  │  Search  │  │ Audit    │  │
│  └────────────┘  └──────────────┘  └──────────┘  └──────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼──────────────────────┐
        │                 │                      │
┌───────▼──────┐  ┌───────▼──────┐  ┌───────────▼──────┐
│   SQLite DB  │  │ Ollama/Llama  │  │  Local Filesystem │
│  (PostgreSQL │  │  Local LLM   │  │  (audio, files)  │
│   ready)     │  └──────────────┘  └──────────────────┘
└──────────────┘
```

---

## Processing Pipeline

```
AUDIO INPUT (upload or live mic)
        ↓
[Audio Preprocessing]
  • Format normalization
  • Sample rate conversion
  • Noise filtering (if available)
        ↓
[Speech-to-Text] — Faster-Whisper (fallback: demo data)
  • Timestamped word-level transcription
  • Language detection
        ↓
[Speaker Diarization] — pyannote.audio (fallback: heuristic)
  • Speaker segment boundaries
  • Speaker turn detection
        ↓
[Speaker Identification] — Voice embeddings
  • Match against enrolled profiles
  • Unknown speaker label if confidence < threshold
        ↓
[Transcript Assembly]
  • Merge timestamps + speaker + text
  • Segment-level transcript records
        ↓
[Local LLM Analysis] — Ollama/Llama (fallback: deterministic demo)
  • Meeting summary
  • Key points extraction
  • Decision extraction with evidence
  • Action item extraction with evidence
  • Owner/deadline extraction
  • Unresolved item detection
  • Sentiment/tension analysis
        ↓
[AI Output Validation]
  • JSON schema validation
  • Evidence existence check
  • Owner ambiguity check
  • Deadline ambiguity check
  • Hallucination risk flag
  • Duplicate detection
        ↓
[Cross-Meeting Matching]
  • Match actions against existing open actions
  • Update status if referenced in new meeting
  • Mark as CARRIED_OVER if unresolved across meetings
        ↓
[Database Persistence]
  • TranscriptSegments
  • Decisions + Evidence
  • ActionItems + Evidence
  • UnresolvedItems
  • GoalRelationships
  • AuditLog entries
        ↓
[Dashboard Update]
  • Real-time status refresh
  • Overdue calculation
  • Goal progress update
```

---

## Component Responsibilities

### Frontend
- React 18 + TypeScript + Vite
- TailwindCSS + shadcn/ui components
- TanStack Query for server state
- React Router v6 for navigation
- Recharts for analytics
- Lucide icons

### Backend API
- FastAPI with async handlers
- Pydantic v2 for request/response schemas
- SQLAlchemy 2.0 ORM
- Background tasks for audio processing
- JWT authentication (python-jose)
- bcrypt password hashing

### Database
- SQLite for MVP (WAL mode for concurrency)
- SQLAlchemy models designed for PostgreSQL migration
- Alembic migrations ready

### AI Pipeline
- Ollama client for local LLM inference
- Structured JSON output via prompt engineering
- Validation layer after every LLM call
- Deterministic demo fallback

### Speech Processing
- Faster-Whisper for transcription
- pyannote.audio for speaker diarization
- Custom speaker embedding matching
- Graceful degradation when unavailable

### Storage
- LOCAL_ONLY: all files stay on server filesystem
- CLOUD: abstraction layer (S3-compatible)
- LOCAL_AND_CLOUD: sync after local write
- Default for HIGHLY_CONFIDENTIAL: LOCAL_ONLY

---

## Security Architecture

- JWT tokens with configurable expiry
- bcrypt password hashing (rounds=12)
- Role-based access control (ADMIN, MANAGER, MEMBER)
- File type validation (whitelist)
- File size limits (configurable, default 100MB)
- CORS configured for frontend origin only
- No secrets in frontend code
- Environment variables for all configuration
- Audit logging for all state changes

---

## Fallback Strategy

| Service | Available | Fallback |
|---------|-----------|----------|
| Ollama/Llama | ✓ | Demo extraction data (clearly labeled) |
| Faster-Whisper | ✓ | Pre-loaded demo transcripts |
| pyannote.audio | ✓ | Heuristic speaker segmentation |
| Cloud Storage | ✓ | Local filesystem only |

**Critical**: The UI always shows whether real AI or demo fallback is active.

---

## Data Flow: Zero-Hallucination Guarantee

1. Every `ActionItem` has `evidence_segment_id` pointing to a real `TranscriptSegment`
2. `owner_explicit: bool` — false means owner is UNRESOLVED
3. `deadline_explicit: bool` — false means deadline is UNRESOLVED  
4. `is_ai_suggested` flags on GoalRelationships prevent silent AI decisions
5. Validation layer rejects any extraction without evidence reference
6. `hallucination_risk` field flags low-confidence extractions for human review
