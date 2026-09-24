// MeetGuard AI — API Service Layer
import axios from 'axios';
import type {
  User, Meeting, TranscriptSegment, Decision, ActionItem, UnresolvedItem,
  Goal, Speaker, DashboardStats, SearchResult, AIStatus, AnalyticsData,
  ActionHistory, Participant
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('meetguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('meetguard_token');
      localStorage.removeItem('meetguard_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then(r => r.data),
  
  me: () => api.get<User>('/auth/me').then(r => r.data),
  
  listUsers: () => api.get<User[]>('/auth/users').then(r => r.data),
  
  createUser: (data: { email: string; name: string; password: string; role: string; department?: string }) =>
    api.post<User>('/auth/users', data).then(r => r.data),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => api.get<DashboardStats>('/dashboard').then(r => r.data),
};

// ── Meetings ──────────────────────────────────────────────────────────────────

export const meetingsApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get<Meeting[]>('/meetings', { params }).then(r => r.data),
  
  get: (id: string) => api.get<Meeting>(`/meetings/${id}`).then(r => r.data),
  
  create: (data: {
    title: string;
    description?: string;
    meeting_date: string;
    classification: string;
    storage_policy?: string;
    storage_mode?: string;
    meeting_source?: string;
    ai_processing_mode?: string;
    cloud_sync_scope?: string;
    cloud_provider?: string;
    meeting_url?: string;
    goal_id?: string;
    participant_names?: string[];
  }) => api.post<Meeting>('/meetings', data).then(r => r.data),
  
  uploadAudio: (meetingId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/meetings/${meetingId}/audio`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  uploadAudioBlob: (meetingId: string, blob: Blob, filename = 'recording.webm') => {
    const form = new FormData();
    form.append('file', blob, filename);
    return api.post(`/meetings/${meetingId}/audio`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  
  process: (meetingId: string) =>
    api.post(`/meetings/${meetingId}/process`).then(r => r.data),

  syncToCloud: (meetingId: string, sync_scope = 'SUMMARY_AND_ACTIONS') =>
    api.post(`/meetings/${meetingId}/cloud-sync`, { sync_scope }).then(r => r.data),
  
  getTranscript: (meetingId: string) =>
    api.get<TranscriptSegment[]>(`/meetings/${meetingId}/transcript`).then(r => r.data),
  
  getDecisions: (meetingId: string) =>
    api.get<Decision[]>(`/meetings/${meetingId}/decisions`).then(r => r.data),
  
  getActions: (meetingId: string) =>
    api.get<ActionItem[]>(`/meetings/${meetingId}/actions`).then(r => r.data),
  
  getUnresolved: (meetingId: string) =>
    api.get<UnresolvedItem[]>(`/meetings/${meetingId}/unresolved`).then(r => r.data),
  
  getParticipants: (meetingId: string) =>
    api.get<Participant[]>(`/meetings/${meetingId}/participants`).then(r => r.data),
};

// ── Actions ───────────────────────────────────────────────────────────────────

export const actionsApi = {
  list: (params?: { status?: string; owner?: string; meeting_id?: string; limit?: number }) =>
    api.get<ActionItem[]>('/actions', { params }).then(r => r.data),
  
  get: (id: string) => api.get<ActionItem>(`/actions/${id}`).then(r => r.data),
  
  update: (id: string, data: {
    status?: string;
    owner_name?: string;
    deadline_text?: string;
    deadline_date?: string;
    note?: string;
  }) => api.patch<ActionItem>(`/actions/${id}`, data).then(r => r.data),
  
  getOverdue: () => api.get<ActionItem[]>('/actions/overdue').then(r => r.data),
  
  getUnresolved: () => api.get<ActionItem[]>('/actions/unresolved').then(r => r.data),
  
  getHistory: (id: string) => api.get<ActionHistory[]>(`/actions/${id}/history`).then(r => r.data),
};

// ── Goals ─────────────────────────────────────────────────────────────────────

export const goalsApi = {
  list: () => api.get<Goal[]>('/goals').then(r => r.data),
  
  get: (id: string) => api.get<Goal>(`/goals/${id}`).then(r => r.data),
  
  create: (data: { title: string; description?: string; target_date?: string }) =>
    api.post<Goal>('/goals', data).then(r => r.data),
  
  update: (id: string, data: Partial<Goal>) =>
    api.patch<Goal>(`/goals/${id}`, data).then(r => r.data),
  
  getActions: (id: string) =>
    api.get<any[]>(`/goals/${id}/actions`).then(r => r.data),
};

// ── Speakers ──────────────────────────────────────────────────────────────────

export const speakersApi = {
  list: () => api.get<Speaker[]>('/speakers').then(r => r.data),
  
  create: (data: {
    display_name: string;
    employee_id?: string;
    department?: string;
    role_title?: string;
  }) => api.post<Speaker>('/speakers', data).then(r => r.data),
};

// ── Search ────────────────────────────────────────────────────────────────────

export const searchApi = {
  search: (q: string) => api.get<SearchResult[]>('/search', { params: { q } }).then(r => r.data),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsApi = {
  get: () => api.get<AnalyticsData>('/analytics').then(r => r.data),
};

// ── AI Status ─────────────────────────────────────────────────────────────────

export const aiApi = {
  status: () => api.get<AIStatus>('/ai/status').then(r => r.data),
};

// ── Audit ─────────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (limit = 50) => api.get('/audit-logs', { params: { limit } }).then(r => r.data),
};

// ── Unresolved ────────────────────────────────────────────────────────────────

export const unresolvedApi = {
  list: () => api.get('/unresolved').then(r => r.data),
  resolve: (id: string, resolution_note: string) =>
    api.post(`/unresolved/${id}/resolve`, null, { params: { resolution_note } }).then(r => r.data),
};

// ── Digest ────────────────────────────────────────────────────────────────────

export const digestApi = {
  weekly: () => api.get('/digest/weekly').then(r => r.data),
};

// ── Providers & Cloud ─────────────────────────────────────────────────────────

export const providersApi = {
  list: () => api.get<ProviderStatus[]>('/providers').then(r => r.data),
  importOnline: (data: {
    provider: string;
    title: string;
    meeting_url?: string;
    meeting_date: string;
    classification?: string;
    ai_processing_mode?: string;
    storage_mode?: string;
    cloud_sync_scope?: string;
    participant_names?: string[];
    goal_id?: string;
  }) => api.post<Meeting>('/providers/import', data).then(r => r.data),
};

// ── Storage Stats ─────────────────────────────────────────────────────────────

export const storageApi = {
  getLocalStats: () => api.get<{
    root_path: string;
    total_size_bytes: number;
    total_size_mb: number;
    file_count: number;
    local_storage_enforced: boolean;
    cloud_sync_disabled_default: boolean;
  }>('/storage/local-stats').then(r => r.data),
};
