// Decisions Page
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GitBranch, Eye, AlertTriangle, ChevronRight } from 'lucide-react';
import { meetingsApi } from '../services/api';
import { meetingsApi as mApi } from '../services/api';
import { useState, useEffect } from 'react';
import { formatDate } from '../utils';

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const mtgs = await mApi.list({ limit: 50 });
      setMeetings(mtgs);
      const all: any[] = [];
      for (const m of mtgs) {
        if (m.status === 'COMPLETED') {
          try {
            const decs = await mApi.getDecisions(m.id);
            all.push(...decs.map(d => ({ ...d, meeting: m })));
          } catch {}
        }
      }
      setDecisions(all);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-5 animate-fade">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Decision Tracker</h1>
        <p className="text-surface-400 text-sm mt-0.5">{decisions.length} decisions across {meetings.length} meetings</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : decisions.length === 0 ? (
        <div className="empty-state">
          <GitBranch className="w-12 h-12 text-surface-600 mb-3" />
          <p className="text-surface-300 font-medium">No decisions recorded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.map((d, i) => (
            <div key={d.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-2xs font-bold text-blue-400 font-mono">DECISION-{String(i+1).padStart(3,'0')}</span>
                    {d.meeting && (
                      <Link to={`/meetings/${d.meeting.id}`}
                        className="text-2xs text-surface-500 hover:text-brand-400 transition-colors">
                        {d.meeting.title}
                      </Link>
                    )}
                    {d.hallucination_risk && (
                      <span className="flex items-center gap-1 text-2xs text-amber-400">
                        <AlertTriangle className="w-3 h-3" /> Review Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-surface-100">{d.decision_text}</p>
                  <div className="evidence-block mt-3">
                    <div className="text-2xs text-amber-400 font-semibold mb-1 uppercase">Evidence</div>
                    {d.evidence_text}
                  </div>
                  {d.participants_involved?.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-2xs text-surface-500">
                      Participants:
                      {d.participants_involved.map((p: string) => (
                        <span key={p} className="bg-surface-700 text-surface-300 px-2 py-0.5 rounded-full">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xs text-surface-500">{formatDate(d.created_at)}</div>
                  {d.evidence_segment_id && (
                    <Link to={`/meetings/${d.meeting_id}?tab=transcript&highlight=${d.evidence_segment_id}`}
                      className="btn-secondary btn-sm mt-2">
                      <Eye className="w-3 h-3" /> Source
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
