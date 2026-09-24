// Unresolved Items Page
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { unresolvedApi } from '../services/api';
import { formatDate, formatRelative } from '../utils';

const TYPE_COLORS: Record<string, string> = {
  OWNER: 'text-orange-400',
  DEADLINE: 'text-amber-400',
  DECISION: 'text-blue-400',
  ACTION: 'text-red-400',
  CONFLICT: 'text-purple-400',
};
const TYPE_LABELS: Record<string, string> = {
  OWNER: '⚠ Owner Unresolved',
  DEADLINE: '⏰ Deadline Missing',
  DECISION: '🔀 Decision Pending',
  ACTION: '🎯 Action Ambiguous',
  CONFLICT: '⚡ Conflict Detected',
};

export default function UnresolvedPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveNote, setResolveNote] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    unresolvedApi.list().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const resolve = async (id: string) => {
    if (!resolveNote.trim()) return toast.error('Please enter a resolution note');
    try {
      await unresolvedApi.resolve(id, resolveNote);
      setItems(prev => prev.filter(i => i.id !== id));
      setResolvingId(null);
      setResolveNote('');
      toast.success('Item resolved');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to resolve');
    }
  };

  return (
    <div className="space-y-5 animate-fade">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Unresolved Items</h1>
        <p className="text-surface-400 text-sm mt-0.5">
          {items.length} items requiring attention
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
          <p className="text-surface-300 font-medium">All items resolved — great work!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(u => (
            <div key={u.id} className="card border-orange-500/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-4 h-4 ${TYPE_COLORS[u.item_type] || 'text-orange-400'}`} />
                    <span className={`text-xs font-semibold ${TYPE_COLORS[u.item_type] || 'text-orange-400'}`}>
                      {TYPE_LABELS[u.item_type] || u.item_type}
                    </span>
                    {u.meeting_title && (
                      <span className="text-2xs text-surface-500">• {u.meeting_title}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-surface-100">{u.description}</p>
                  <p className="text-xs text-surface-400 mt-1">{u.reason}</p>
                  {u.evidence_text && (
                    <div className="evidence-block mt-2">{u.evidence_text}</div>
                  )}
                  <div className="text-2xs text-surface-600 mt-2">{formatRelative(u.created_at)}</div>

                  {resolvingId === u.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="textarea text-xs"
                        rows={2}
                        placeholder="Resolution note (e.g., 'Assigned to Rahul in follow-up')"
                        value={resolveNote}
                        onChange={e => setResolveNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => resolve(u.id)} className="btn-primary btn-sm">Confirm Resolve</button>
                        <button onClick={() => setResolvingId(null)} className="btn-secondary btn-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-secondary btn-sm mt-3" onClick={() => { setResolvingId(u.id); setResolveNote(''); }}>
                      Resolve
                    </button>
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
