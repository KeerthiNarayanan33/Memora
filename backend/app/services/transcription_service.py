"""
Transcription Service — Real Local Speech-to-Text with Whisper
"""
import os
import shutil
import tempfile
from typing import List, Dict, Any, Optional
from loguru import logger
from app.config import settings

# Ensure ffmpeg binary is in PATH
try:
    import imageio_ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
    target_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    if not os.path.exists(target_ffmpeg):
        shutil.copyfile(ffmpeg_exe, target_ffmpeg)
    logger.info(f"[WHISPER] Configured ffmpeg binary at: {target_ffmpeg}")
except Exception as e:
    logger.warning(f"[WHISPER] Could not auto-configure imageio_ffmpeg: {e}")

_cached_whisper_model = None
_cached_faster_model = None

def get_transcription_engine():
    """Try to load faster-whisper first for high performance, fallback to openai-whisper"""
    global _cached_faster_model, _cached_whisper_model
    if _cached_faster_model is not None:
        return ("faster-whisper", _cached_faster_model)
    if _cached_whisper_model is not None:
        return ("openai-whisper", _cached_whisper_model)

    # Attempt faster-whisper
    try:
        from faster_whisper import WhisperModel
        model_name = settings.whisper_model or "tiny"
        device = settings.whisper_device or "cpu"
        logger.info(f"[WHISPER] Initializing faster-whisper model '{model_name}' on {device} (int8)")
        _cached_faster_model = WhisperModel(model_name, device=device, compute_type="int8")
        return ("faster-whisper", _cached_faster_model)
    except Exception as e:
        logger.warning(f"[WHISPER] faster-whisper init failed ({e}), falling back to openai-whisper")

    # Fallback to openai-whisper
    try:
        import whisper
        model_name = settings.whisper_model or "tiny"
        device = settings.whisper_device or "cpu"
        logger.info(f"[WHISPER] Loading openai-whisper model '{model_name}' on {device}")
        _cached_whisper_model = whisper.load_model(model_name, device=device)
        return ("openai-whisper", _cached_whisper_model)
    except Exception as e:
        logger.error(f"[WHISPER] All local whisper models failed to load: {e}")
        return ("none", None)


class TranscriptionService:
    @staticmethod
    def get_status() -> Dict[str, Any]:
        """Check if local whisper model and ffmpeg are ready"""
        try:
            engine_name, model = get_transcription_engine()
            return {
                "whisper_ready": model is not None,
                "engine": engine_name,
                "model_name": settings.whisper_model,
                "device": settings.whisper_device,
                "status_text": f"LOCAL_{engine_name.upper()}_READY" if model else "WHISPER_UNAVAILABLE"
            }
        except Exception as e:
            return {
                "whisper_ready": False,
                "model_name": settings.whisper_model,
                "device": settings.whisper_device,
                "status_text": f"WHISPER_ERROR: {str(e)}"
            }

    @staticmethod
    async def transcribe(audio_path: Optional[str]) -> List[Dict[str, Any]]:
        """
        Transcribe audio using local Whisper (faster-whisper with openai-whisper fallback).
        Returns timestamped segments:
        [{ 'sequence': 1, 'start_time': 0.0, 'end_time': 5.2, 'text': '...', 'confidence': 0.95 }]
        """
        if not audio_path or not os.path.exists(audio_path):
            logger.warning("[WHISPER] No audio file present for transcription")
            return []

        file_size = os.path.getsize(audio_path)
        if file_size < 100:
            logger.warning(f"[WHISPER] Audio file is too small ({file_size} bytes)")
            return []

        engine_name, model = get_transcription_engine()
        if not model:
            logger.error("[WHISPER] No transcription model available")
            return []

        try:
            logger.info(f"[WHISPER] Transcribing real audio with {engine_name}: {audio_path} ({file_size} bytes)")
            
            result = []
            if engine_name == "faster-whisper":
                segments_iter, info = model.transcribe(
                    audio_path,
                    beam_size=1,
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=500),
                    language="en"
                )
                for i, seg in enumerate(segments_iter):
                    txt = seg.text.strip()
                    if not txt:
                        continue
                    # Compute confidence
                    avg_logprob = getattr(seg, "avg_logprob", -0.2)
                    conf = max(0.5, min(0.99, round(float(2.718 ** avg_logprob), 2)))
                    result.append({
                        "sequence": i + 1,
                        "start_time": round(float(seg.start), 2),
                        "end_time": round(float(seg.end), 2),
                        "text": txt,
                        "confidence": conf,
                    })
            else:
                # openai-whisper
                result_data = model.transcribe(
                    audio_path,
                    fp16=False,
                    language="en",
                    verbose=False
                )
                raw_segments = result_data.get("segments", [])
                for i, seg in enumerate(raw_segments):
                    text = seg.get("text", "").strip()
                    if not text:
                        continue
                    result.append({
                        "sequence": i + 1,
                        "start_time": round(float(seg.get("start", 0.0)), 2),
                        "end_time": round(float(seg.get("end", 0.0)), 2),
                        "text": text,
                        "confidence": 0.95,
                    })

                if not result and result_data.get("text", "").strip():
                    full_text = result_data["text"].strip()
                    result.append({
                        "sequence": 1,
                        "start_time": 0.0,
                        "end_time": 5.0,
                        "text": full_text,
                        "confidence": 0.95,
                    })

            logger.info(f"[WHISPER] Transcribed {len(result)} real segments from audio")
            return result
        except Exception as e:
            logger.error(f"[WHISPER] Transcription error: {e}")
            # If faster-whisper failed, retry with openai-whisper fallback
            if engine_name == "faster-whisper":
                try:
                    import whisper
                    model_fb = whisper.load_model("tiny", device="cpu")
                    logger.info("[WHISPER] Retrying with openai-whisper fallback...")
                    fb_res = model_fb.transcribe(audio_path, fp16=False, language="en", verbose=False)
                    res = []
                    for i, seg in enumerate(fb_res.get("segments", [])):
                        t = seg.get("text", "").strip()
                        if t:
                            res.append({
                                "sequence": i + 1,
                                "start_time": round(float(seg.get("start", 0.0)), 2),
                                "end_time": round(float(seg.get("end", 0.0)), 2),
                                "text": t,
                                "confidence": 0.92,
                            })
                    return res
                except Exception as e2:
                    logger.error(f"[WHISPER] Fallback whisper also failed: {e2}")
            return []

    @staticmethod
    async def transcribe_chunk(audio_bytes: bytes, filename: str = "chunk.webm") -> Optional[Dict[str, Any]]:
        """Transcribe a small chunk in real-time"""
        if not audio_bytes or len(audio_bytes) < 1000:
            return None
        
        ext = os.path.splitext(filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            segments = await TranscriptionService.transcribe(tmp_path)
            if segments:
                combined_text = " ".join(s["text"] for s in segments)
                return {
                    "text": combined_text,
                    "segments": segments,
                    "start_time": segments[0]["start_time"],
                    "end_time": segments[-1]["end_time"]
                }
            return None
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

transcription_service = TranscriptionService()
