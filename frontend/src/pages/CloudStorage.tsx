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
            <span className="badge bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
              Cloud Storage & Synchronization
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Controlled Cloud Sync & Egress Vault</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure selective synchronization to ensure raw confidential audio is never inadvertently uploaded.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Selective Sync Policy Card */}
      <div className="card p-6 bg-white border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Default Synchronization Scope</h2>
              <p className="text-xs text-slate-500">Determines which extracted artifacts are synchronized when Cloud storage is selected.</p>
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

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <span className="font-bold text-slate-900">Zero Raw Audio Egress Guarantee:</span>
            <p className="text-slate-600">
              Raw audio recording files (.wav, .mp3, .webm) are strictly confined to the local filesystem and are never included in cloud synchronization payloads, protecting acoustic biometric integrity.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud-Synced Meetings List */}
      <div className="card p-6 bg-white border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-purple-600" />
            <span>Cloud-Synchronized Meetings ({cloudMeetings.length})</span>
          </div>
        </h2>

        {cloudMeetings.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No meetings have been synchronized to cloud. All meetings are currently stored strictly local.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cloudMeetings.map((m) => (
              <div key={m.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{m.title}</span>
                    <span className="badge bg-purple-50 text-purple-700 border border-purple-200 text-2xs font-semibold">
                      {m.meeting_source ? m.meeting_source.replace('_', ' ') : 'ONLINE'}
                    </span>
                    <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-semibold">
                      SYNCED
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Sync Scope: <span className="text-slate-700 font-medium">{m.cloud_sync_scope || 'SUMMARY_AND_ACTIONS'}</span> | Synced at: {m.cloud_synced_at ? new Date(m.cloud_synced_at).toLocaleString() : new Date(m.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/meetings/${m.id}`}
                    className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium"
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
