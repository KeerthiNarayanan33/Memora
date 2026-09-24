# MeetGuard AI — Hackathon Repair Audit

**Date:** 2026-09-24  
**Audit Status:** Complete — Immediate Remediation Active  
**Objective:** Replace all fake/hardcoded behavior with a real, working pipeline for the live hackathon demonstration.

---

## 1. Speech-to-Text & Transcript Pipeline

### CURRENT PROBLEM
When recording audio or uploading a file, the application frequently displayed hardcoded meeting transcripts ("Welcome everyone to this session on... Rahul: I will handle Docker container secret scanning...").

### ROOT CAUSE
1. `faster-whisper` depends on `av` (PyAV), whose native DLL `av._core.pyd` is blocked on this Windows system by Windows Application Control (`ImportError: DLL load failed while importing _core: An Application Control policy has blocked this file`).
2. In `backend/app/services/meeting_service.py` (lines 120–128), if transcription returned empty or failed, the backend silently injected 5 fake transcript segments into the database.
3. MediaRecorder in Chrome produces `audio/webm`, which requires ffmpeg if using backend decoders, but `ffmpeg` is not in the system PATH.

### FIX
1. Remove all synthetic transcript injection fallbacks from `meeting_service.py`. If transcription produces no speech, honestly report "No speech detected in audio".
2. Add support for:
   - Dual-engine transcription: Browser-level Web Speech API / chunk transcription for real-time live transcript display as the user speaks.
   - Backend speech transcription using pure Python / Torch / SoundFile / OpenAI Whisper with standalone ffmpeg runner (`imageio-ffmpeg` or WAV converter).
   - Frontend MediaRecorder using WAV / standard audio chunks so backend receives clean PCM audio chunks.
3. Add a dedicated endpoint `POST /api/v1/meetings/{id}/transcript-chunks` and `POST /api/v1/meetings/transcribe-chunk` for live streaming chunk transcription.

### TEST
Speak "Hello, this is a real MeetGuard test meeting." into the microphone. Verify the exact recognized words appear in the UI transcript container.

---

## 2. Local Llama / Ollama AI Extraction

### CURRENT PROBLEM
The application displayed pre-written action items (Rahul Sharma -> Docker secret scanning, Priya Singh -> SOC2 compliance) instead of extracting actions from the actual spoken words.

### ROOT CAUSE
1. In `backend/app/services/extraction_service.py` (lines 44–118), if Ollama was unreachable or the model was not ready, `get_deterministic_extraction()` returned a static hardcoded dictionary.
2. Ollama running on port 11434 had no models pulled initially.
3. The prompt used was permissive and did not strictly enforce the zero-hallucination evidence rule.

### FIX
1. Eliminate silent fallback to `get_deterministic_extraction` in real processing mode.
2. Implement dynamic model detection in `backend/app/services/llm_service.py`: detect any pulled model (e.g. `llama3.2`, `llama3.2:1b`, `qwen2.5:0.5b`, etc.) or prompt user if no model is loaded.
3. Create endpoint `GET /api/v1/ai/health` returning `ollama_available`, `model_available`, `model_name`, `available_models`.
4. Apply the strict extraction system prompt requiring JSON output with exact evidence quotes, explicit owner, and explicit deadline flags.
5. In `validation_service.py`, verify that every extracted action's `evidence` substring actually exists in the real transcript. Mark unverified items as `REVIEW_REQUIRED`.

### TEST
Provide transcript: "Arun, please complete the website redesign by Friday." Run analysis. Verify extracted action is "Complete the website redesign", owner is "Arun", deadline is "Friday", and evidence quotes the transcript.

---

## 3. Real Microphone & Audio Handling

### CURRENT PROBLEM
`RecordMeeting.tsx` had a simulated fallback that generated a fake audio blob and fake timer when permissions were tricky. No live transcript appeared during speech.

### ROOT CAUSE
No chunk-based transcription or live speech recognition was attached to the audio stream.

### FIX
1. Connect real `navigator.mediaDevices.getUserMedia({ audio: true })`.
2. Connect live speech recognition via Web Speech API and/or periodic audio chunk uploads to `/api/v1/meetings/{id}/chunks`.
3. Display real audio level waveform using `AnalyserNode`.
4. Send actual recorded audio blob to backend `POST /api/v1/meetings/{id}/audio`.

### TEST
Click "Start Recording", verify browser mic indicator lights up, speak into microphone, observe live transcript appearing chunk-by-chunk, stop recording, verify uploaded file size > 0 on disk.

---

## 4. Google Meet & Online Mode

### CURRENT PROBLEM
Online meeting was either a mockup or claimed direct Google Meet integration, which web applications cannot do without OAuth bot access or tab sharing.

### ROOT CAUSE
Browser security sandbox prevents any website from reading another tab's audio without user consent.

### FIX
1. Implement the honest, practical browser capture workflow:
   - Provide Google Meet URL input + "Open Google Meet" button.
   - Use `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })` to capture the Google Meet tab audio stream.
   - Stream or record that audio into the same backend pipeline.
2. Provide a prominent "Import Online Meeting Recording" fallback supporting mp3, wav, m4a, webm, mp4.
3. Clearly label: "Tab Audio Capture via Browser Share / Recording Import".

### TEST
Start Online Meeting, enter Meet URL, open it, select tab audio capture or upload an audio file, verify real audio is processed.

---

## 5. Storage Abstraction (Local vs Cloud)

### CURRENT PROBLEM
Storage logic was scattered across `cloud_service.py` and `storage_service.py` with mock fallbacks claiming cloud sync when no credentials existed.

### ROOT CAUSE
No unified interface separating `LocalStorageProvider` and `CloudStorageProvider`.

### FIX
1. Create storage abstraction:
   - `LocalStorageProvider` (saves to `./data/meetings/<id>/audio`, `transcript`, `analysis`).
   - `CloudStorageProvider` (validates AWS S3 credentials; if missing, reports `NOT CONFIGURED`).
2. Create endpoint `GET /api/v1/storage/status` reporting `storage_mode`, `storage_path`, `cloud_enabled`, `cloud_sync_status`.

### TEST
Set storage to `LOCAL_ONLY`. Check `./data/meetings/<id>/` to verify audio, transcript, and analysis JSON are written. Verify UI shows `CLOUD SYNC OFF`.

---

## 6. Dashboard & Action Tracker

### CURRENT PROBLEM
Risk of hardcoded statistics and demo data leaking into real user views.

### ROOT CAUSE
Demo data seeded at startup was not cleanly separated from real user sessions.

### FIX
1. Separate `DEMO` meetings from real meetings using a distinct flag / org or explicit Demo Mode switch.
2. Dashboard counts (Meetings, Actions, Completed, Overdue, Unresolved) calculated strictly from database queries on the user's organization.
3. Cross-meeting accountability: match newly extracted actions against existing open actions in DB to prevent duplicates and mark completed tasks.

### TEST
Record a new meeting with 1 action. Dashboard count must increment by exactly 1 meeting and 1 action. Refresh page; counts and items persist.

---

## 7. UI Simplification

### CURRENT PROBLEM
20 different pages, confusing wizards, bloated cards distracting from the core live demo.

### ROOT CAUSE
Feature creep with mock analytics and multi-step wizards before core pipeline worked.

### FIX
Streamline to core navigation:
1. **Dashboard** (Real DB metrics, quick start)
2. **Local Meeting** (One-click recording, live waveform, live transcript, AI extraction, evidence viewer)
3. **Online Meeting** (Google Meet tab audio capture + file import)
4. **Action Tracker** (Filterable actions with evidence drawer)
5. **System Health & Privacy** (Live status of Mic, Whisper/STT, Ollama, Llama Model, Storage, Cloud)
