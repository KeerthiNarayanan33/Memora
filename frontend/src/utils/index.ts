import type { ActionStatus, Classification, GoalStatus, MeetingStatus } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelative(dateStr?: string): string {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export function statusBadgeClass(status: ActionStatus | MeetingStatus | string): string {
  switch (status) {
    case 'NEW':
    case 'CREATED':
    case 'AUDIO_UPLOADED':
      return 'badge-new';
    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'TRANSCRIBING':
    case 'IDENTIFYING_SPEAKERS':
    case 'ANALYZING':
    case 'VALIDATING':
      return 'badge-in-progress';
    case 'COMPLETED':
      return 'badge-completed';
    case 'OVERDUE':
    case 'FAILED':
      return 'badge-overdue';
    case 'UNRESOLVED':
      return 'badge-unresolved';
    case 'CARRIED_OVER':
      return 'badge-carried-over';
    case 'CANCELLED':
      return 'badge-cancelled';
    default:
      return 'badge-new';
  }
}

export function statusLabel(status: ActionStatus | MeetingStatus | string): string {
  return String(status).replace(/_/g, ' ');
}

export function classificationBadgeClass(c: Classification): string {
  switch (c) {
    case 'HIGHLY_CONFIDENTIAL': return 'badge-confidential';
    case 'INTERNAL': return 'badge-internal';
    case 'GENERAL': return 'badge-general';
    default: return 'badge-internal';
  }
}

export function goalStatusColor(status: GoalStatus): string {
  switch (status) {
    case 'ACTIVE': return 'text-brand-400';
    case 'AT_RISK': return 'text-amber-400';
    case 'COMPLETED': return 'text-emerald-400';
    case 'ARCHIVED': return 'text-surface-400';
    default: return 'text-surface-400';
  }
}

export function sentimentColor(sentiment?: string): string {
  switch (sentiment) {
    case 'POSITIVE': return 'text-emerald-400';
    case 'TENSION': return 'text-red-400';
    case 'MIXED': return 'text-amber-400';
    default: return 'text-surface-400';
  }
}

export function truncate(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

export function isOverdue(deadlineDate?: string): boolean {
  if (!deadlineDate) return false;
  return new Date(deadlineDate) < new Date();
}
