"""
Speaker Service — Acoustic & Conversational Diarization & Speaker Identification
"""
import os
import re
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from app.database.models import SpeakerProfile, MeetingParticipant, TranscriptSegment
from loguru import logger

class SpeakerService:
    @staticmethod
    def _extract_acoustic_features(audio_path: str, segments: List[Dict[str, Any]]) -> List[int]:
        """
        Extract vocal acoustic features (pitch, centroid, energy) from audio time slices
        and cluster into speaker IDs (0, 1, 2...).
        """
        try:
            data = None
            samplerate = 16000

            # 1. Try PyAV (supports webm, ogg, mp4, wav, etc.)
            try:
                import av
                container = av.open(audio_path)
                audio_streams = [s for s in container.streams if s.type == "audio"]
                if audio_streams:
                    stream = audio_streams[0]
                    samplerate = stream.sample_rate or 16000
                    chunks = []
                    for frame in container.decode(stream):
                        arr = frame.to_ndarray()
                        chunks.append(arr)
                    if chunks:
                        data = np.concatenate(chunks, axis=-1)
                        if data.ndim > 1:
                            data = np.mean(data, axis=0)
                        data = data.astype(np.float32) / (np.max(np.abs(data)) + 1e-6)
            except Exception as e_av:
                logger.debug(f"[SPEAKER_DIARIZATION] PyAV read failed: {e_av}")

            # 2. Fallback to soundfile if av not loaded
            if data is None:
                import soundfile as sf
                data, samplerate = sf.read(audio_path)
                if data.ndim > 1:
                    data = np.mean(data, axis=1)
            
            features = []
            for seg in segments:
                start_samp = max(0, int(seg.get("start_time", 0.0) * samplerate))
                end_samp = min(len(data), int(seg.get("end_time", 0.0) * samplerate))
                chunk = data[start_samp:end_samp]
                
                if len(chunk) < 400:
                    features.append([0.0, 0.0, 0.0])
                    continue
                
                # 1. RMS Energy
                energy = float(np.sqrt(np.mean(chunk ** 2)))
                # 2. Zero Crossing Rate (pitch/texture)
                zcr = float(np.mean(np.abs(np.diff(np.sign(chunk)))) / 2.0)
                # 3. Spectral Centroid
                fft_vals = np.abs(np.fft.rfft(chunk[:min(len(chunk), 4096)]))
                freqs = np.fft.rfftfreq(len(chunk[:min(len(chunk), 4096)]), 1.0 / samplerate)
                sum_fft = np.sum(fft_vals)
                centroid = float(np.sum(freqs * fft_vals) / sum_fft) if sum_fft > 0 else 0.0
                
                features.append([energy * 100.0, zcr * 100.0, centroid / 1000.0])

            # Cluster if we have distinct segments
            feat_arr = np.array(features)
            if len(feat_arr) <= 1:
                return [0] * len(segments)

            # Normalize features
            norm_feats = (feat_arr - np.mean(feat_arr, axis=0)) / (np.std(feat_arr, axis=0) + 1e-6)
            
            # Simple 2-to-3 cluster k-means
            k = min(3, len(segments))
            if norm_feats.shape[0] >= 3:
                # K-means clustering
                centroids = norm_feats[:k]
                labels = np.zeros(len(norm_feats), dtype=int)
                for _ in range(5):
                    dists = np.linalg.norm(norm_feats[:, None, :] - centroids[None, :, :], axis=2)
                    labels = np.argmin(dists, axis=1)
                    for j in range(k):
                        members = norm_feats[labels == j]
                        if len(members) > 0:
                            centroids[j] = np.mean(members, axis=0)
                return labels.tolist()
            return [0] * len(segments)
        except Exception as e:
            logger.debug(f"[SPEAKER_DIARIZATION] Acoustic feature clustering skipped: {e}")
            return []

    @staticmethod
    def identify_speakers(
        db: Session,
        org_id: str,
        meeting_id: str,
        segments: List[Dict[str, Any]],
        known_participants: List[str],
        audio_path: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Attaches speaker labels (SPEAKER_00, SPEAKER_01...) using acoustic clustering,
        dialogue turn markers, and enrolled speaker profiles.
        """
        if not segments:
            return []

        # Load enrolled speaker profiles
        profiles = db.query(SpeakerProfile).filter(
            SpeakerProfile.org_id == org_id,
            SpeakerProfile.voice_enrolled == True
        ).all()
        name_to_profile = {p.display_name.lower(): p for p in profiles}

        # 1. Check acoustic features if audio file is available
        acoustic_labels = []
        if audio_path and os.path.exists(audio_path):
            acoustic_labels = SpeakerService._extract_acoustic_features(audio_path, segments)

        # 2. Conversational Diarization pass
        current_speaker_idx = 0
        assigned_labels = []
        
        # Self-identification patterns
        self_id_pattern = re.compile(
            r"\b(?:this is|i'm|i am|here is|speaking is)\s+([A-Za-z]+)", re.IGNORECASE
        )

        for i, seg in enumerate(segments):
            text = seg.get("text", "")
            explicit_label = seg.get("speaker_label")

            if explicit_label:
                assigned_labels.append(explicit_label)
                continue

            # Check if text has speaker prefix e.g. "Arun: Hello everyone"
            if ":" in text[:30]:
                prefix, rest = text.split(":", 1)
                prefix_clean = prefix.strip()
                if len(prefix_clean.split()) <= 3 and not prefix_clean.lower().startswith("http"):
                    assigned_labels.append(f"SPEAKER_{prefix_clean.upper()}")
                    seg["text"] = rest.strip()
                    continue

            # Check self-identification
            match = self_id_pattern.search(text)
            if match:
                detected_name = match.group(1).capitalize()
                # Check if matches known participants
                matched_known = next((kp for kp in known_participants if detected_name.lower() in kp.lower()), None)
                if matched_known:
                    idx = known_participants.index(matched_known)
                    current_speaker_idx = idx
                    assigned_labels.append(f"SPEAKER_{idx:02d}")
                    continue

            # Check acoustic cluster
            if acoustic_labels and i < len(acoustic_labels):
                assigned_labels.append(f"SPEAKER_{acoustic_labels[i]:02d}")
                continue

            # Check pause-based turn transition (>1.2s pause between sentences suggests speaker change)
            if i > 0:
                prev_end = segments[i - 1].get("end_time", 0.0)
                cur_start = seg.get("start_time", 0.0)
                if (cur_start - prev_end) > 1.2 and len(known_participants) > 1:
                    current_speaker_idx = (current_speaker_idx + 1) % len(known_participants)

            assigned_labels.append(f"SPEAKER_{current_speaker_idx:02d}")

        # 3. Map speaker labels to participants & enrolled profiles
        unique_labels = sorted(list(set(assigned_labels)))
        label_to_identity = {}
        for idx, lbl in enumerate(unique_labels):
            if idx < len(known_participants):
                name = known_participants[idx]
                prof = name_to_profile.get(name.lower())
                conf = 0.92 if prof else 0.82
                label_to_identity[lbl] = {
                    "name": name,
                    "profile_id": prof.id if prof else None,
                    "confidence": conf,
                    "identified": True
                }
            else:
                label_to_identity[lbl] = {
                    "name": f"Speaker {idx + 1}",
                    "profile_id": None,
                    "confidence": 0.65,
                    "identified": False
                }

        attributed_segments = []
        for i, seg in enumerate(segments):
            lbl = assigned_labels[i]
            identity = label_to_identity.get(lbl, {
                "name": "Speaker 1",
                "profile_id": None,
                "confidence": 0.65,
                "identified": False
            })

            attributed_segments.append({
                **seg,
                "speaker_label": lbl,
                "speaker_name": identity["name"],
                "speaker_profile_id": identity["profile_id"],
                "speaker_confidence": identity["confidence"],
            })

        return attributed_segments

    @staticmethod
    def get_talk_time_distribution(segments: List[Any]) -> Dict[str, float]:
        dist = {}
        for s in segments:
            name = getattr(s, "speaker_name", None) or (s.get("speaker_name") if isinstance(s, dict) else "Unknown")
            start = getattr(s, "start_time", None) or (s.get("start_time", 0) if isinstance(s, dict) else 0)
            end = getattr(s, "end_time", None) or (s.get("end_time", 0) if isinstance(s, dict) else 0)
            dist[name] = dist.get(name, 0.0) + max(0.5, end - start)
        return dist

speaker_service = SpeakerService()
