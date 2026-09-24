// MeetGuard AI — TypeScript Types

export type UserRole = 'ADMIN' | 'MANAGER' | 'MEMBER';
export type ActionStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'UNRESOLVED' | 'CARRIED_OVER' | 'CANCELLED';
export type MeetingStatus = 'CREATED' | 'AUDIO_UPLOADED' | 'PROCESSING' | 'TRANSCRIBING' | 'IDENTIFYING_SPEAKERS' | 'ANALYZING' | 'VALIDATING' | 'COMPLETED' | 'FAILED';
export type Classification = 'HIGHLY_CONFIDENTIAL' | 'INTERNAL' | 'GENERAL';
export type StoragePolicy = 'LOCAL_ONLY' | 'CLOUD' | 'LOCAL_AND_CLOUD';
export type StorageMode = 'LOCAL_ONLY' | 'CLOUD' | 'LOCAL_AND_CLOUD';
export type MeetingSource = 'OFFLINE_RECORDING' | 'GOOGLE_MEET' | 'MICROSOFT_TEAMS' | 'ONEDRIVE' | 'UPLOADED_RECORDING';
export type AIProcessingMode = 'LOCAL_LLM' | 'CLOUD_LLM' | 'HYBRID';
export type CloudSyncScope = 'SUMMARY_AND_ACTIONS' | 'TRANSCRIPT' | 'FULL_MEETING';
export type InterfaceMode = 'LOCAL' | 'ONLINE';
export type GoalStatus = 'ACTIVE' | 'AT_RISK' | 'COMPLETED' | 'ARCHIVED';
export type ProcessingMode = 'REAL_AI' | 'DEMO_FALLBACK';

export interface ProviderStatus {
  provider_id: string;
  name: string;
  icon: string;
  is_configured: boolean;
  status_message: string;
  auth_type: string;
  supported_features: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  org_id: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  meeting_date: string;
  duration_seconds?: number;
  classification: Classification;
  storage_policy: StoragePolicy;
  storage_mode?: StorageMode;
  meeting_source?: MeetingSource;
  ai_processing_mode?: AIProcessingMode;
  cloud_sync_scope?: CloudSyncScope;
  cloud_synced?: boolean;
  cloud_synced_at?: string;
  cloud_provider?: string;
  meeting_url?: string;
  status: MeetingStatus;
  processing_mode?: ProcessingMode;
  summary?: string;
  key_points?: string[];
  sentiment_overall?: string;
  created_at: string;
  decision_count: number;
  action_count: number;
  unresolved_count: number;
  participant_count: number;
  risks?: string[];
  follow_up_topics?: string[];
  processing_error?: string;
}

export interface TranscriptSegment {
  id: string;
  sequence: number;
  speaker_label?: string;
  speaker_name?: string;
  speaker_confidence?: number;
  start_time: number;
  end_time: number;
  text: string;
  confidence?: number;
}

export interface Decision {
  id: string;
  meeting_id: string;
  decision_text: string;
  evidence_text: string;
  evidence_segment_id?: string;
  evidence_timestamp?: number;
  participants_involved?: string[];
  hallucination_risk: boolean;
  requires_review: boolean;
  created_at: string;
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  org_id: string;
  action_text: string;
  owner_name?: string;
  owner_explicit: boolean;
  deadline_text?: string;
  deadline_date?: string;
  deadline_explicit: boolean;
  status: ActionStatus;
  evidence_text: string;
  evidence_segment_id?: string;
  evidence_timestamp?: number;
  confidence?: number;
  is_commitment: boolean;
  hallucination_risk: boolean;
  requires_review: boolean;
  parent_action_id?: string;
  times_carried_over: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  meeting_title?: string;
}

export interface UnresolvedItem {
  id: string;
  meeting_id: string;
  meeting_title?: string;
  item_type: 'OWNER' | 'DEADLINE' | 'DECISION' | 'ACTION' | 'CONFLICT';
  description: string;
  reason: string;
  evidence_text?: string;
  resolved: boolean;
  resolved_at?: string;
  resolution_note?: string;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  status: GoalStatus;
  progress_pct: number;
  created_at: string;
  action_count: number;
  completed_action_count: number;
}

export interface Speaker {
  id: string;
  display_name: string;
  employee_id?: string;
  department?: string;
  role_title?: string;
  voice_enrolled: boolean;
  enrollment_status: string;
  user_id?: string;
}

export interface DashboardStats {
  total_meetings: number;
  total_actions: number;
  completed_actions: number;
  in_progress_actions: number;
  new_actions: number;
  overdue_actions: number;
  unresolved_actions: number;
  active_goals: number;
  completion_rate: number;
  recent_meetings: Meeting[];
  overdue_actions_list: ActionItem[];
  active_goals_list: Goal[];
}

export interface SearchResult {
  type: 'meeting' | 'action' | 'decision' | 'transcript';
  id: string;
  title: string;
  snippet: string;
  meeting_id?: string;
  meeting_title?: string;
  score: number;
}

export interface AIStatus {
  ollama_available: boolean;
  model_name: string;
  whisper_available: boolean;
  speaker_diarization_available: boolean;
  processing_mode: 'REAL_AI' | 'DEMO_FALLBACK';
}

export interface AnalyticsData {
  action_completion_rate: number;
  overdue_rate: number;
  avg_completion_days?: number;
  actions_per_meeting: number;
  unresolved_rate: number;
  monthly_meetings: Array<{ month: string; meetings: number }>;
  status_distribution: Record<ActionStatus, number>;
  department_distribution: Array<{ department: string; actions: number }>;
  goal_progress: Array<{ title: string; progress: number; status: string }>;
}

export interface ActionHistory {
  id: string;
  old_status?: string;
  new_status?: string;
  change_type: string;
  note?: string;
  meeting_id?: string;
  created_at: string;
}

export interface Participant {
  id: string;
  name: string;
  speaker_label?: string;
  identified: boolean;
  user_id?: string;
}
