// Speakers Page — Voice Enrollment & Acoustic Biometrics Hub
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Mic, MicOff, CheckCircle, XCircle, Play, Square,
  Upload, Trash2, Volume2, Sparkles, AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { speakersApi } from '../services/api';
import type { Speaker } from '../types';

export default function SpeakersPage() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ display_name: '', employee_id: '', department: '', role_title: '' });
  
  // Voice Enrollment Modal State
  const [enrollingSpeaker, setEnrollingSpeaker] = useState<Speaker | null>(null);
  const [activeTab, setActiveTab] = useState<'RECORD' | 'UPLOAD'>('RECORD');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Playing enrolled sample
  const [playingSpeakerId, setPlayingSpeakerId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const qc = useQueryClient();

  const { data: speakers = [], isLoading } = useQuery({
    queryKey: ['speakers'],
    queryFn: speakersApi.list,
  });

  const createMutation = useMutation({
    mutationFn: speakersApi.create,
    onSuccess: (newSp) => {
      qc.invalidateQueries({ queryKey: ['speakers'] });
      setShowNew(false);
      setForm({ display_name: '', employee_id: '', department: '', role_title: '' });
      toast.success('Speaker profile created');
      // Automatically prompt to enroll voice for this new speaker!
      setEnrollingSpeaker(newSp);
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async ({ speakerId, blob }: { speakerId: string; blob: Blob }) => {
      return speakersApi.enrollVoice(speakerId, blob, `speaker_${speakerId}.webm`);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['speakers'] });
      toast.success(`Voice profile calibrated for ${updated.display_name}!`);
      closeEnrollModal();
    },
    onError: (err: any) => {
      toast.error('Failed to enroll voice: ' + (err.response?.data?.detail || err.message));
    },
  });

  const resetMutation = useMutation({
    mutationFn: (speakerId: string) => speakersApi.deleteEnrollment(speakerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['speakers'] });
      toast.success('Voice enrollment reset');
    },
  });

  // Start live microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio visualizer setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      drawWaveform();

      // MediaRecorder setup
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      toast.error('Could not access microphone: ' + err.message);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  // Draw waveform
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(99, 102, 241)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    render();
  };

  const closeEnrollModal = () => {
    stopRecording();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setEnrollingSpeaker(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadedFile(null);
    setRecordSeconds(0);
  };

  const handleConfirmEnrollment = () => {
    if (!enrollingSpeaker) return;
    const blobToSubmit = activeTab === 'RECORD' ? audioBlob : uploadedFile;
    if (!blobToSubmit) {
      toast.error('Please record or upload an audio sample first');
      return;
    }
    enrollMutation.mutate({ speakerId: enrollingSpeaker.id, blob: blobToSubmit });
  };

  const playEnrolledSample = (speakerId: string) => {
    if (playingSpeakerId === speakerId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setPlayingSpeakerId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const token = localStorage.getItem('meetguard_token');
    const url = speakersApi.getVoiceSampleUrl(speakerId);
    
    // Fetch with auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('Voice sample unavailable');
        return res.blob();
      })
      .then((blob) => {
        const objUrl = URL.createObjectURL(blob);
        const player = new Audio(objUrl);
        audioPlayerRef.current = player;
        setPlayingSpeakerId(speakerId);
        player.play();
        player.onended = () => {
          setPlayingSpeakerId(null);
          URL.revokeObjectURL(objUrl);
        };
      })
      .catch((err) => {
        toast.error('Could not play voice sample: ' + err.message);
        setPlayingSpeakerId(null);
      });
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold">
              Acoustic Biometrics
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">Zero-Shot Diarization Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Speaker Profiles & Voice Enrollment
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Initialize and calibrate voice profiles for 100% accurate acoustic speaker identification during local meetings.
          </p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add New Speaker
        </button>
      </div>

      {/* Info Card Banner */}
      <div className="card p-5 bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-blue-200/70 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">How Voice Calibration Works</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Recording a 5-10 second voice sample extracts spectral centroid, pitch, and timbre acoustic signatures. 
              During meetings, Memora AI compares active speech against these enrolled acoustic vectors, automatically attributing statements with 95%+ confidence without cloud leaks.
            </p>
          </div>
        </div>
      </div>

      {/* New Speaker Creation Drawer */}
      {showNew && (
        <div className="card p-6 border-slate-300 shadow-sm bg-white animate-fade">
          <h3 className="text-base font-bold text-slate-900 mb-4">Create New Speaker Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input
                className="input font-semibold"
                placeholder="e.g. Arun Kumar"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Employee ID</label>
              <input
                className="input"
                placeholder="e.g. EMP-104"
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Department</label>
              <input
                className="input"
                placeholder="e.g. Engineering"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Role Title</label>
              <input
                className="input"
                placeholder="e.g. Staff Architect"
                value={form.role_title}
                onChange={(e) => setForm({ ...form, role_title: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button
              className="btn-primary"
              disabled={createMutation.isPending || !form.display_name.trim()}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? 'Creating…' : 'Create & Proceed to Voice Enrollment'}
            </button>
            <button className="btn-secondary" onClick={() => setShowNew(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Speakers Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-56 space-y-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading speaker biometric profiles…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {speakers.map((s) => (
            <div
              key={s.id}
              className={`card p-5 transition-all duration-200 border ${
                s.voice_enrolled
                  ? 'border-slate-200 bg-white shadow-xs hover:shadow-md'
                  : 'border-amber-300/80 bg-amber-50/20 shadow-xs hover:border-amber-400'
              }`}
            >
              {/* Profile Card Header */}
              <div className="flex items-start gap-3.5 mb-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-extrabold flex-shrink-0 ${
                    s.voice_enrolled
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {s.display_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 truncate text-base">{s.display_name}</h3>
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {s.role_title || 'Team Member'}
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">
                    {s.department || 'General'} {s.employee_id && `• ID: ${s.employee_id}`}
                  </div>
                </div>
              </div>

              {/* Enrollment Status Indicator */}
              <div className="py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-between text-xs my-3">
                <span className="text-slate-500 font-medium">Voice Signature</span>
                {s.voice_enrolled ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-2xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Enrolled & Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-700 font-semibold text-2xs bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Pending Voice Sample
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                {s.voice_enrolled ? (
                  <>
                    <button
                      onClick={() => playEnrolledSample(s.id)}
                      className="btn-secondary btn-sm flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-700"
                    >
                      {playingSpeakerId === s.id ? (
                        <>
                          <Square className="w-3.5 h-3.5 text-red-600" /> Stop Preview
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-brand-600" /> Listen Voice
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setEnrollingSpeaker(s)}
                      className="btn-secondary btn-sm flex items-center justify-center gap-1 text-xs text-slate-600 hover:text-brand-600"
                      title="Re-record or update sample"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-record
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEnrollingSpeaker(s)}
                    className="w-full btn-primary btn-sm flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-2 shadow-xs"
                  >
                    <Mic className="w-4 h-4 animate-pulse" />
                    Initialize Voice Sample
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Voice Enrollment & Calibration Modal */}
      {enrollingSpeaker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade">
          <div className="card w-full max-w-lg bg-white border-slate-200 shadow-2xl p-6 md:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-150 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Voice Calibration: {enrollingSpeaker.display_name}
                  </h2>
                  <p className="text-xs text-slate-500">Record a brief 5-10s sample to enroll biometric voice vector.</p>
                </div>
              </div>
              <button
                onClick={closeEnrollModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Calibration Prompt Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="text-2xs font-bold text-brand-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Voice Calibration Script
              </div>
              <p className="text-sm font-medium text-slate-800 italic leading-relaxed">
                "Hello, I am {enrollingSpeaker.display_name}. This audio sample calibrates my voice signature in Memora AI for automated meeting speaker attribution."
              </p>
            </div>

            {/* Input Selection Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => {
                  stopRecording();
                  setActiveTab('RECORD');
                }}
                className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'RECORD'
                    ? 'border-brand-600 text-brand-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Mic className="w-4 h-4" /> Live Microphone
              </button>
              <button
                onClick={() => {
                  stopRecording();
                  setActiveTab('UPLOAD');
                }}
                className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'UPLOAD'
                    ? 'border-brand-600 text-brand-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Upload className="w-4 h-4" /> Upload Audio File
              </button>
            </div>

            {/* TAB 1: Live Microphone Recording */}
            {activeTab === 'RECORD' && (
              <div className="space-y-4 text-center py-2">
                {/* Visualizer Waveform Canvas */}
                <div className="w-full h-24 bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-800">
                  <canvas ref={canvasRef} width={400} height={96} className="w-full h-full" />
                  {!isRecording && !audioUrl && (
                    <div className="absolute text-xs text-slate-400 flex items-center gap-1.5">
                      <Mic className="w-4 h-4" /> Click record and read the script above
                    </div>
                  )}
                  {isRecording && (
                    <div className="absolute top-2 right-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-mono font-bold text-red-400">
                        00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds}
                      </span>
                    </div>
                  )}
                </div>

                {/* Record Controls */}
                <div className="flex items-center justify-center gap-4 pt-1">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all"
                    >
                      <Mic className="w-4 h-4" /> Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all animate-pulse"
                    >
                      <Square className="w-4 h-4 text-red-400" /> Stop & Process Sample
                    </button>
                  )}
                </div>

                {/* Audio Preview if Recorded */}
                {audioUrl && !isRecording && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1.5 mt-2">
                    <span className="text-2xs font-bold text-slate-600 uppercase tracking-wider">
                      Recorded Sample Preview
                    </span>
                    <audio controls src={audioUrl} className="w-full h-9" />
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: File Upload */}
            {activeTab === 'UPLOAD' && (
              <div className="space-y-4 py-2">
                <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center block cursor-pointer bg-slate-50/50 transition-all">
                  <Upload className="w-8 h-8 text-brand-600 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-800">
                    {uploadedFile ? uploadedFile.name : 'Select or Drop Audio File'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Supports WAV, MP3, M4A, WEBM (up to 25MB)</div>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedFile(file);
                        const url = URL.createObjectURL(file);
                        setAudioUrl(url);
                      }
                    }}
                  />
                </label>

                {audioUrl && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="text-2xs font-bold text-slate-600 uppercase tracking-wider">
                      Uploaded File Preview
                    </span>
                    <audio controls src={audioUrl} className="w-full h-9" />
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-150">
              <button onClick={closeEnrollModal} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleConfirmEnrollment}
                disabled={enrollMutation.isPending || (!audioBlob && !uploadedFile)}
                className="btn-primary flex items-center gap-2"
              >
                {enrollMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting Acoustic Embeddings…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save & Enroll Voice Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
