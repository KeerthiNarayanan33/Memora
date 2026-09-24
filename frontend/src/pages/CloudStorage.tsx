import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Cloud, Shield, CheckCircle2, RefreshCw, UploadCloud, 
  ExternalLink, Lock, Settings2, Database, AlertCircle 
} from 'lucide-react';
import { meetingsApi } from '../services/api';
import toast from 'react-hot-toast';

export const CloudStorage: React.FC = () => {
  const [defaultScope, setDefaultScope] = useState('SUMMARY_AND_ACTIONS');

  const { data: meetings = [], isLoading, refetch } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => meetingsApi.list(),
  });

  const cloudMeetings = meetings.filter((m) => m.storage_policy === 'CLOUD' || m.storage_policy === 'LOCAL_AND_CLOUD' || m.cloud_synced);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs">
              Cloud Storage & Synchronization
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Controlled Cloud Sync & Egress Vault</h1>
          <p className="text-sm text-surface-400 mt-1">
            Configure selective synchronization to ensure raw confidential audio is never inadvertently uploaded.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="btn bg-surface-800 hover:bg-surface-700 text-surface-300 px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Selective Sync Policy Card */}
      <div className="card p-6 bg-surface-900 border-surface-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Default Synchronization Scope</h2>
              <p className="text-xs text-surface-400">Determines which extracted artifacts are synchronized when Cloud storage is selected.</p>
            </div>
          </div>

          <select
            className="select text-xs w-64"
            value={defaultScope}
            onChange={(e) => {
              setDefaultScope(e.target.value);
              toast.success(`Default cloud sync scope set to: ${e.target.value}`);
            }}
          >
            <option value="SUMMARY_AND_ACTIONS">Summary & Actions Only (Recommended)</option>
            <option value="TRANSCRIPT">Summary, Actions & Transcript</option>
            <option value="FULL_MEETING">Full Meeting Record (Audio excluded)</option>
          </select>
        </div>

        <div className="bg-surface-950 p-4 rounded-xl border border-surface-800 flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-surface-300 space-y-1">
            <span className="font-semibold text-white">Zero Raw Audio Egress Guarantee:</span>
            <p className="text-surface-400">
              Raw audio recording files (.wav, .mp3, .webm) are strictly confined to the local filesystem and are never included in cloud synchronization payloads, protecting acoustic biometric integrity.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud-Synced Meetings List */}
      <div className="card p-6 bg-surface-900 border-surface-700 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-purple-400" />
            <span>Cloud-Synchronized Meetings ({cloudMeetings.length})</span>
          </div>
        </h2>

        {cloudMeetings.length === 0 ? (
          <div className="text-center py-10 text-surface-400 text-sm">
            No meetings have been synchronized to cloud. All meetings are currently stored strictly local.
          </div>
        ) : (
          <div className="divide-y divide-surface-800">
            {cloudMeetings.map((m) => (
              <div key={m.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{m.title}</span>
                    <span className="badge bg-purple-500/15 text-purple-300 border border-purple-500/20 text-2xs">
                      {m.meeting_source ? m.meeting_source.replace('_', ' ') : 'ONLINE'}
                    </span>
                    <span className="badge bg-emerald-500/15 text-emerald-400 text-2xs">
                      SYNCED
                    </span>
                  </div>
                  <div className="text-xs text-surface-400">
                    Sync Scope: <span className="text-surface-300">{m.cloud_sync_scope || 'SUMMARY_AND_ACTIONS'}</span> | Synced at: {m.cloud_synced_at ? new Date(m.cloud_synced_at).toLocaleString() : new Date(m.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/meetings/${m.id}`}
                    className="btn bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <span>View Record</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default CloudStorage;
