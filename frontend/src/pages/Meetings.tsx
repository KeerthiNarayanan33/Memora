// Meetings List Page
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Video, Plus, Filter, Clock, Users, CheckSquare, AlertTriangle, Cpu } from 'lucide-react';
import { meetingsApi } from '../services/api';
import { formatDate, formatDuration, classificationBadgeClass, truncate } from '../utils';
import type { Meeting } from '../types';

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  AUDIO_UPLOADED: 'Audio Ready',
  PROCESSING: 'Processing…',
  TRANSCRIBING: 'Transcribing…',
  IDENTIFYING_SPEAKERS: 'ID Speakers…',
  ANALYZING: 'AI Analysis…',
  VALIDATING: 'Validating…',
  COMPLETED: 'Processed',
  FAILED: 'Failed',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'text-emerald-400',
  FAILED: 'text-red-400',
  PROCESSING: 'text-brand-400',
  CREATED: 'text-surface-400',
  AUDIO_UPLOADED: 'text-surface-400',
};

export default function MeetingsPage() {
  const [filter, setFilter] = useState('');
  
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => meetingsApi.list({ limit: 50 }),
  });

  const filtered = meetings.filter(m =>
    !filter || m.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Meetings</h1>
          <p className="text-surface-400 text-sm mt-0.5">{meetings.length} total meetings</p>
        </div>
        <Link to="/meetings/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Meeting
        </Link>
      </div>

      {/* Search */}
      <input
        type="text"
        className="input max-w-sm"
        placeholder="Filter meetings…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Video className="w-12 h-12 text-surface-600 mb-3" />
          <h3 className="text-surface-300 font-medium">No meetings yet</h3>
          <p className="text-surface-500 text-sm mt-1">Create your first meeting to get started</p>
          <Link to="/meetings/new" className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> New Meeting
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <MeetingRow key={m.id} meeting={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingRow({ meeting: m }: { meeting: Meeting }) {
  const statusColor = STATUS_COLORS[m.status] || 'text-surface-400';
  
  return (
    <Link to={`/meetings/${m.id}`} className="card-hover flex items-center gap-4 group">
      <div className="w-10 h-10 bg-surface-700 rounded-lg flex items-center justify-center flex-shrink-0">
        <Video className="w-5 h-5 text-surface-400 group-hover:text-brand-400 transition-colors" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-surface-100 truncate">{m.title}</span>
          <span className={classificationBadgeClass(m.classification)}>
            {m.classification.replace('_', ' ')}
          </span>
          {m.processing_mode === 'DEMO_FALLBACK' && (
            <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Cpu className="w-2.5 h-2.5" /> DEMO
            </span>
          )}
        </div>
        {m.summary && (
          <p className="text-xs text-surface-500 mt-0.5 truncate">{truncate(m.summary, 100)}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-2xs text-surface-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{formatDate(m.meeting_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{formatDuration(m.duration_seconds)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />{m.participant_count} participants
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-right flex-shrink-0">
        <div className="hidden md:flex items-center gap-3 text-2xs text-surface-500">
          <span className="flex items-center gap-1">
            <CheckSquare className="w-3 h-3" />{m.decision_count} decisions
          </span>
          <span className="flex items-center gap-1">
            <CheckSquare className="w-3 h-3" />{m.action_count} actions
          </span>
          {m.unresolved_count > 0 && (
            <span className="flex items-center gap-1 text-orange-400">
              <AlertTriangle className="w-3 h-3" />{m.unresolved_count}
            </span>
          )}
        </div>
        <div className={`text-xs font-medium ${statusColor}`}>
          {STATUS_LABELS[m.status] || m.status}
        </div>
      </div>
    </Link>
  );
}
