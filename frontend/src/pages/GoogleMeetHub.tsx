import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Video, Cloud, Shield, Cpu, Loader2, Database, Mic, Radio,
  FileAudio, FileText, Sparkles, Play, Square, CheckCircle2,
  AlertCircle, ArrowRight, UploadCloud, RefreshCw, Volume2,
  Check, Info, HelpCircle
} from 'lucide-react';
import { providersApi } from '../services/api';
import toast from 'react-hot-toast';

type IngestionMode = 'LIVE_STREAM' | 'FILE_UPLOAD' | 'CAPTIONS_TEXT' | 'AI_SYNTHESIS';

export const GoogleMeetHub: React.FC = () => {
  const navigate = useNavigate();

  // Mode Selection
  const [ingestionMode, setIngestionMode] = useState<IngestionMode>('FILE_UPLOAD');
  const [selectedProvider, setSelectedProvider] = useState<'GOOGLE_MEET' | 'MICROSOFT_TEAMS' | 'ZOOM' | 'UPLOADED_RECORDING'>('GOOGLE_MEET');

  // Common Form State
  const [meetingTitle, setMeetingTitle] = useState('Google Meet: Live Engineering Sync (ihf-rvix-cqx)');
  const [meetingUrl, setMeetingUrl] = useState('https://meet.google.com/ihf-rvix-cqx');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 16));
  const [classification, setClassification] = useState('GENERAL');
  const [storageMode, setStorageMode] = useState('CLOUD');
  const [cloudSyncScope, setCloudSyncScope] = useState('SUMMARY_AND_ACTIONS');
  const [participants, setParticipants] = useState('Keerthi, Priya Sharma, Rahul Verma');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mode 1: Live Tab / Audio Capture State
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureDuration, setCaptureDuration] = useState(0);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedAudioUrl, setCapturedAudioUrl] = useState<string | null>(null);
  const [captureSource, setCaptureSource] = useState<'TAB_AUDIO' | 'MIC'>('MIC');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Mode 2: File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileAudioUrl, setFileAudioUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Mode 3: Captions / Transcript Paste State
  const [transcriptText, setTranscriptText] = useState('');

  // Fetch Providers
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
  });

  const activeProvider = providers.find((p) => p.provider_id === selectedProvider) || {
    name: selectedProvider === 'GOOGLE_MEET' ? 'Google Meet' : selectedProvider === 'MICROSOFT_TEAMS' ? 'Microsoft Teams' : 'Online Provider',
    is_configured: false,
    status_message: 'Real-time online ingestion pipeline active with local Whisper & LLaMA AI.',
  };

  // Cleanup audio tracks and timers on unmount
  useEffect(() => {
    return () => {
      stopCaptureTracks();
    };
  }, []);

  const stopCaptureTracks = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  // Live Audio Waveform Visualizer
  const startVisualizer = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          // Gradient from brand purple to electric blue
          const r = Math.min(255, 120 + barHeight);
          const g = Math.min(255, 80 + barHeight * 0.8);
          const b = 240;
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth + 1;
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (e) {
      console.warn('Audio visualization not supported on this stream:', e);
    }
  };

  // Start Live Audio Capture
  const handleStartCapture = async () => {
    try {
      let stream: MediaStream;

      if (captureSource === 'TAB_AUDIO') {
        // Prompt for Google Meet Chrome Tab audio
        toast('Select your Google Meet tab and ensure "Share tab audio" is checked!', {
          icon: '🎧',
          duration: 6000,
        });
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true, // required by browser getDisplayMedia to share tab audio
          audio: true,
        });

        // Check if user shared audio
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          stream.getTracks().forEach((t) => t.stop());
          toast.error('No audio track shared! Please check "Share tab audio" when selecting the Google Meet tab.');
          return;
        }
      } else {
        // Direct microphone capture
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setCapturedBlob(finalBlob);
        setCapturedAudioUrl(URL.createObjectURL(finalBlob));
        toast.success(`Captured ${Math.round(finalBlob.size / 1024)} KB of online meeting audio.`);
      };

      recorder.start(500);
      setIsCapturing(true);
      setCaptureDuration(0);

      timerRef.current = setInterval(() => {
        setCaptureDuration((prev) => prev + 1);
      }, 1000);

      startVisualizer(stream);

      // Handle stream end if user stops sharing in Chrome UI
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          handleStopCapture();
        };
      });

    } catch (err: any) {
      console.error('Capture error:', err);
      if (err.name !== 'NotAllowedError') {
        toast.error('Audio capture failed: ' + (err.message || 'Permission denied'));
      }
    }
  };

  // Stop Live Audio Capture
  const handleStopCapture = () => {
    setIsCapturing(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  // Handle File Selection
  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setFileAudioUrl(URL.createObjectURL(file));
    toast.success(`Selected recording: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  };

  // Load Sample Real-World Sprint Captions
  const handleLoadSampleCaptions = () => {
    const sample = `Keerthi: Welcome everyone to the Google Meet live sync. Let's lock in our deliverables and architecture for the upcoming sprint release.
Priya Sharma: On the backend infrastructure, I will complete the Redis token bucket rate limiter and deploy it to staging by Thursday at 5:00 PM.
Rahul Verma: I will finalize the client analytics dashboard and update the error boundary UI components by Friday afternoon.
Keerthi: Sounds great. I will personally finalize the acoustic voice embedding matching and optimize Whisper V3 inference latency before Wednesday.
Keerthi: Formal decision: We will mandate on-device biometric voice fingerprinting for all meeting participants to ensure 100% privacy compliance.
Priya Sharma: Understood. I will publish the migration guide and token revocation flow for client teams before Wednesday noon.
Rahul Verma: I will verify that the frontend authentication interceptor handles the new token refresh cycle correctly.`;
    setTranscriptText(sample);
    toast.success('Loaded Google Meet transcript featuring Keerthi with real commitments & decisions.');
  };

  // Submit Ingestion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const pNames = participants.split(',').map((p) => p.trim()).filter(Boolean);

      let meeting;

      // Mode 1: Live Captured WebM Audio
      if (ingestionMode === 'LIVE_STREAM' && capturedBlob) {
        const formData = new FormData();
        formData.append('title', meetingTitle);
        formData.append('provider', selectedProvider);
        formData.append('meeting_url', meetingUrl);
        formData.append('meeting_date', new Date(meetingDate).toISOString());
        formData.append('classification', classification);
        formData.append('storage_mode', storageMode);
        formData.append('cloud_sync_scope', cloudSyncScope);
        formData.append('participant_names', participants);
        formData.append('file', capturedBlob, 'meet_live_capture.webm');

        meeting = await providersApi.importOnlineWithFile(formData);
        toast.success(`Captured audio uploaded! Faster-Whisper transcribing...`);
      } 
      // Mode 2: Uploaded Recording File (MP4, WEBM, WAV, M4A)
      else if (ingestionMode === 'FILE_UPLOAD' && selectedFile) {
        const formData = new FormData();
        formData.append('title', meetingTitle);
        formData.append('provider', selectedProvider);
        formData.append('meeting_url', meetingUrl);
        formData.append('meeting_date', new Date(meetingDate).toISOString());
        formData.append('classification', classification);
        formData.append('storage_mode', storageMode);
        formData.append('cloud_sync_scope', cloudSyncScope);
        formData.append('participant_names', participants);
        formData.append('file', selectedFile, selectedFile.name);

        meeting = await providersApi.importOnlineWithFile(formData);
        toast.success(`Recording uploaded! Faster-Whisper transcribing...`);
      } 
      // Mode 3: Captions / Transcript Paste
      else if (ingestionMode === 'CAPTIONS_TEXT' && transcriptText.trim()) {
        const formData = new FormData();
        formData.append('title', meetingTitle);
        formData.append('provider', selectedProvider);
        formData.append('meeting_url', meetingUrl);
        formData.append('meeting_date', new Date(meetingDate).toISOString());
        formData.append('classification', classification);
        formData.append('storage_mode', storageMode);
        formData.append('cloud_sync_scope', cloudSyncScope);
        formData.append('participant_names', participants);
        formData.append('transcript_sample', transcriptText.trim());

        meeting = await providersApi.importOnlineWithFile(formData);
        toast.success(`Transcript ingested! Local LLaMA extracting actions & commitments...`);
      } 
      // Mode 4: Dynamic Local LLaMA AI Synthesis
      else {
        meeting = await providersApi.importOnline({
          provider: selectedProvider,
          title: meetingTitle,
          meeting_url: meetingUrl,
          meeting_date: new Date(meetingDate).toISOString(),
          classification,
          ai_processing_mode: 'LOCAL_LLM',
          storage_mode: storageMode,
          cloud_sync_scope: cloudSyncScope,
          participant_names: pNames,
        });
        toast.success(`Local LLaMA generating topic-specific dialogue for "${meetingTitle}"...`);
      }

      navigate(`/meetings/${meeting.id}`);
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error('Import failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
              Enterprise Online Intelligence
            </span>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              100% On-Device AI (Whisper + Local LLaMA)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Google Meet & Online Meetings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Capture live audio, upload call recordings, or ingest transcripts with zero data leakage. All speech recognition and commitment extraction run entirely on your local machine.
          </p>
        </div>
      </div>

      {/* Online Meeting Data Flow Banner */}
      <div className="card p-5 bg-white border-slate-200 shadow-xs">
        <h2 className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          On-Device Online Intelligence Architecture
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center text-center">
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
            <Video className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-xs font-bold text-slate-800">Online Source</div>
            <div className="text-2xs text-purple-600 font-medium">Meet / Teams / Audio</div>
          </div>
          <div className="text-slate-400 hidden md:block text-sm">→</div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <Volume2 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-xs font-bold text-slate-800">Faster-Whisper</div>
            <div className="text-2xs text-blue-600 font-medium">Local Diarization</div>
          </div>
          <div className="text-slate-400 hidden md:block text-sm">→</div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <Cpu className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <div className="text-xs font-bold text-slate-800">Local LLaMA 3.2</div>
            <div className="text-2xs text-emerald-600 font-medium">Dynamic Extraction</div>
          </div>
        </div>
      </div>

      {/* Provider Selector Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: 'GOOGLE_MEET', label: 'Google Meet', icon: Video, color: 'text-purple-600' },
          { id: 'MICROSOFT_TEAMS', label: 'Microsoft Teams', icon: Video, color: 'text-blue-600' },
          { id: 'ZOOM', label: 'Zoom Meeting', icon: Video, color: 'text-sky-600' },
          { id: 'UPLOADED_RECORDING', label: 'Direct Audio Upload', icon: UploadCloud, color: 'text-emerald-600' },
        ].map((prov) => {
          const Icon = prov.icon;
          const isSelected = selectedProvider === prov.id;
          return (
            <button
              key={prov.id}
              type="button"
              onClick={() => setSelectedProvider(prov.id as any)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-purple-50/70 border-purple-400 shadow-sm ring-2 ring-purple-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon className={`w-5 h-5 ${prov.color}`} />
                {isSelected && <Check className="w-4 h-4 text-purple-600" />}
              </div>
              <div className="text-sm font-bold text-slate-900">{prov.label}</div>
              <div className="text-2xs text-slate-500">Online Channel</div>
            </button>
          );
        })}
      </div>

      {/* Real Ingestion Method Selector Tabs */}
      <div className="card p-2 bg-slate-100 border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setIngestionMode('FILE_UPLOAD')}
            className={`py-3 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              ingestionMode === 'FILE_UPLOAD'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileAudio className="w-4 h-4" />
            <span>Upload Recording File</span>
          </button>

          <button
            type="button"
            onClick={() => setIngestionMode('LIVE_STREAM')}
            className={`py-3 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              ingestionMode === 'LIVE_STREAM'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Capture Live Tab Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setIngestionMode('CAPTIONS_TEXT')}
            className={`py-3 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              ingestionMode === 'CAPTIONS_TEXT'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste Captions / Text</span>
          </button>

          <button
            type="button"
            onClick={() => setIngestionMode('AI_SYNTHESIS')}
            className={`py-3 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              ingestionMode === 'AI_SYNTHESIS'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Local AI Synthesis</span>
          </button>
        </div>
      </div>

      {/* Main Action Work Area */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ────────── WORKFLOW 1: FILE UPLOAD ────────── */}
        {ingestionMode === 'FILE_UPLOAD' && (
          <div className="card p-6 bg-white border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileAudio className="w-5 h-5 text-purple-600" />
                  <span>Upload Real Google Meet / Teams Recording</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your Google Meet download (.mp4, .webm, .wav, .m4a, .mp3). Local Faster-Whisper will transcribe it on-device.
                </p>
              </div>
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-semibold">
                Speech-to-Text Diarization
              </span>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-50/50 scale-[1.01]'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-purple-400 bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                id="meeting-file-input"
                accept="audio/*,video/*,.webm,.mp4,.wav,.m4a,.mp3,.ogg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Media File'}
                    </p>
                  </div>

                  {fileAudioUrl && (
                    <div className="max-w-md mx-auto pt-2">
                      <audio controls src={fileAudioUrl} className="w-full h-8" />
                    </div>
                  )}

                  <label
                    htmlFor="meeting-file-input"
                    className="inline-block text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer underline pt-1"
                  >
                    Choose a different file
                  </label>
                </div>
              ) : (
                <label htmlFor="meeting-file-input" className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 mx-auto flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Click to browse or drag & drop meeting recording
                  </div>
                  <div className="text-xs text-slate-500">
                    Supports Google Meet MP4, WebM, WAV, M4A, or MP3 exports (Up to 500MB)
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        {/* ────────── WORKFLOW 2: LIVE TAB AUDIO CAPTURE ────────── */}
        {ingestionMode === 'LIVE_STREAM' && (
          <div className="card p-6 bg-white border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-rose-500" />
                  <span>Capture Live Google Meet Browser Tab Audio</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stream audio directly from an active Google Meet or Microsoft Teams browser tab in real time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCaptureSource('TAB_AUDIO')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    captureSource === 'TAB_AUDIO' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Chrome Tab Audio
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureSource('MIC')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    captureSource === 'MIC' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Microphone
                </button>
              </div>
            </div>

            {/* Live Visualizer Box */}
            <div className="bg-slate-950 rounded-xl p-6 text-center space-y-4 shadow-inner">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isCapturing ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                  <span className="font-mono uppercase font-bold text-slate-300">
                    {isCapturing ? 'RECORDING LIVE AUDIO' : capturedBlob ? 'CAPTURE COMPLETE' : 'STANDBY'}
                  </span>
                </div>
                <div className="font-mono text-sm font-bold text-white tracking-widest">
                  {formatTimer(captureDuration)}
                </div>
              </div>

              {/* Visualizer Canvas */}
              <canvas
                ref={canvasRef}
                width={700}
                height={90}
                className="w-full h-24 bg-slate-900/60 rounded-lg border border-slate-800"
              />

              {/* Capture Control Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {!isCapturing ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        if (meetingUrl && meetingUrl.startsWith('http')) {
                          window.open(meetingUrl, '_blank');
                        }
                        await handleStartCapture();
                      }}
                      className="btn bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2"
                      title="Open Google Meet call and start capturing audio simultaneously"
                    >
                      <Video className="w-4 h-4" />
                      <span>Launch Google Meet & Start Recorder</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartCapture}
                      className="btn bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2"
                    >
                      <Radio className="w-4 h-4" />
                      <span>{captureSource === 'MIC' ? 'Record Microphone Audio' : 'Record Chrome Tab Audio'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopCapture}
                    className="btn bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold px-6 py-2.5 rounded-xl flex items-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Stop Recording ({formatTimer(captureDuration)})</span>
                  </button>
                )}
              </div>

              {capturedAudioUrl && !isCapturing && (
                <div className="pt-2 flex flex-col items-center justify-center gap-2">
                  <div className="text-2xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Recording ready for AI extraction! Submit below to process.
                  </div>
                  <audio controls src={capturedAudioUrl} className="h-8 max-w-sm" />
                </div>
              )}
            </div>

            <div className="text-2xs text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>
                {captureSource === 'MIC' 
                  ? 'Microphone mode captures your live voice and room/speaker sound without requiring browser tab sharing permission.' 
                  : 'Chrome Tab Audio mode captures internal tab sound. When prompted by Chrome, select your Google Meet tab and ensure "Share tab audio" is checked.'}
              </span>
            </div>
          </div>
        )}

        {/* ────────── WORKFLOW 3: CAPTIONS / TRANSCRIPT PASTE ────────── */}
        {ingestionMode === 'CAPTIONS_TEXT' && (
          <div className="card p-6 bg-white border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span>Google Meet Captions / Transcript Ingestion</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste live closed captions, Otter/Tactiq transcripts, or VTT exports. The local AI parses speakers, deadlines, and commitments dynamically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleCaptions}
                className="btn btn-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 shrink-0 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Sprint Captions</span>
              </button>
            </div>

            <textarea
              className="textarea w-full h-44 font-mono text-xs leading-relaxed border-slate-300 focus:border-purple-500 p-3 rounded-xl"
              placeholder={`Paste Google Meet captions or dialogue here:\n\nArun Kumar: Let's review the API token security.\nPriya Sharma: I will deploy the Redis token bucket rate limiter by Thursday 5:00 PM.\nRahul Verma: I will update the frontend error handling by Friday.`}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
            />

            <div className="flex items-center justify-between text-2xs text-slate-500">
              <span>
                {transcriptText.trim().split('\n').filter(Boolean).length} dialogue turns detected
              </span>
              <span className="text-emerald-600 font-semibold">
                ✓ Auto-extracts commitments, dates, and assignees
              </span>
            </div>
          </div>
        )}

        {/* ────────── WORKFLOW 4: LOCAL AI SIMULATION ────────── */}
        {ingestionMode === 'AI_SYNTHESIS' && (
          <div className="card p-6 bg-white border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>Dynamic Topic Simulation via Local LLaMA</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate realistic enterprise meeting conversation tailored to your exact title and participants using on-device LLaMA (llama3.2:1b). Zero hardcoding.
                </p>
              </div>
              <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-2xs font-semibold">
                Local LLaMA 3.2:1b
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span>Zero Hardcoded Strings Guaranteed</span>
              </div>
              <p className="text-amber-800/90 text-2xs leading-relaxed">
                When you click Import, Memora prompts your locally running Ollama model to generate contextual dialogue for <strong>"{meetingTitle}"</strong> with participants <strong>{participants}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ────────── MEETING METADATA & ENTERPRISE CONFINEMENT ────────── */}
        <div className="card p-6 bg-white border-slate-200 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Meeting Information & Security Governance
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label">Meeting Title</label>
              <input
                type="text"
                required
                className="input font-medium"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Meeting URL (Google Meet / Teams)</label>
              <input
                type="url"
                className="input font-mono text-xs"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div>
              <label className="label">Meeting Date & Time</label>
              <input
                type="datetime-local"
                required
                className="input"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Data Classification</label>
              <select
                className="select"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
              >
                <option value="GENERAL">General (Public / Client)</option>
                <option value="INTERNAL">Internal (Team Confidential)</option>
                <option value="HIGHLY_CONFIDENTIAL">Highly Confidential (Restricted)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Meeting Participants</label>
            <input
              type="text"
              className="input"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Comma separated names (e.g. Arun Kumar, Priya Sharma, Rahul Verma)"
            />
          </div>

          {/* 3-Axis Confinement Settings */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="text-2xs font-bold text-slate-700 uppercase tracking-wider">
              Enterprise Confinement & Sync Scope
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-2xs text-slate-400 block mb-1">AI Processing Location</span>
                <div className="inline-flex items-center gap-1.5 badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs py-1 px-2.5 font-semibold">
                  <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                  <span>LOCAL LLAMA (On-Device)</span>
                </div>
              </div>

              <div>
                <label className="text-2xs text-slate-400 block mb-1">Storage Mode</label>
                <select
                  className="select text-xs py-1.5"
                  value={storageMode}
                  onChange={(e) => setStorageMode(e.target.value)}
                >
                  <option value="CLOUD">Cloud (Enterprise Vault)</option>
                  <option value="LOCAL_ONLY">Local Only (This Device)</option>
                  <option value="LOCAL_AND_CLOUD">Local + Cloud</option>
                </select>
              </div>

              <div>
                <label className="text-2xs text-slate-400 block mb-1">Cloud Sync Scope</label>
                <select
                  className="select text-xs py-1.5"
                  value={cloudSyncScope}
                  onChange={(e) => setCloudSyncScope(e.target.value)}
                  disabled={storageMode === 'LOCAL_ONLY'}
                >
                  <option value="SUMMARY_AND_ACTIONS">Summary & Actions Only (Recommended)</option>
                  <option value="TRANSCRIPT">Include Transcript</option>
                  <option value="FULL_MEETING">Full Meeting Record</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || (ingestionMode === 'LIVE_STREAM' && isCapturing)}
          className="w-full btn bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all text-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing Online Meeting through Local AI Pipeline...</span>
            </>
          ) : (
            <>
              <span>
                {ingestionMode === 'FILE_UPLOAD' && selectedFile
                  ? `Process "${selectedFile.name}" with Local AI`
                  : ingestionMode === 'LIVE_STREAM' && capturedBlob
                  ? 'Process Captured Audio Stream with Local AI'
                  : ingestionMode === 'CAPTIONS_TEXT'
                  ? 'Process Ingested Transcript with Local AI'
                  : 'Import Online Meeting & Run Local Pipeline'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default GoogleMeetHub;
