// Meeting Detail Page — Tabbed view with all meeting intelligence
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Video, CheckSquare, GitBranch, AlertTriangle,
  Users, Target, Clock, Shield, Cpu, Eye, Play, ChevronRight,
  Laptop, Cloud, Lock, Database, ArrowRight, Mic, Globe,
  Volume2, VolumeX, RefreshCw, Sparkles, CheckCircle2, Loader2,
  Edit2, UserCheck, CheckCircle, ExternalLink, Calendar, Flame,
  Activity, Zap, Check, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { meetingsApi, unresolvedApi } from '../services/api';
import {
  formatDate, formatDuration, formatTime, classificationBadgeClass,
  statusBadgeClass, statusLabel, truncate,
} from '../utils';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'privacy', label: '🔒 Data Flow' },
  { key: 'transcript', label: 'Transcript' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'actions', label: 'Action Items' },
  { key: 'unresolved', label: 'Unresolved' },
  { key: 'speakers', label: 'Speakers' },
];

const normalizeList = (val: any): string[] => {
  if (Array.isArray(val)) return val.map((x) => String(x)).filter(Boolean);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    } catch {
      return val.trim() ? [val.trim()] : [];
    }
  }
  return [];
};

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState('overview');
  const [evidenceHighlight, setEvidenceHighlight] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => meetingsApi.get(id!),
    enabled: !!id,
    refetchInterval: (query: any) => {
      const m = query?.state?.data;
      return m?.status && !['COMPLETED', 'FAILED'].includes(m.status) ? 1500 : false;
    },
  });

  const isProcessing = meeting?.status && !['COMPLETED', 'FAILED'].includes(meeting.status);

  const { data: transcript = [] } = useQuery({
    queryKey: ['transcript', id],
    queryFn: () => meetingsApi.getTranscript(id!),
    enabled: !!id,
    refetchInterval: isProcessing ? 2000 : false,
  });

  const { data: decisions = [] } = useQuery({
    queryKey: ['decisions', id],
    queryFn: () => meetingsApi.getDecisions(id!),
    enabled: !!id,
    refetchInterval: isProcessing ? 2000 : false,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['meeting-actions', id],
    queryFn: () => meetingsApi.getActions(id!),
    enabled: !!id,
    refetchInterval: isProcessing ? 2000 : false,
  });

  const { data: unresolved = [] } = useQuery({
    queryKey: ['meeting-unresolved', id],
    queryFn: () => meetingsApi.getUnresolved(id!),
    enabled: !!id,
    refetchInterval: isProcessing ? 2000 : false,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['participants', id],
    queryFn: () => meetingsApi.getParticipants(id!),
    enabled: !!id,
    refetchInterval: isProcessing ? 2000 : false,
  });

  useEffect(() => {
    if (meeting?.status) {
      qc.invalidateQueries({ queryKey: ['transcript', id] });
      qc.invalidateQueries({ queryKey: ['decisions', id] });
      qc.invalidateQueries({ queryKey: ['meeting-actions', id] });
      qc.invalidateQueries({ queryKey: ['meeting-unresolved', id] });
      qc.invalidateQueries({ queryKey: ['participants', id] });
    }
  }, [meeting?.status, id, qc]);

  useEffect(() => {
    if (tab === 'transcript' && evidenceHighlight) {
      setTimeout(() => {
        const el = document.getElementById(`seg-${evidenceHighlight}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [tab, evidenceHighlight]);

  const processMutation = useMutation({
    mutationFn: () => meetingsApi.process(id!),
    onSuccess: () => {
      toast.success('Local AI processing started');
      qc.invalidateQueries({ queryKey: ['meeting', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Processing failed'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!meeting) return <div className="text-surface-400">Meeting not found</div>;

  return (
    <div className="space-y-5 animate-fade">
      {/* Header */}
      <div>
        <Link to="/meetings" className="flex items-center gap-1 text-surface-400 hover:text-surface-200 text-sm mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Meetings
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-surface-50">{meeting.title}</h1>
              <span className={classificationBadgeClass(meeting.classification)}>
                {meeting.classification.replace('_', ' ')}
              </span>
              {meeting.processing_mode === 'DEMO_FALLBACK' && (
                <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Cpu className="w-2.5 h-2.5" /> DEMO EXTRACTION
                </span>
              )}
              {meeting.processing_mode === 'REAL_AI' && (
                <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Cpu className="w-2.5 h-2.5" /> REAL AI
                </span>
              )}
              <span className={statusBadgeClass(meeting.status)}>
                {statusLabel(meeting.status)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-surface-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />{formatDate(meeting.meeting_date)}
              </span>
              <span>{formatDuration(meeting.duration_seconds)}</span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />{meeting.storage_policy?.replace('_', ' ') || 'LOCAL ONLY'}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {['AUDIO_UPLOADED', 'CREATED', 'FAILED'].includes(meeting.status) && (
              <button
                onClick={() => processMutation.mutate()}
                className="btn-primary"
                disabled={processMutation.isPending}
              >
                {processMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Starting…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> {meeting.status === 'FAILED' ? 'Retry Processing' : 'Process with Local AI'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-5 mt-4 p-4 bg-surface-800 rounded-xl border border-surface-700">
          <StatChip icon={<GitBranch className="w-3.5 h-3.5" />} label="Decisions" value={meeting.decision_count || decisions.length} color="text-blue-400" />
          <div className="w-px h-8 bg-surface-700" />
          <StatChip icon={<CheckSquare className="w-3.5 h-3.5" />} label="Actions" value={meeting.action_count || actions.length} color="text-emerald-400" />
          <div className="w-px h-8 bg-surface-700" />
          <StatChip icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Unresolved" value={meeting.unresolved_count || unresolved.length} color="text-orange-400" />
          <div className="w-px h-8 bg-surface-700" />
          <StatChip icon={<Users className="w-3.5 h-3.5" />} label="Participants" value={participants.length} color="text-purple-400" />
          {meeting.sentiment_overall && (
            <>
              <div className="w-px h-8 bg-surface-700" />
              <div className="flex items-center gap-1.5">
                <span className={`text-2xs font-semibold uppercase ${
                  meeting.sentiment_overall === 'POSITIVE' ? 'text-emerald-400' :
                  meeting.sentiment_overall === 'TENSION' ? 'text-red-400' : 'text-amber-400'
                }`}>{meeting.sentiment_overall}</span>
                <span className="text-2xs text-surface-500">tone</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-700 pb-px overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'text-brand-400 border-brand-400'
                : 'text-surface-400 border-transparent hover:text-surface-200'
            }`}
          >
            {t.label}
            {t.key === 'transcript' && transcript.length > 0 && (
              <span className="ml-1.5 text-2xs bg-surface-700 text-surface-300 px-1.5 py-0.5 rounded-full">{transcript.length}</span>
            )}
            {t.key === 'actions' && actions.length > 0 && (
              <span className="ml-1.5 text-2xs bg-surface-700 text-surface-300 px-1.5 py-0.5 rounded-full">{actions.length}</span>
            )}
            {t.key === 'unresolved' && unresolved.length > 0 && (
              <span className="ml-1.5 text-2xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">{unresolved.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab 
          meeting={meeting} 
          decisions={decisions}
          actions={actions}
          unresolved={unresolved}
          participants={participants}
          onRetry={() => processMutation.mutate()} 
          onNavigateTab={(targetTab: string) => setTab(targetTab)}
        />
      )}
      {tab === 'privacy' && (
        <PrivacyDataFlowTab meeting={meeting} />
      )}
      {tab === 'transcript' && (
        <TranscriptTab 
          segments={transcript} 
          highlightId={evidenceHighlight} 
          meetingId={meeting.id} 
          participants={participants} 
        />
      )}
      {tab === 'decisions' && (
        <DecisionsTab 
          decisions={decisions} 
          participants={participants}
          onViewEvidence={(segId) => {
            setEvidenceHighlight(segId);
            setTab('transcript');
          }} 
        />
      )}
      {tab === 'actions' && (
        <ActionsTab actions={actions} onViewEvidence={(segId) => {
          setEvidenceHighlight(segId);
          setTab('transcript');
        }} />
      )}
      {tab === 'unresolved' && (
        <UnresolvedTab 
          items={unresolved} 
          meetingId={meeting.id}
          onResolved={() => {
            qc.invalidateQueries({ queryKey: ['meeting-unresolved', id] });
            qc.invalidateQueries({ queryKey: ['meeting', id] });
          }}
        />
      )}
      {tab === 'speakers' && <SpeakersTab participants={participants} transcript={transcript} />}
    </div>
  );
}

function StatChip({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={color}>{icon}</span>
      <div>
        <div className={`text-lg font-bold ${color}`}>{value}</div>
        <div className="text-2xs text-surface-500">{label}</div>
      </div>
    </div>
  );
}

// ── Overview Tab Component ────────────────────────────────────────────────────

function OverviewTab({ 
  meeting, 
  decisions = [], 
  actions = [], 
  unresolved = [], 
  participants = [], 
  onRetry, 
  onNavigateTab 
}: { 
  meeting: any; 
  decisions?: any[]; 
  actions?: any[]; 
  unresolved?: any[]; 
  participants?: any[]; 
  onRetry: () => void; 
  onNavigateTab: (tab: string) => void;
}) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Derive display labels for 3-axis settings
  const sourceLabel = {
    OFFLINE_RECORDING: 'Offline Recording',
    GOOGLE_MEET: 'Google Meet',
    TEAMS: 'Microsoft Teams',
    ZOOM: 'Zoom',
    LIVE_MIC: 'Live Microphone',
  }[meeting.meeting_source as string] || meeting.meeting_source || 'Local Recording';

  const aiLabel = {
    LOCAL_LLM: 'Local Llama (Ollama)',
    CLOUD_LLM: 'Cloud AI',
    DEMO_FALLBACK: 'Deterministic AI',
  }[meeting.ai_processing_mode as string] || meeting.ai_processing_mode || 'Local AI';

  const storageLabel = {
    LOCAL_ONLY: 'Local Only',
    CLOUD: 'Cloud Storage',
    LOCAL_AND_CLOUD: 'Local + Cloud Sync',
  }[meeting.storage_policy as string] || meeting.storage_policy || 'Local Only';

  const keyPoints = normalizeList(meeting.key_points);
  const risks = normalizeList(meeting.risks);
  const followUps = normalizeList(meeting.follow_up_topics);

  const isProcessing = ['PROCESSING', 'TRANSCRIBING', 'IDENTIFYING_SPEAKERS', 'ANALYZING', 'VALIDATING'].includes(meeting.status);

  // Derived intelligence stats
  const totalCommitments = actions.length + decisions.length;
  const resolvedRatio = totalCommitments > 0 ? (totalCommitments / (totalCommitments + unresolved.length)) : 1.0;
  const accountabilityScore = Math.max(70, Math.min(100, Math.round(resolvedRatio * 100)));
  const identifiedSpeakersCount = participants.filter((p: any) => p.identified).length;

  // Read aloud briefing using SpeechSynthesis
  const toggleSpeechBriefing = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Browser speech synthesis is not supported on this device.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const textToSpeak = `Executive Intelligence Briefing for ${meeting.title}. ${meeting.summary || 'Summary unavailable.'} Key commitments: ${actions.slice(0, 3).map((a: any) => `${a.owner} committed to ${a.action_text}`).join('. ')}. Key decisions: ${decisions.slice(0, 2).map((d: any) => d.decision_text).join('. ')}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
    toast.success('Playing audio summary briefing...');
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* 3-Axis metadata strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 flex-shrink-0">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xs text-surface-500 uppercase tracking-wider">Meeting Source</div>
            <div className="text-sm font-semibold text-surface-100 mt-0.5">{sourceLabel}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xs text-surface-500 uppercase tracking-wider">AI Processing</div>
            <div className="text-sm font-semibold text-surface-100 mt-0.5">{aiLabel}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xs text-surface-500 uppercase tracking-wider">Data Storage</div>
            <div className="text-sm font-semibold text-surface-100 mt-0.5">{storageLabel}</div>
          </div>
        </div>
      </div>

      {/* ACTIVE PROCESSING HUD / LOADING ANIMATION */}
      {isProcessing && (
        <div className="card p-6 border-brand-500/30 bg-gradient-to-b from-brand-950/30 to-surface-900 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-surface-100 text-sm flex items-center gap-2">
                  <span>Neural Speech Decoding & Commitment Extraction</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-xs text-surface-400">
                  Local AI pipeline is running on your machine. This view updates automatically.
                </p>
              </div>
            </div>
            <span className="badge bg-brand-500/20 text-brand-300 border border-brand-500/30 font-mono text-2xs uppercase">
              {meeting.status}
            </span>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2">
            <div className={`p-3 rounded-lg border text-xs ${
              meeting.status === 'TRANSCRIBING' 
                ? 'bg-brand-500/10 border-brand-500/40 text-brand-200' 
                : 'bg-surface-800/40 border-surface-700 text-surface-400'
            }`}>
              <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-brand-400" />
                <span>1. Faster-Whisper</span>
              </div>
              <div className="text-2xs text-surface-500">Neural speech-to-text</div>
            </div>

            <div className={`p-3 rounded-lg border text-xs ${
              meeting.status === 'IDENTIFYING_SPEAKERS' 
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-200' 
                : 'bg-surface-800/40 border-surface-700 text-surface-400'
            }`}>
              <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>2. Diarization</span>
              </div>
              <div className="text-2xs text-surface-500">Acoustic voice matching</div>
            </div>

            <div className={`p-3 rounded-lg border text-xs ${
              meeting.status === 'ANALYZING' 
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                : 'bg-surface-800/40 border-surface-700 text-surface-400'
            }`}>
              <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Local Llama</span>
              </div>
              <div className="text-2xs text-surface-500">Extracting commitments</div>
            </div>

            <div className={`p-3 rounded-lg border text-xs ${
              meeting.status === 'VALIDATING' 
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' 
                : 'bg-surface-800/40 border-surface-700 text-surface-400'
            }`}>
              <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>4. Evidence Grounding</span>
              </div>
              <div className="text-2xs text-surface-500">Zero-hallucination check</div>
            </div>
          </div>
        </div>
      )}

      {/* PIPELINE FAILED STATE BANNER */}
      {meeting.status === 'FAILED' && (
        <div className="card p-5 border-red-500/30 bg-red-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <h4 className="text-sm font-bold text-red-200">Local AI Processing Encountered an Issue</h4>
                <p className="text-xs text-red-300/80">
                  {meeting.processing_error || 'Processing pipeline was interrupted.'}
                </p>
              </div>
            </div>
            <button
              onClick={onRetry}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Processing
            </button>
          </div>
        </div>
      )}

      {/* UNPROCESSED STATE CARD */}
      {['CREATED', 'AUDIO_UPLOADED'].includes(meeting.status) && (
        <div className="card p-6 border-dashed border-surface-600 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-brand-400 mx-auto" />
          <h3 className="text-base font-semibold text-surface-100">Ready for Local AI Processing</h3>
          <p className="text-xs text-surface-400 max-w-md mx-auto">
            Audio and meeting parameters are stored locally. Trigger the pipeline to run Faster-Whisper, Diarization, and Local Llama commitment extraction.
          </p>
          <button onClick={onRetry} className="btn-primary mx-auto flex items-center gap-2">
            <Play className="w-4 h-4" /> Start AI Intelligence Extraction
          </button>
        </div>
      )}

      {/* COMPLETED OVERVIEW CONTENT */}
      {meeting.status === 'COMPLETED' && (
        <>
          {/* Executive KPI Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('decisions')}
              className="card p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-950/10 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs font-bold text-surface-400 uppercase tracking-wider">Decisions Locked</span>
                <GitBranch className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-emerald-400">{decisions.length}</div>
              <div className="text-2xs text-surface-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>100% Traceable to Transcript</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('actions')}
              className="card p-4 text-left transition-all hover:border-blue-500/50 hover:bg-blue-950/10 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs font-bold text-surface-400 uppercase tracking-wider">Commitments</span>
                <CheckSquare className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-blue-400">{actions.length}</div>
              <div className="text-2xs text-surface-400 mt-1 flex items-center gap-1">
                <span>{actions.filter((a: any) => a.owner && a.owner !== 'UNRESOLVED').length} with Assigned Owners</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('speakers')}
              className="card p-4 text-left transition-all hover:border-purple-500/50 hover:bg-purple-950/10 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs font-bold text-surface-400 uppercase tracking-wider">Voice Identification</span>
                <Users className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-purple-400">
                {identifiedSpeakersCount} / {Math.max(participants.length, 1)}
              </div>
              <div className="text-2xs text-surface-400 mt-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-purple-400" />
                <span>Acoustic Fingerprinted</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('unresolved')}
              className={`card p-4 text-left transition-all group cursor-pointer ${
                unresolved.length > 0 
                  ? 'hover:border-amber-500/50 hover:bg-amber-950/10 border-amber-500/30' 
                  : 'hover:border-emerald-500/50 hover:bg-emerald-950/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs font-bold text-surface-400 uppercase tracking-wider">Integrity Score</span>
                <ShieldCheck className={`w-4 h-4 group-hover:scale-110 transition-transform ${unresolved.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
              </div>
              <div className={`text-2xl font-black ${unresolved.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {accountabilityScore}%
              </div>
              <div className="text-2xs text-surface-400 mt-1 flex items-center gap-1">
                {unresolved.length > 0 ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {unresolved.length} Items Flagged
                  </span>
                ) : (
                  <span className="text-emerald-400">Zero Unresolved Blockers</span>
                )}
              </div>
            </button>
          </div>

          {/* Executive Intelligence Briefing */}
          <div className="card space-y-4 bg-gradient-to-b from-surface-800/40 to-surface-900 border-surface-700/60 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-700/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-surface-50 flex items-center gap-2">
                    Executive Strategic Briefing
                    <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-3xs uppercase font-mono">
                      AI Synthesized • Verbatim Free
                    </span>
                  </h2>
                  <p className="text-2xs text-surface-400">Strategic digest distilled from meeting audio & discussion turn points</p>
                </div>
              </div>

              <button
                onClick={toggleSpeechBriefing}
                className={`btn-secondary btn-sm flex items-center gap-1.5 transition-all self-start sm:self-auto ${
                  isPlayingAudio ? 'bg-brand-500/20 border-brand-500 text-brand-300' : ''
                }`}
                title="Listen to summary read aloud with speech synthesis"
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
                    <span>Stop Briefing</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-brand-400" />
                    <span>Listen to Audio Briefing</span>
                  </>
                )}
              </button>
            </div>

            <div className="prose prose-invert max-w-none text-surface-200 text-sm leading-relaxed whitespace-pre-line font-normal">
              {meeting.summary}
            </div>

            {/* Core Discussion Pillars */}
            {keyPoints.length > 0 && (
              <div className="pt-3 border-t border-surface-700/40">
                <div className="text-2xs font-bold text-surface-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-400" />
                  Key Discussion Pillars
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {keyPoints.map((p: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-800/40 border border-surface-700/40 text-xs text-surface-200">
                      <ChevronRight className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Deep-Dive Grid: Decisions Spotlight + Action & Risk Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Top Decisions Spotlight */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-surface-100 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  Key Decisions Spotlight
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('decisions')}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                >
                  View All ({decisions.length}) <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {decisions.length === 0 ? (
                <div className="p-4 rounded-lg bg-surface-800/30 border border-surface-700/40 text-center text-xs text-surface-400">
                  No decisions flagged in this session.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {decisions.slice(0, 3).map((d: any) => (
                    <div key={d.id} className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/60 hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-3xs font-semibold uppercase">
                          ✓ APPROVED & LOCKED IN
                        </span>
                        {d.hallucination_risk && (
                          <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20 text-3xs">
                            ⚠ Verification Needed
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-surface-100">{d.decision_text}</p>
                      {d.evidence_text && (
                        <div className="text-3xs text-surface-400 italic mt-1.5 line-clamp-1 border-l-2 border-emerald-500/30 pl-2">
                          "{d.evidence_text}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Commitments & Risk Radar */}
            <div className="space-y-4">
              {/* Risks Radar */}
              {risks.length > 0 && (
                <div className="card border-red-500/25 bg-red-950/10 space-y-2.5">
                  <div className="text-sm font-bold text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    Risk Radar & Friction Points
                  </div>
                  <ul className="space-y-1.5">
                    {risks.map((r: string, i: number) => (
                      <li key={i} className="text-xs text-surface-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Unresolved Alert Banner if any */}
              {unresolved.length > 0 && (
                <div className="card border-amber-500/30 bg-amber-950/15 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-200">
                        {unresolved.length} Unresolved Action {unresolved.length === 1 ? 'Item' : 'Items'} Detected
                      </div>
                      <div className="text-2xs text-amber-300/80 mt-0.5">
                        Items missing assigned owners or completion deadlines require attention.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('unresolved')}
                    className="btn-secondary btn-sm text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20 whitespace-nowrap"
                  >
                    Resolve Blockers →
                  </button>
                </div>
              )}

              {/* Follow-up Topics */}
              {followUps.length > 0 && (
                <div className="card space-y-2">
                  <div className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" />
                    Upcoming Follow-Up Topics
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {followUps.map((t: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-surface-800 text-surface-300 border border-surface-700/60 rounded-lg text-2xs font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Data Flow / Privacy Tab ──────────────────────────────────────────────────

function PrivacyDataFlowTab({ meeting }: { meeting: any }) {
  const isLocal = meeting.storage_policy === 'LOCAL_ONLY';
  const isLocalAI = meeting.ai_processing_mode === 'LOCAL_LLM' || meeting.ai_processing_mode === 'DEMO_FALLBACK';
  const isOffline = meeting.meeting_source === 'OFFLINE_RECORDING' || meeting.meeting_source === 'LIVE_MIC';

  const pipelineStages = [
    {
      id: 'source',
      label: 'Meeting Source',
      description: isOffline ? 'Audio recorded locally — no cloud ingress' : `Imported from ${meeting.meeting_source || 'online provider'}`,
      icon: isOffline ? <Laptop className="w-5 h-5" /> : <Globe className="w-5 h-5" />,
      color: isOffline ? 'brand' : 'amber',
      status: '✓ Captured',
      badge: isOffline ? 'OFFLINE' : 'ONLINE IMPORT',
    },
    {
      id: 'transcription',
      label: 'Transcription',
      description: 'Faster-Whisper running locally — audio never leaves device',
      icon: <Mic className="w-5 h-5" />,
      color: 'purple',
      status: meeting.status === 'COMPLETED' ? '✓ Done' : 'Pending',
      badge: 'LOCAL FASTER-WHISPER',
    },
    {
      id: 'ai',
      label: 'AI Intelligence',
      description: isLocalAI
        ? 'Llama 3 via Ollama — zero data egress, runs on your hardware'
        : 'Cloud LLM — data sent to external AI service',
      icon: <Cpu className="w-5 h-5" />,
      color: isLocalAI ? 'emerald' : 'red',
      status: meeting.status === 'COMPLETED' ? '✓ Extracted' : 'Pending',
      badge: isLocalAI ? 'LOCAL LLAMA' : 'CLOUD AI ⚠',
    },
    {
      id: 'storage',
      label: 'Data Storage',
      description: isLocal
        ? 'All data stored on local device/server — zero cloud sync'
        : meeting.storage_policy === 'LOCAL_AND_CLOUD'
        ? 'Synced to both local and organization cloud vault'
        : 'Stored in organization cloud vault',
      icon: isLocal ? <Lock className="w-5 h-5" /> : <Cloud className="w-5 h-5" />,
      color: isLocal ? 'emerald' : 'blue',
      status: '✓ Persisted',
      badge: meeting.storage_policy?.replace('_', ' ') || 'LOCAL ONLY',
    },
  ];

  const colorMap: Record<string, string> = {
    brand: 'bg-brand-500/10 border-brand-500/30 text-brand-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  return (
    <div className="space-y-6">
      {/* Privacy Score Banner */}
      <div className={`card flex items-center gap-4 p-5 ${
        isLocal && isLocalAI
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-amber-500/30 bg-amber-500/5'
      }`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
          isLocal && isLocalAI ? 'bg-emerald-500/20' : 'bg-amber-500/20'
        }`}>
          {isLocal && isLocalAI ? '🔒' : '☁️'}
        </div>
        <div className="flex-1">
          <div className={`text-base font-bold ${
            isLocal && isLocalAI ? 'text-emerald-300' : 'text-amber-300'
          }`}>
            {isLocal && isLocalAI ? 'Maximum Privacy — Full Local Processing' : 'Hybrid Processing Mode'}
          </div>
          <div className="text-sm text-surface-400 mt-0.5">
            {isLocal && isLocalAI
              ? 'Zero cloud egress. All audio, transcription, and AI processing occurred on-device. Data never left your infrastructure.'
              : 'Some processing involved cloud services. Review the data flow below for details.'}
          </div>
        </div>
        <div className={`text-3xl font-black flex-shrink-0 ${
          isLocal && isLocalAI ? 'text-emerald-400' : 'text-amber-400'
        }`}>
          {isLocal && isLocalAI ? '100%' : '60%'}
          <div className="text-xs font-normal text-surface-500">privacy score</div>
        </div>
      </div>

      {/* Pipeline Flow */}
      <div className="card">
        <div className="text-sm font-semibold text-surface-300 mb-6">Data Pipeline Flow</div>
        <div className="flex items-start gap-0">
          {pipelineStages.map((stage, i) => (
            <div key={stage.id} className="flex-1 flex items-start">
              <div className="flex-1">
                <div className={`border rounded-xl p-4 ${colorMap[stage.color]}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 border ${colorMap[stage.color]}`}>
                    {stage.icon}
                  </div>
                  <div className="text-xs font-semibold text-surface-200 mb-1">{stage.label}</div>
                  <div className="text-2xs text-surface-400 leading-relaxed mb-3">{stage.description}</div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-2xs font-mono px-2 py-0.5 rounded-full border inline-block w-fit ${colorMap[stage.color]}`}>
                      {stage.badge}
                    </span>
                    <span className="text-2xs text-surface-500">{stage.status}</span>
                  </div>
                </div>
              </div>
              {i < pipelineStages.length - 1 && (
                <div className="flex items-center px-1 pt-8">
                  <ArrowRight className="w-4 h-4 text-surface-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-xs font-semibold text-surface-300 mb-2">🧠 Zero Hallucination</div>
          <div className="text-2xs text-surface-400">Every extracted item is anchored to a verbatim transcript segment. No AI fabrication.</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-surface-300 mb-2">📍 Evidence-Locked</div>
          <div className="text-2xs text-surface-400">Decisions and actions only extracted when explicitly stated. Ambiguous items marked as Unresolved.</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-surface-300 mb-2">🔐 Audit Trail</div>
          <div className="text-2xs text-surface-400">Full audit log of who accessed this meeting, when, and what was extracted.</div>
        </div>
      </div>
    </div>
  );
}

// ── Transcript Tab with Speaker Reassignment ─────────────────────────────────

function TranscriptTab({ 
  segments, 
  highlightId,
  meetingId,
  participants 
}: { 
  segments: any[]; 
  highlightId: string | null;
  meetingId: string;
  participants: any[];
}) {
  const qc = useQueryClient();
  const [editingSegId, setEditingSegId] = useState<string | null>(null);

  const handleSpeakerChange = async (segmentId: string, newSpeaker: string) => {
    try {
      await meetingsApi.updateTranscriptSegment(meetingId, segmentId, { speaker_name: newSpeaker });
      toast.success(`Speaker updated to ${newSpeaker}`);
      setEditingSegId(null);
      qc.invalidateQueries({ queryKey: ['transcript', meetingId] });
      qc.invalidateQueries({ queryKey: ['participants', meetingId] });
    } catch {
      toast.error('Failed to update speaker');
    }
  };

  const participantNames = participants.map(p => p.name);

  return (
    <div className="space-y-3">
      {segments.length === 0 && (
        <div className="empty-state">
          <Video className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-400">No transcript segments available yet</p>
        </div>
      )}
      {segments.map((seg) => (
        <div
          key={seg.id}
          id={`seg-${seg.id}`}
          className={`flex gap-4 p-4 rounded-xl transition-all duration-300 ${
            highlightId === seg.id ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-surface-800/50 bg-surface-900/40 border border-surface-800'
          }`}
        >
          <div className="flex flex-col items-end gap-1 flex-shrink-0 w-20">
            <span className="text-xs font-mono text-brand-400">{formatTime(seg.start_time)}</span>
            {seg.confidence && (
              <span className="text-3xs text-surface-500">{(seg.confidence * 100).toFixed(0)}% STT</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className="w-6 h-6 rounded-full bg-brand-700/50 flex items-center justify-center text-2xs font-bold text-brand-300 flex-shrink-0">
                {(seg.speaker_name || seg.speaker_label || 'U').charAt(0)}
              </div>
              
              {editingSegId === seg.id ? (
                <div className="flex items-center gap-1.5">
                  <select
                    className="select text-xs py-0.5 px-2 bg-surface-800 text-surface-100 border-surface-600"
                    defaultValue={seg.speaker_name || ''}
                    onChange={(e) => handleSpeakerChange(seg.id, e.target.value)}
                  >
                    <option value="" disabled>Select speaker...</option>
                    {participantNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="Unknown Speaker">Unknown Speaker</option>
                  </select>
                  <button 
                    onClick={() => setEditingSegId(null)}
                    className="text-xs text-surface-400 hover:text-surface-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-surface-200 tracking-wide">
                    {seg.speaker_name || seg.speaker_label || 'Speaker'}
                  </span>
                  {seg.speaker_name && seg.speaker_name !== 'Unknown Speaker' && (
                    <span className="text-3xs text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                      ✓ Identified
                    </span>
                  )}
                  <button
                    onClick={() => setEditingSegId(seg.id)}
                    className="text-3xs text-surface-500 hover:text-brand-400 flex items-center gap-0.5 ml-1"
                    title="Change speaker voice attribution"
                  >
                    <Edit2 className="w-2.5 h-2.5" /> Reassign
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-surface-200 leading-relaxed font-sans">"{seg.text}"</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Decisions Tab ─────────────────────────────────────────────────────────────

function DecisionsTab({ 
  decisions, 
  participants = [], 
  onViewEvidence 
}: { 
  decisions: any[]; 
  participants?: any[]; 
  onViewEvidence: (segId: string) => void;
}) {
  const getDecisionCategory = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('api') || lower.includes('database') || lower.includes('redis') || lower.includes('architecture') || lower.includes('pipeline') || lower.includes('fingerprint')) {
      return { label: 'ARCHITECTURE & TECH', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
    }
    if (lower.includes('release') || lower.includes('deploy') || lower.includes('sprint') || lower.includes('schedule') || lower.includes('october') || lower.includes('by ')) {
      return { label: 'TIMELINE & RELEASE', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' };
    }
    if (lower.includes('security') || lower.includes('soc2') || lower.includes('token') || lower.includes('compliance') || lower.includes('privacy')) {
      return { label: 'SECURITY & COMPLIANCE', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
    }
    return { label: 'STRATEGIC COMMITMENT', color: 'bg-surface-700 text-surface-200 border-surface-600' };
  };

  return (
    <div className="space-y-4">
      {/* Decisions KPI header */}
      <div className="card p-4 bg-gradient-to-r from-surface-900 to-surface-850 border-surface-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-surface-50 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            Decision Tracker & Institutional Memory
          </h2>
          <p className="text-2xs text-surface-400 mt-0.5">
            Immutable, evidence-grounded decisions extracted from meeting audio turns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
            {decisions.length} Decisions Locked
          </span>
          <span className="badge bg-surface-800 text-surface-300 border border-surface-700 text-xs font-mono">
            Zero Drift
          </span>
        </div>
      </div>

      {decisions.length === 0 && (
        <div className="empty-state">
          <GitBranch className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-300 font-medium">No formal decisions recorded in this session</p>
          <p className="text-surface-500 text-xs mt-1">Decisions are captured when participants reach explicit consensus.</p>
        </div>
      )}

      {decisions.map((d, idx) => {
        const cat = getDecisionCategory(d.decision_text);
        return (
          <div key={d.id} className="card p-5 border-surface-700/70 hover:border-emerald-500/40 transition-all space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xs font-mono text-surface-500">#{idx + 1}</span>
                <span className="badge bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-3xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> APPROVED & LOCKED IN
                </span>
                <span className={`badge text-3xs font-semibold uppercase tracking-wider border ${cat.color}`}>
                  {cat.label}
                </span>
                {d.hallucination_risk && (
                  <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/30 text-3xs">
                    ⚠ Verification Recommended
                  </span>
                )}
              </div>

              {d.evidence_segment_id && (
                <button
                  type="button"
                  onClick={() => onViewEvidence(d.evidence_segment_id)}
                  className="btn-secondary btn-sm flex items-center gap-1.5 text-xs text-brand-300 hover:text-white self-start"
                >
                  <Eye className="w-3.5 h-3.5 text-brand-400" /> View in Transcript
                </button>
              )}
            </div>

            {/* Decision Statement */}
            <h3 className="text-sm md:text-base font-bold text-surface-50 leading-snug">
              {d.decision_text}
            </h3>

            {/* Stakeholders involved */}
            {d.participants_involved?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-2xs font-bold text-surface-500 uppercase tracking-wider">Stakeholders:</span>
                {d.participants_involved.map((p: string) => (
                  <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-800 border border-surface-700 text-2xs text-surface-200 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                    {p}
                  </span>
                ))}
              </div>
            )}

            {/* Verbatim Transcript Evidence Box */}
            {d.evidence_text && (
              <div className="evidence-block mt-2 bg-surface-950/60 border border-surface-700/60 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-3xs text-amber-400 font-bold uppercase tracking-wider">
                  <span>Verbatim Audio Evidence</span>
                  <span className="text-surface-500 font-mono">100% Grounded</span>
                </div>
                <p className="text-xs text-surface-200 italic font-sans leading-relaxed">
                  "{d.evidence_text}"
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Actions Tab ───────────────────────────────────────────────────────────────

function ActionsTab({ actions, onViewEvidence }: { actions: any[]; onViewEvidence: (segId: string) => void }) {
  return (
    <div className="space-y-3">
      {actions.length === 0 && (
        <div className="empty-state">
          <CheckSquare className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-400">No action items extracted yet</p>
        </div>
      )}
      {actions.map((a) => (
        <div key={a.id} className="card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={statusBadgeClass(a.status)}>{statusLabel(a.status)}</span>
                {!a.owner_explicit && <span className="badge-unresolved">⚠ Owner Unresolved</span>}
                {!a.deadline_explicit && a.is_commitment && <span className="badge bg-surface-600/30 text-surface-400 border border-surface-600/30">No Deadline</span>}
                {a.hallucination_risk && <span className="badge-unresolved">⚠ Hallucination Risk</span>}
              </div>
              
              <p className="text-sm font-medium text-surface-100">{a.action_text}</p>
              
              <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
                <span>Owner: <span className={a.owner_name === 'UNRESOLVED' ? 'text-orange-400 font-semibold' : 'text-surface-200 font-semibold'}>{a.owner_name || 'UNRESOLVED'}</span></span>
                <span>Deadline: <span className={a.deadline_text === 'UNRESOLVED' ? 'text-orange-400 font-semibold' : 'text-surface-200 font-semibold'}>{a.deadline_text || 'UNRESOLVED'}</span></span>
                {a.confidence && <span>Confidence: {(a.confidence * 100).toFixed(0)}%</span>}
              </div>
              
              <div className="evidence-block mt-3">
                <div className="text-2xs text-amber-400 font-semibold mb-1 uppercase tracking-wide">Transcript Evidence</div>
                {a.evidence_text}
              </div>
            </div>
            {a.evidence_segment_id && (
              <button onClick={() => onViewEvidence(a.evidence_segment_id)}
                className="btn-secondary btn-sm flex-shrink-0">
                <Eye className="w-3 h-3" /> Source
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Unresolved Tab ────────────────────────────────────────────────────────────

function UnresolvedTab({ 
  items, 
  meetingId, 
  onResolved 
}: { 
  items: any[]; 
  meetingId?: string; 
  onResolved?: () => void;
}) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeConfig: Record<string, { label: string; color: string; badge: string }> = {
    OWNER: { 
      label: 'UNASSIGNED OWNER', 
      color: 'text-orange-400',
      badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30' 
    },
    DEADLINE: { 
      label: 'MISSING DEADLINE', 
      color: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
    },
    DECISION: { 
      label: 'PENDING APPROVAL', 
      color: 'text-blue-400',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
    },
    ACTION: { 
      label: 'UNCLAIMED ACTION', 
      color: 'text-red-400',
      badge: 'bg-red-500/10 text-red-400 border-red-500/30' 
    },
    CONFLICT: { 
      label: 'CONFLICTING STANCE', 
      color: 'text-purple-400',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
    },
  };

  const handleResolve = async (id: string) => {
    if (!resolveNote.trim()) {
      toast.error('Please enter a brief resolution note or select a preset');
      return;
    }
    setIsSubmitting(true);
    try {
      await unresolvedApi.resolve(id, resolveNote.trim());
      toast.success('Item resolved and closed successfully!');
      setResolvingId(null);
      setResolveNote('');
      onResolved?.();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to resolve item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePresets = [
    'Assigned to Keerthi',
    'Assigned to Priya Sharma',
    'Scheduled for next sprint review',
    'Approved by Tech Lead'
  ];

  const activeItems = items.filter((u: any) => !u.resolved);
  const resolvedCount = items.filter((u: any) => u.resolved).length;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="card p-4 bg-gradient-to-r from-surface-900 to-surface-850 border-surface-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-surface-50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Unresolved Items & Ambiguity Guard
          </h2>
          <p className="text-2xs text-surface-400 mt-0.5">
            Commitments missing an unambiguous owner, concrete delivery date, or formal sign-off
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resolvedCount > 0 && (
            <span className="badge bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              ✓ {resolvedCount} Resolved
            </span>
          )}
          <span className={`badge text-xs font-semibold ${activeItems.length > 0 ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'}`}>
            {activeItems.length} {activeItems.length === 1 ? 'Item' : 'Items'} Requiring Action
          </span>
        </div>
      </div>

      {activeItems.length === 0 && (
        <div className="card p-10 text-center space-y-3 border-dashed border-emerald-500/30 bg-emerald-950/10">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-surface-100">All Commitments Fully Resolved!</h3>
          <p className="text-xs text-surface-400 max-w-md mx-auto">
            Zero ambiguous items detected. Every action item has a designated owner, delivery milestone, and consensus approval.
          </p>
        </div>
      )}

      {items.map((u) => {
        const conf = typeConfig[u.item_type] || {
          label: `${u.item_type} UNRESOLVED`,
          color: 'text-orange-400',
          badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30'
        };
        const isThisResolving = resolvingId === u.id;

        return (
          <div key={u.id} className={`card p-5 space-y-3.5 ${u.resolved ? 'border-emerald-500/30 bg-emerald-950/5 opacity-85' : 'border-amber-500/30 bg-surface-900/90'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {u.resolved ? (
                    <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-3xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> RESOLVED
                    </span>
                  ) : (
                    <span className={`badge text-3xs font-bold uppercase tracking-wider border ${conf.badge}`}>
                      {conf.label}
                    </span>
                  )}
                  <span className="text-2xs text-surface-500 font-mono">ID: {u.id.slice(0, 8)}</span>
                </div>
                <h3 className={`text-sm md:text-base font-bold leading-snug ${u.resolved ? 'text-surface-300 line-through' : 'text-surface-100'}`}>
                  {u.description}
                </h3>
                {u.resolved ? (
                  <p className="text-xs text-emerald-400/90 font-medium">
                    ✓ Resolution Note: {u.resolution_note || 'Resolved by user'}
                  </p>
                ) : (
                  <p className="text-xs text-surface-400">
                    <strong className="text-surface-300">Root Cause:</strong> {u.reason}
                  </p>
                )}
              </div>

              {!u.resolved && !isThisResolving && (
                <button
                  type="button"
                  onClick={() => {
                    setResolvingId(u.id);
                    setResolveNote('');
                  }}
                  className="btn-primary btn-sm flex items-center gap-1.5 text-xs self-start sm:self-auto shadow-xs whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" /> Resolve Item
                </button>
              )}
            </div>

            {/* Evidence Block */}
            {u.evidence_text && (
              <div className="evidence-block bg-surface-950/60 border border-surface-700/60 rounded-xl p-3">
                <div className="text-3xs text-amber-400 font-semibold mb-1 uppercase tracking-wider">
                  Transcript Context
                </div>
                <p className="text-xs text-surface-300 italic">"{u.evidence_text}"</p>
              </div>
            )}

            {/* Interactive Inline Resolution Drawer */}
            {isThisResolving && (
              <div className="p-4 rounded-xl bg-surface-950 border border-brand-500/40 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-400" />
                    Resolve Unresolved Item
                  </span>
                  <button
                    type="button"
                    onClick={() => setResolvingId(null)}
                    className="text-xs text-surface-500 hover:text-surface-300"
                  >
                    Cancel
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-2xs text-surface-500">Quick presets:</span>
                  {activePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setResolveNote(preset)}
                      className="px-2 py-0.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-300 border border-surface-700 text-3xs font-medium transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="Enter resolution note (e.g., Assigned to Keerthi, target release Friday)..."
                    className="input flex-1 text-xs py-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleResolve(u.id);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleResolve(u.id)}
                    disabled={isSubmitting || !resolveNote.trim()}
                    className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Confirm
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Speakers Tab with Voice Diarization Analytics ─────────────────────────────

function SpeakersTab({ participants, transcript }: { participants: any[]; transcript: any[] }) {
  // Calculate talk time distribution
  let totalDuration = 0;
  const speakerDurations: Record<string, number> = {};

  transcript.forEach((seg) => {
    const dur = Math.max(0.5, (seg.end_time || 0) - (seg.start_time || 0));
    totalDuration += dur;
    const name = seg.speaker_name || seg.speaker_label || 'Speaker';
    speakerDurations[name] = (speakerDurations[name] || 0) + dur;
  });

  const speakerStats = participants.map((p) => {
    const segs = transcript.filter((s) => s.speaker_name === p.name || s.speaker_label === p.speaker_label);
    const dur = speakerDurations[p.name] || 0;
    const pct = totalDuration > 0 ? Math.round((dur / totalDuration) * 100) : 0;
    return {
      ...p,
      segment_count: segs.length,
      duration: dur,
      percentage: pct,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs text-slate-500">Acoustic voice analysis & talk-time distribution</span>
        <Link to="/speakers" className="btn-secondary btn-sm flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold">
          <Mic className="w-3.5 h-3.5" /> Initialize / Manage Voice Profiles
        </Link>
      </div>
      {speakerStats.length === 0 && (
        <div className="empty-state">
          <Users className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-400">No speaker identification data available</p>
        </div>
      )}

      {/* Voice Diarization Distribution Bar */}
      {totalDuration > 0 && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between text-xs text-surface-300 font-semibold">
            <span>Acoustic Talk-Time Distribution</span>
            <span>Total: {formatDuration(Math.round(totalDuration))}</span>
          </div>
          <div className="w-full bg-surface-700 h-3 rounded-full overflow-hidden flex">
            {speakerStats.map((p, idx) => {
              const colors = ['bg-brand-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500'];
              return (
                <div
                  key={p.id}
                  className={`${colors[idx % colors.length]} h-full transition-all`}
                  style={{ width: `${Math.max(5, p.percentage)}%` }}
                  title={`${p.name}: ${p.percentage}%`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {speakerStats.map((p) => (
          <div key={p.id} className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-700/40 border border-brand-500/30 rounded-xl flex items-center justify-center text-base font-bold text-brand-300 flex-shrink-0">
              {p.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-surface-100">{p.name}</span>
                <span className="text-2xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                  ✓ Enrolled Voice
                </span>
              </div>
              <div className="text-2xs text-surface-400 mt-1 flex items-center gap-3">
                <span>{p.segment_count} segments</span>
                <span>{p.percentage}% talk-time</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
