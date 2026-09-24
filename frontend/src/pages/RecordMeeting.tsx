import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, Square, Pause, Play, X, Shield, Lock, 
  Users, CheckCircle2, AlertCircle, ArrowRight, Loader2
} from 'lucide-react';
import { meetingsApi } from '../services/api';
import toast from 'react-hot-toast';

export const RecordMeeting: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [meetingTitle, setMeetingTitle] = useState('Executive Board Strategy & Audit');
  const [classification, setClassification] = useState('HIGHLY_CONFIDENTIAL');
  const [participantsText, setParticipantsText] = useState('Arun Kumar, Priya Sharma, Rahul Verma');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Live transcript simulation during recording
  const [liveTranscript, setLiveTranscript] = useState<Array<{ speaker: string; text: string; time: string }>>([]);

  // Refs for media recording and audio context
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Web Audio API Analyser for Waveform
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      drawWaveform();
      toast.success('Local recording started. Audio remains strictly on device.');

    } catch (err: any) {
      console.warn('Microphone access denied or simulated:', err);
      // Fallback: simulated recording if hardware mic permission denied in sandbox
      setIsRecording(true);
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      drawSimulatedWaveform();
      toast('Simulated local recording active (Hardware mic unavailable).', { icon: '🎙️' });
    }
  };

  // Live visual waveform loop
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
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
        // Gradient color for bars
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#2563eb');
        grad.addColorStop(1, '#60a5fa');

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };
    render();
  };

  // Simulated visual waveform if no mic
  const drawSimulatedWaveform = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const numBars = 32;
      const barWidth = canvas.width / numBars;

      for (let i = 0; i < numBars; i++) {
        const randomFactor = Math.sin(Date.now() / 200 + i * 0.4) * 0.5 + 0.5;
        const barHeight = randomFactor * canvas.height * 0.75 + 5;

        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#2563eb');
        grad.addColorStop(1, '#a855f7');

        ctx.fillStyle = grad;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 3, barHeight);
      }
    };
    render();
  };

  // Pause / Resume
  const togglePause = () => {
    if (!isRecording) return;
    if (isPaused) {
      mediaRecorderRef.current?.resume();
      timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
      setIsPaused(false);
      toast('Recording resumed');
    } else {
      mediaRecorderRef.current?.pause();
      clearInterval(timerRef.current);
      setIsPaused(true);
      toast('Recording paused');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // simulated blob
      setAudioBlob(new Blob(['simulated-audio-data'], { type: 'audio/webm' }));
    }
    clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsRecording(false);
    setIsPaused(false);
    toast.success('Recording finished. Ready for local AI processing.');
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsRecording(false);
    setIsPaused(false);
    setAudioBlob(null);
    setDuration(0);
    toast('Recording cancelled.');
  };

  // Process meeting with Local AI
  const handleProcessMeeting = async () => {
    setIsProcessing(true);
    try {
      const pNames = participantsText.split(',').map((p) => p.trim()).filter(Boolean);
      
      // 1. Create Meeting in DB
      const meeting = await meetingsApi.create({
        title: meetingTitle,
        meeting_date: new Date().toISOString(),
        classification,
        storage_policy: 'LOCAL_ONLY',
        storage_mode: 'LOCAL_ONLY',
        meeting_source: 'OFFLINE_RECORDING',
        ai_processing_mode: 'LOCAL_LLM',
        participant_names: pNames,
      });

      // 2. Upload audio if blob present
      if (audioBlob) {
        await meetingsApi.uploadAudioBlob(meeting.id, audioBlob, 'live_microphone.webm');
      }

      // 3. Trigger processing pipeline
      await meetingsApi.process(meeting.id);

      toast.success('Local AI processing pipeline started!');
      navigate(`/meetings/${meeting.id}`);
    } catch (err: any) {
      toast.error('Failed to process meeting: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner / Privacy Alert */}
      <div className="flex items-center justify-between bg-surface-900 border border-surface-700 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Local Physical Meeting Recording</span>
              <span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-2xs">
                🔒 LOCAL CONFINEMENT
              </span>
            </div>
            <p className="text-xs text-surface-400">
              Audio stream is processed exclusively in host memory and stored in the local MeetGuardData repository.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-surface-400 block font-mono">Classification</span>
          <span className="badge badge-confidential text-2xs">{classification.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Recording Stage Card */}
      <div className="card p-6 md:p-8 space-y-6 border-surface-700">
        {/* Meeting Metadata Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Meeting Title</label>
            <input
              type="text"
              className="input font-semibold"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              disabled={isRecording}
            />
          </div>
          <div>
            <label className="label">Meeting Classification</label>
            <select
              className="select"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              disabled={isRecording}
            >
              <option value="HIGHLY_CONFIDENTIAL">Highly Confidential (Local Only)</option>
              <option value="INTERNAL">Internal (Company Confidential)</option>
              <option value="GENERAL">General (Operational)</option>
            </select>
          </div>
        </div>

        {/* Participants Input */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-brand-400" />
            Expected Participants (for voice recognition attribution)
          </label>
          <input
            type="text"
            className="input"
            value={participantsText}
            onChange={(e) => setParticipantsText(e.target.value)}
            disabled={isRecording}
            placeholder="e.g. Arun Kumar, Priya Sharma, Rahul Verma"
          />
        </div>

        {/* Visualizer & Recording Display */}
        <div className="bg-surface-950 border border-surface-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
          {/* Status Indicator & Timer */}
          <div className="flex items-center justify-between w-full px-2">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isRecording ? (isPaused ? 'bg-amber-400' : 'bg-red-500 animate-pulse') : 'bg-surface-600'}`} />
              <span className="text-xs font-semibold text-surface-300">
                {isRecording ? (isPaused ? 'PAUSED' : 'RECORDING LIVE') : (audioBlob ? 'RECORDING COMPLETE' : 'STANDBY')}
              </span>
            </div>

            <div className="font-mono text-3xl font-extrabold text-white tracking-wider">
              {formatTime(duration)}
            </div>

            <div className="flex items-center gap-1 text-2xs text-surface-400">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Zero-Cloud Storage</span>
            </div>
          </div>

          {/* Waveform Canvas */}
          <div className="w-full h-24 bg-surface-900/60 rounded-xl overflow-hidden border border-surface-800 flex items-center justify-center">
            {isRecording ? (
              <canvas ref={canvasRef} width={600} height={96} className="w-full h-full" />
            ) : audioBlob ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Audio captured ({formatTime(duration)}). Ready to transcribe.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-surface-500 text-sm">
                <Mic className="w-4 h-4" />
                <span>Click "Start Local Recording" when ready to begin meeting</span>
              </div>
            )}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {!isRecording && !audioBlob && (
            <button
              onClick={startRecording}
              className="btn-primary px-8 py-3.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/20 hover:scale-105 transition-all"
            >
              <Mic className="w-5 h-5 text-white" />
              <span>Start Local Recording</span>
            </button>
          )}

          {isRecording && (
            <>
              <button
                onClick={togglePause}
                className="btn bg-surface-700 hover:bg-surface-600 text-white px-5 py-3 rounded-xl flex items-center gap-2"
              >
                {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={stopRecording}
                className="btn bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Recording</span>
              </button>

              <button
                onClick={cancelRecording}
                className="btn bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white px-4 py-3 rounded-xl flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </>
          )}

          {audioBlob && !isRecording && (
            <div className="flex items-center gap-3 w-full justify-between">
              <button
                onClick={cancelRecording}
                className="btn bg-surface-800 hover:bg-surface-700 text-surface-300 px-4 py-2.5 rounded-lg text-sm"
              >
                Discard & Re-record
              </button>

              <button
                onClick={handleProcessMeeting}
                disabled={isProcessing}
                className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/25"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing with Local AI...</span>
                  </>
                ) : (
                  <>
                    <span>Process Meeting with Local Llama</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default RecordMeeting;
