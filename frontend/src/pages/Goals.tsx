// Goals Page — Company Goal Tracking
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, TrendingUp, AlertTriangle, CheckCircle, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { goalsApi } from '../services/api';
import { formatDate } from '../utils';
import type { Goal } from '../types';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-brand-400 border-brand-500/30 bg-brand-500/10',
  AT_RISK: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  COMPLETED: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  ARCHIVED: 'text-surface-400 border-surface-500/30 bg-surface-700/30',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <TrendingUp className="w-3.5 h-3.5" />,
  AT_RISK: <AlertTriangle className="w-3.5 h-3.5" />,
  COMPLETED: <CheckCircle className="w-3.5 h-3.5" />,
  ARCHIVED: <Archive className="w-3.5 h-3.5" />,
};

export default function GoalsPage() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', target_date: '' });
  const qc = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setShowNew(false);
      setForm({ title: '', description: '', target_date: '' });
      toast.success('Goal created');
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create goal'),
  });

  return (
    <div className="space-y-5 animate-fade">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Company Goals</h1>
          <p className="text-surface-400 text-sm mt-0.5">Track strategic objectives and their progress</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {showNew && (
        <div className="card border-brand-500/20">
          <h3 className="text-sm font-semibold text-surface-200 mb-4">Create New Goal</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Goal Title *</label>
              <input className="input" placeholder="e.g. Launch Product X by October"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="textarea" rows={2} placeholder="Describe the goal objective and success criteria"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Target Date</label>
              <input type="date" className="input max-w-xs"
                value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={createMutation.isPending || !form.title}
                onClick={() => createMutation.mutate({ ...form, target_date: form.target_date || undefined })}>
                {createMutation.isPending ? 'Creating…' : 'Create Goal'}
              </button>
              <button className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="empty-state">
          <Target className="w-12 h-12 text-surface-600 mb-3" />
          <p className="text-surface-300 font-medium">No goals defined yet</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> Create First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map(g => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal: g }: { goal: Goal }) {
  const [actions, setActions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadActions = async () => {
    if (actions !== null) return;
    setLoading(true);
    try {
      const data = await goalsApi.getActions(g.id);
      setActions(data);
    } finally {
      setLoading(false);
    }
  };

  const statusCls = STATUS_COLORS[g.status] || STATUS_COLORS.ACTIVE;
  const daysLeft = g.target_date
    ? Math.ceil((new Date(g.target_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-base font-semibold text-surface-100">{g.title}</h3>
          {g.description && (
            <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{g.description}</p>
          )}
        </div>
        <span className={`badge border ${statusCls} flex-shrink-0`}>
          {STATUS_ICONS[g.status]}
          {g.status}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-surface-400">Progress</span>
          <span className="text-sm font-bold text-surface-100">{g.progress_pct}%</span>
        </div>
        <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              g.progress_pct >= 80 ? 'bg-emerald-500' :
              g.progress_pct >= 50 ? 'bg-brand-500' :
              g.progress_pct >= 25 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${g.progress_pct}%` }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-2xs text-surface-500">
        <span>{g.action_count} actions linked</span>
        <span>{g.completed_action_count} completed</span>
        {g.target_date && (
          <span className={daysLeft !== null && daysLeft < 0 ? 'text-red-400' : daysLeft !== null && daysLeft < 14 ? 'text-amber-400' : ''}>
            {daysLeft !== null && daysLeft < 0
              ? `${Math.abs(daysLeft)}d overdue`
              : daysLeft !== null
              ? `${daysLeft}d remaining`
              : formatDate(g.target_date)}
          </span>
        )}
      </div>

      {/* Linked actions expandable */}
      <button
        onClick={loadActions}
        className="mt-3 text-2xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
      >
        {actions === null ? 'Show linked actions' : `${actions.length} linked actions`}
      </button>

      {loading && <div className="text-2xs text-surface-500 mt-1">Loading…</div>}

      {actions && actions.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-surface-700 pt-2">
          {actions.map((a: any) => (
            <div key={a.action_id} className="flex items-center justify-between text-xs">
              <span className="text-surface-300 truncate flex-1">{a.action_text?.slice(0, 60)}…</span>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {a.is_ai_suggested && !a.confirmed && (
                  <span className="text-2xs text-purple-400">AI Suggested</span>
                )}
                <span className={`text-2xs font-semibold ${
                  a.status === 'COMPLETED' ? 'text-emerald-400' :
                  a.status === 'OVERDUE' ? 'text-red-400' :
                  a.status === 'IN_PROGRESS' ? 'text-amber-400' : 'text-surface-400'
                }`}>{a.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
