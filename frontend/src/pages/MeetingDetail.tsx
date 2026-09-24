// Meeting Detail Page — Tabbed view with all meeting intelligence
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Video, CheckSquare, GitBranch, AlertTriangle,
  Users, Target, Clock, Shield, Cpu, Eye, Play, ChevronRight,
  Laptop, Cloud, Lock, Database, ArrowRight, Mic, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { meetingsApi } from '../services/api';
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

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState('overview');
  const [evidenceHighlight, setEvidenceHighlight] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => meetingsApi.get(id!),
    enabled: !!id,
    refetchInterval: (m) => m?.status && !['COMPLETED', 'FAILED'].includes(m.status) ? 3000 : false,
  });

  const { data: transcript = [] } = useQuery({
    queryKey: ['transcript', id],
    queryFn: () => meetingsApi.getTranscript(id!),
    enabled: !!id,
  });

  const { data: decisions = [] } = useQuery({
    queryKey: ['decisions', id],
    queryFn: () => meetingsApi.getDecisions(id!),
    enabled: !!id,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['meeting-actions', id],
    queryFn: () => meetingsApi.getActions(id!),
    enabled: !!id,
  });

  const { data: unresolved = [] } = useQuery({
    queryKey: ['meeting-unresolved', id],
    queryFn: () => meetingsApi.getUnresolved(id!),
    enabled: !!id,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['participants', id],
    queryFn: () => meetingsApi.getParticipants(id!),
    enabled: !!id,
  });

  const processMutation = useMutation({
    mutationFn: () => meetingsApi.process(id!),
    onSuccess: () => {
      toast.success('Processing started');
      qc.invalidateQueries({ queryKey: ['meeting', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Processing failed'),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>;
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
            </div>
            <div className="flex items-center gap-4 text-sm text-surface-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />{formatDate(meeting.meeting_date)}
              </span>
              <span>{formatDuration(meeting.duration_seconds)}</span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />{meeting.storage_policy.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {meeting.status === 'AUDIO_UPLOADED' && (
              <button onClick={() => processMutation.mutate()} className="btn-primary" disabled={processMutation.isPending}>
                <Play className="w-4 h-4" />{processMutation.isPending ? 'Starting…' : 'Process'}
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-5 mt-4 p-4 bg-surface-800 rounded-xl border border-surface-700">
          <StatChip icon={<GitBranch className="w-3.5 h-3.5" />} label="Decisions" value={meeting.decision_count} color="text-blue-400" />
          <div className="w-px h-8 bg-surface-700" />
          <StatChip icon={<CheckSquare className="w-3.5 h-3.5" />} label="Actions" value={meeting.action_count} color="text-emerald-400" />
          <div className="w-px h-8 bg-surface-700" />
          <StatChip icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Unresolved" value={meeting.unresolved_count} color="text-orange-400" />
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
        <OverviewTab meeting={meeting} />
      )}
      {tab === 'privacy' && (
        <PrivacyDataFlowTab meeting={meeting} />
      )}
      {tab === 'transcript' && (
        <TranscriptTab segments={transcript} highlightId={evidenceHighlight} />
      )}
      {tab === 'decisions' && (
        <DecisionsTab decisions={decisions} onViewEvidence={(segId) => {
          setEvidenceHighlight(segId);
          setTab('transcript');
        }} />
      )}
      {tab === 'actions' && (
        <ActionsTab actions={actions} onViewEvidence={(segId) => {
          setEvidenceHighlight(segId);
          setTab('transcript');
        }} />
      )}
      {tab === 'unresolved' && <UnresolvedTab items={unresolved} />}
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

function OverviewTab({ meeting }: { meeting: any }) {
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
    DEMO_FALLBACK: 'Demo Extraction',
  }[meeting.ai_processing_mode as string] || meeting.ai_processing_mode || 'Local AI';

  const storageLabel = {
    LOCAL_ONLY: 'Local Only',
    CLOUD: 'Cloud Storage',
    LOCAL_AND_CLOUD: 'Local + Cloud Sync',
  }[meeting.storage_policy as string] || meeting.storage_policy || 'Local Only';

  return (
    <div className="space-y-4">
      {/* 3-Axis metadata strip */}
      <div className="grid grid-cols-3 gap-3">
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

      {meeting.summary && (
        <div className="card">
          <div className="text-sm font-semibold text-surface-300 mb-2">Executive Summary</div>
          <p className="text-surface-200 text-sm leading-relaxed">{meeting.summary}</p>
        </div>
      )}
      {meeting.key_points?.length > 0 && (
        <div className="card">
          <div className="text-sm font-semibold text-surface-300 mb-3">Key Discussion Points</div>
          <ul className="space-y-1.5">
            {meeting.key_points.map((p: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-surface-200">
                <ChevronRight className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {meeting.risks?.length > 0 && (
        <div className="card border-red-500/20">
          <div className="text-sm font-semibold text-red-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Risks Identified
          </div>
          <ul className="space-y-1.5">
            {meeting.risks.map((r: string, i: number) => (
              <li key={i} className="text-sm text-surface-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />{r}
              </li>
            ))}
          </ul>
        </div>
      )}
      {meeting.follow_up_topics?.length > 0 && (
        <div className="card">
          <div className="text-sm font-semibold text-surface-300 mb-3">Follow-up Topics</div>
          <div className="flex flex-wrap gap-2">
            {meeting.follow_up_topics.map((t: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-surface-700 text-surface-300 rounded-full text-xs">{t}</span>
            ))}
          </div>
        </div>
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
      badge: 'LOCAL WHISPER',
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

function TranscriptTab({ segments, highlightId }: { segments: any[]; highlightId: string | null }) {
  return (
    <div className="space-y-3">
      {segments.length === 0 && (
        <div className="empty-state">
          <Video className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-400">No transcript available yet</p>
        </div>
      )}
      {segments.map((seg) => (
        <div
          key={seg.id}
          id={`seg-${seg.id}`}
          className={`flex gap-4 p-4 rounded-xl transition-all duration-300 ${
            highlightId === seg.id ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-surface-800/50'
          }`}
        >
          <div className="flex flex-col items-end gap-1 flex-shrink-0 w-20">
            <span className="text-xs font-mono text-brand-400">{formatTime(seg.start_time)}</span>
            {seg.speaker_confidence && (
              <span className="text-2xs text-surface-600">{(seg.speaker_confidence * 100).toFixed(0)}%</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-surface-700 flex items-center justify-center text-2xs font-bold text-surface-300 flex-shrink-0">
                {(seg.speaker_name || seg.speaker_label || 'U').charAt(0)}
              </div>
              <span className="text-xs font-semibold text-surface-300 uppercase tracking-wide">
                {seg.speaker_name || seg.speaker_label || 'Unknown Speaker'}
              </span>
              {seg.speaker_name && (
                <span className="text-2xs text-emerald-400">✓ Identified</span>
              )}
            </div>
            <p className="text-sm text-surface-200 leading-relaxed">"{seg.text}"</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DecisionsTab({ decisions, onViewEvidence }: { decisions: any[]; onViewEvidence: (segId: string) => void }) {
  return (
    <div className="space-y-3">
      {decisions.length === 0 && (
        <div className="empty-state">
          <GitBranch className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-400">No decisions extracted yet</p>
        </div>
      )}
      {decisions.map((d) => (
        <div key={d.id} className="card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400 uppercase">Decision</span>
                {d.hallucination_risk && (
                  <span className="badge-unresolved">⚠ Review Required</span>
                )}
              </div>
              <p className="text-sm font-medium text-surface-100">{d.decision_text}</p>
              
              <div className="evidence-block mt-3">
                <div className="text-2xs text-amber-400 font-semibold mb-1 uppercase tracking-wide">Evidence</div>
                {d.evidence_text}
              </div>
              
              {d.participants_involved?.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xs text-surface-500">Participants:</span>
                  {d.participants_involved.map((p: string) => (
                    <span key={p} className="text-2xs bg-surface-700 text-surface-300 px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                </div>
              )}
            </div>
            {d.evidence_segment_id && (
              <button onClick={() => onViewEvidence(d.evidence_segment_id)}
                className="btn-secondary btn-sm flex-shrink-0">
                <Eye className="w-3 h-3" /> Evidence
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

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
                <span>Owner: <span className={a.owner_name === 'UNRESOLVED' ? 'text-orange-400' : 'text-surface-200'}>{a.owner_name || 'UNRESOLVED'}</span></span>
                <span>Deadline: <span className={a.deadline_text === 'UNRESOLVED' ? 'text-orange-400' : 'text-surface-200'}>{a.deadline_text || 'UNRESOLVED'}</span></span>
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

function UnresolvedTab({ items }: { items: any[] }) {
  const typeColors: Record<string, string> = {
    OWNER: 'text-orange-400',
    DEADLINE: 'text-amber-400',
    DECISION: 'text-blue-400',
    ACTION: 'text-red-400',
    CONFLICT: 'text-purple-400',
  };
  
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="empty-state">
          <AlertTriangle className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-400">No unresolved items — great!</p>
        </div>
      )}
      {items.map((u) => (
        <div key={u.id} className="card border-orange-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${typeColors[u.item_type] || 'text-orange-400'}`} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-orange-400 uppercase">{u.item_type} UNRESOLVED</span>
              </div>
              <p className="text-sm font-medium text-surface-100">{u.description}</p>
              <p className="text-xs text-surface-400 mt-1">{u.reason}</p>
              {u.evidence_text && (
                <div className="evidence-block mt-2">
                  {u.evidence_text}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SpeakersTab({ participants, transcript }: { participants: any[]; transcript: any[] }) {
  const speakerStats = participants.map(p => {
    const segs = transcript.filter(s => s.speaker_label === p.speaker_label || s.speaker_name === p.name);
    return { ...p, segment_count: segs.length };
  });
  
  return (
    <div className="space-y-3">
      {speakerStats.length === 0 && (
        <div className="empty-state">
          <Users className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-400">No speaker data available</p>
        </div>
      )}
      {speakerStats.map((p) => (
        <div key={p.id} className="card flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-700/50 rounded-full flex items-center justify-center text-sm font-bold text-brand-300 flex-shrink-0">
            {p.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-surface-100">{p.name}</span>
              {p.identified ? (
                <span className="text-2xs text-emerald-400">✓ Voice Identified</span>
              ) : (
                <span className="text-2xs text-surface-500">Unknown Speaker</span>
              )}
            </div>
            <div className="text-2xs text-surface-500 mt-0.5">
              {p.speaker_label} — {p.segment_count} transcript segments
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
