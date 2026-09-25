import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Video, Cloud, Shield, Lock, ArrowRight, UploadCloud, 
  ExternalLink, CheckCircle2, AlertCircle, Cpu, Loader2, Database
} from 'lucide-react';
import { providersApi } from '../services/api';
import toast from 'react-hot-toast';

export const GoogleMeetHub: React.FC = () => {
  const navigate = useNavigate();

  // Selected Provider
  const [selectedProvider, setSelectedProvider] = useState<'GOOGLE_MEET' | 'MICROSOFT_TEAMS' | 'ONEDRIVE' | 'UPLOADED_RECORDING'>('GOOGLE_MEET');

  // Form State
  const [meetingTitle, setMeetingTitle] = useState('Google Meet: Sprint Review & Architecture');
  const [meetingUrl, setMeetingUrl] = useState('https://meet.google.com/xyz-tech-q3');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 16));
  const [classification, setClassification] = useState('GENERAL');
  const [storageMode, setStorageMode] = useState('CLOUD');
  const [cloudSyncScope, setCloudSyncScope] = useState('SUMMARY_AND_ACTIONS');
  const [participants, setParticipants] = useState('Arun Kumar, Priya Sharma, Rahul Verma');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Providers
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
  });

  const activeProvider = providers.find((p) => p.provider_id === selectedProvider) || {
    name: 'Google Meet',
    is_configured: false,
    status_message: 'Google Meet integration not configured (Requires OAuth 2.0 Client Credentials)',
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const pNames = participants.split(',').map((p) => p.trim()).filter(Boolean);
      const meeting = await providersApi.importOnline({
        provider: selectedProvider,
        title: meetingTitle,
        meeting_url: meetingUrl,
        meeting_date: new Date(meetingDate).toISOString(),
        classification,
        ai_processing_mode: 'LOCAL_LLM', // Critical: Local AI extraction
        storage_mode: storageMode,
        cloud_sync_scope: cloudSyncScope,
        participant_names: pNames,
      });

      toast.success(`Online meeting imported! Local Llama processing started.`);
      navigate(`/meetings/${meeting.id}`);
    } catch (err: any) {
      toast.error('Import failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs">
              Online Meeting Hub
            </span>
            <span className="text-xs text-surface-400">|</span>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              Local AI Engine Enforced
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Google Meet & Online Meetings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Import online meetings while retaining 100% of your AI intelligence processing inside your local Llama model.
          </p>
        </div>
      </div>

      {/* Visual Pipeline Architecture Graphic */}
      <div className="card p-6 bg-white border-slate-200 shadow-xs">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">
          Online Meeting Intelligence Data Flow
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center text-center">
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
            <Video className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-xs font-bold text-slate-800">Google Meet</div>
            <div className="text-2xs text-slate-500">Online Source</div>
          </div>
          <div className="text-slate-400 hidden md:block text-sm">→</div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <Cpu className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-xs font-bold text-blue-700">Local Llama</div>
            <div className="text-2xs text-emerald-600 font-semibold">On-Device AI</div>
          </div>
          <div className="text-slate-400 hidden md:block text-sm">→</div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <Shield className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <div className="text-xs font-bold text-slate-800">Zero-Hallucination</div>
            <div className="text-2xs text-slate-500">Evidence Verify</div>
          </div>
          <div className="text-slate-400 hidden md:block text-sm">→</div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <Database className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <div className="text-xs font-bold text-slate-800">{storageMode.replace('_', ' ')}</div>
            <div className="text-2xs text-slate-500">Storage Policy</div>
          </div>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: 'GOOGLE_MEET', label: 'Google Meet', icon: Video, color: 'text-purple-600' },
          { id: 'MICROSOFT_TEAMS', label: 'Microsoft Teams', icon: Video, color: 'text-blue-600' },
          { id: 'ONEDRIVE', label: 'OneDrive Vault', icon: Cloud, color: 'text-indigo-600' },
          { id: 'UPLOADED_RECORDING', label: 'Online Audio Upload', icon: UploadCloud, color: 'text-emerald-600' },
        ].map((prov) => {
          const Icon = prov.icon;
          const isSelected = selectedProvider === prov.id;
          return (
            <button
              key={prov.id}
              onClick={() => setSelectedProvider(prov.id as any)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-purple-50/60 border-purple-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${prov.color}`} />
              <div className="text-sm font-bold text-slate-900">{prov.label}</div>
              <div className="text-2xs text-slate-500">Provider Abstraction</div>
            </button>
          );
        })}
      </div>

      {/* Honest Provider Status Alert */}
      <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-slate-800">
            Provider Integration Status: <span className="text-amber-800 font-semibold">{activeProvider.name}</span>
          </div>
          <p className="text-slate-600">
            {activeProvider.status_message}
          </p>
          <p className="text-slate-600">
            You can use the <strong className="text-slate-900 font-bold">Import Meeting Recording / URL</strong> workflow below to test and demo the complete online intelligence pipeline.
          </p>
        </div>
      </div>

      {/* Import Form */}
      <form onSubmit={handleImport} className="card p-6 md:p-8 space-y-6 border-slate-200 bg-white shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>Import Online Meeting into Local Intelligence</span>
          <span className="badge bg-purple-50 text-purple-700 border border-purple-200 text-2xs font-semibold">Live Workflow</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Meeting Title</label>
            <input
              type="text"
              required
              className="input font-medium"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Meeting URL (Google Meet / Teams)</label>
            <input
              type="url"
              className="input font-mono text-xs"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div>
            <label className="label">Meeting Date & Time</label>
            <input
              type="datetime-local"
              required
              className="input"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Meeting Classification</label>
            <select
              className="select"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
            >
              <option value="GENERAL">General (Public / Client)</option>
              <option value="INTERNAL">Internal (Team Confidential)</option>
              <option value="HIGHLY_CONFIDENTIAL">Highly Confidential (Restricted)</option>
            </select>
          </div>
        </div>

        {/* 3-Axis Settings Display */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Enterprise Confinement Settings
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-2xs text-surface-400 block mb-1">AI Processing Location</span>
              <div className="inline-flex items-center gap-1.5 badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs py-1 px-2.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>LOCAL LLAMA (Ollama)</span>
              </div>
            </div>

            <div>
              <label className="text-2xs text-surface-400 block mb-1">Storage Mode</label>
              <select
                className="select text-xs py-1"
                value={storageMode}
                onChange={(e) => setStorageMode(e.target.value)}
              >
                <option value="CLOUD">Cloud (Enterprise Vault)</option>
                <option value="LOCAL_ONLY">Local Only (This Device)</option>
                <option value="LOCAL_AND_CLOUD">Local + Cloud</option>
              </select>
            </div>

            <div>
              <label className="text-2xs text-surface-400 block mb-1">Cloud Sync Scope</label>
              <select
                className="select text-xs py-1"
                value={cloudSyncScope}
                onChange={(e) => setCloudSyncScope(e.target.value)}
                disabled={storageMode === 'LOCAL_ONLY'}
              >
                <option value="SUMMARY_AND_ACTIONS">Summary & Actions Only (Recommended)</option>
                <option value="TRANSCRIPT">Include Transcript</option>
                <option value="FULL_MEETING">Full Meeting Record</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Meeting Participants</label>
          <input
            type="text"
            className="input"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="Comma separated names"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Importing & Launching Local AI Pipeline...</span>
            </>
          ) : (
            <>
              <span>Import & Run Local AI Pipeline</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
export default GoogleMeetHub;
