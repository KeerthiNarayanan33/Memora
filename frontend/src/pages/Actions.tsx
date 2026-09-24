// Actions Tracker Page — Full accountability tracker
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Filter, Clock, User, Eye, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { actionsApi } from '../services/api';
import { formatDate, formatRelative, statusBadgeClass, statusLabel, truncate } from '../utils';
import type { ActionItem } from '../types';

const STATUS_FILTERS = ['ALL', 'NEW', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'UNRESOLVED', 'CARRIED_OVER'];

export default function ActionsPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['actions', statusFilter],
    queryFn: () => actionsApi.list({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 100,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => actionsApi.update(id, data),
    onSuccess: () => {
      toast.success('Action updated');
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Update failed'),
  });

  const stats = {
    total: actions.length,
    overdue: actions.filter(a => a.status === 'OVERDUE').length,
    unresolved: actions.filter(a => a.status === 'UNRESOLVED').length,
    completed: actions.filter(a => a.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-5 animate-fade">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Action Tracker</h1>
          <p className="text-surface-400 text-sm mt-0.5">Track all commitments across meetings</p>
        </div>
        <div className="flex gap-2 text-2xs">
          {stats.overdue > 0 && <span className="badge-overdue">{stats.overdue} overdue</span>}
          {stats.unresolved > 0 && <span className="badge-unresolved">{stats.unresolved} unresolved</span>}
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
              statusFilter === s
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                : 'text-surface-400 border-surface-700 hover:text-surface-200 hover:border-surface-600'
            }`}
          >
            {s === 'ALL' ? `All (${actions.length > 0 ? '' : '0'})` : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : actions.length === 0 ? (
        <div className="empty-state">
          <CheckSquare className="w-12 h-12 text-surface-600 mb-3" />
          <p className="text-surface-300 font-medium">No actions with this filter</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-surface-700 bg-surface-900/50">
              <tr>
                <th className="table-header text-left w-1/2">Action</th>
                <th className="table-header text-left">Owner</th>
                <th className="table-header text-left">Deadline</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left">Source</th>
                <th className="table-header w-32" />
              </tr>
            </thead>
            <tbody>
              {actions.map(a => (
                <ActionRow
                  key={a.id}
                  action={a}
                  expanded={expandedId === a.id}
                  onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                  onStatusChange={(status) => updateMutation.mutate({ id: a.id, data: { status } })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActionRow({
  action: a, expanded, onToggle, onStatusChange,
}: {
  action: ActionItem;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: string) => void;
}) {
  const NEXT_STATUSES: Record<string, string[]> = {
    NEW: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'OVERDUE', 'CANCELLED'],
    OVERDUE: ['IN_PROGRESS', 'COMPLETED'],
    UNRESOLVED: ['NEW', 'IN_PROGRESS'],
    CARRIED_OVER: ['IN_PROGRESS', 'COMPLETED'],
  };
  const nextStatuses = NEXT_STATUSES[a.status] || [];

  return (
    <>
      <tr className="table-row cursor-pointer" onClick={onToggle}>
        <td className="table-cell">
          <div className="flex items-start gap-2">
            <span className="text-surface-400 mt-0.5 flex-shrink-0">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
            <div>
              <div className="font-medium text-surface-100">{truncate(a.action_text, 75)}</div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {!a.owner_explicit && <span className="badge-unresolved text-2xs">⚠ Owner?</span>}
                {!a.deadline_explicit && a.is_commitment && <span className="text-2xs text-surface-500">No deadline</span>}
                {a.times_carried_over > 0 && (
                  <span className="text-2xs text-purple-400">↩ Carried over ×{a.times_carried_over}</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="table-cell">
          <span className={a.owner_name === 'UNRESOLVED' ? 'text-orange-400' : 'text-surface-200'}>
            {a.owner_name || 'UNRESOLVED'}
          </span>
        </td>
        <td className="table-cell">
          <span className={!a.deadline_explicit ? 'text-surface-500' : a.status === 'OVERDUE' ? 'text-red-400' : 'text-surface-200'}>
            {a.deadline_text || '—'}
          </span>
        </td>
        <td className="table-cell">
          <span className={statusBadgeClass(a.status)}>{statusLabel(a.status)}</span>
        </td>
        <td className="table-cell">
          <div className="text-2xs text-surface-500 truncate max-w-[120px]">
            {a.meeting_title || '—'}
          </div>
          <div className="text-2xs text-surface-600">{formatRelative(a.created_at)}</div>
        </td>
        <td className="table-cell" onClick={e => e.stopPropagation()}>
          {nextStatuses.length > 0 && (
            <select
              className="text-xs bg-surface-700 border border-surface-600 rounded-lg px-2 py-1 text-surface-300 cursor-pointer focus:outline-none"
              onChange={e => e.target.value && onStatusChange(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Update…</option>
              {nextStatuses.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-900/50">
          <td colSpan={6} className="px-8 py-4">
            <div className="space-y-3">
              <div>
                <div className="text-2xs text-amber-400 font-semibold uppercase tracking-wide mb-1">Transcript Evidence</div>
                <div className="evidence-block">{a.evidence_text}</div>
              </div>
              <div className="flex gap-6 text-xs text-surface-400">
                <span>Created: {formatDate(a.created_at)}</span>
                <span>Updated: {formatRelative(a.updated_at)}</span>
                {a.completed_at && <span className="text-emerald-400">Completed: {formatDate(a.completed_at)}</span>}
                <span>Confidence: {a.confidence ? `${(a.confidence * 100).toFixed(0)}%` : '—'}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
