import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Database, HardDrive, FolderCheck, Lock, ShieldCheck, 
  FileText, Mic, CheckCircle2, RefreshCw
} from 'lucide-react';
import { storageApi } from '../services/api';

export const LocalStorage: React.FC = () => {
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['localStorageStats'],
    queryFn: storageApi.getLocalStats,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs">
              Local Storage Repository
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">On-Device Storage Confinement</h1>
          <p className="text-sm text-surface-400 mt-1">
            Physical directory structure and cryptographic confinement of offline and local meeting artifacts.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="btn bg-surface-800 hover:bg-surface-700 text-surface-300 px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5 bg-surface-900 border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400 uppercase font-semibold">Total Stored</span>
            <HardDrive className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats ? `${stats.total_size_mb} MB` : '...'}
          </div>
          <div className="text-2xs text-surface-400 mt-1">Across all local vaults</div>
        </div>

        <div className="card p-5 bg-surface-900 border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400 uppercase font-semibold">Files On-Disk</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats ? stats.file_count : '...'}
          </div>
          <div className="text-2xs text-surface-400 mt-1">Audio, transcripts & DB</div>
        </div>

        <div className="card p-5 bg-surface-900 border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400 uppercase font-semibold">Confinement</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">ENFORCED</div>
          <div className="text-2xs text-surface-400 mt-1">Zero cloud sync default</div>
        </div>

        <div className="card p-5 bg-surface-900 border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400 uppercase font-semibold">Storage Engine</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-white">SQLite + Local FS</div>
          <div className="text-2xs text-surface-400 mt-1">PostgreSQL ready schema</div>
        </div>
      </div>

      {/* Directory Hierarchy Tree */}
      <div className="card p-6 md:p-8 bg-surface-900 border-surface-700 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FolderCheck className="w-5 h-5 text-brand-400" />
          <span>Local Directory Hierarchy</span>
          <span className="font-mono text-xs text-surface-400 font-normal">
            ({stats?.root_path || './MeetGuardData'})
          </span>
        </h2>

        <div className="bg-surface-950 p-6 rounded-xl border border-surface-800 font-mono text-xs text-surface-300 space-y-2 overflow-x-auto">
          <div className="text-brand-300 font-bold flex items-center gap-1.5">
            📁 MeetGuardData/
            <span className="text-2xs text-surface-500 font-normal font-sans">[Configurable Local Storage Root]</span>
          </div>
          <div className="pl-6 border-l border-surface-800 space-y-2">
            <div>
              <span className="text-blue-300 font-semibold">📁 meetings/</span>
              <div className="pl-6 border-l border-surface-800 text-surface-400 space-y-1 mt-1">
                <div>📁 meeting_001/</div>
                <div className="pl-6 border-l border-surface-800 text-surface-500 space-y-0.5">
                  <div>🎵 audio/ <span className="text-2xs italic font-sans text-surface-600">(Protected raw microphone recordings)</span></div>
                  <div>📄 transcript/ <span className="text-2xs italic font-sans text-surface-600">(Speaker-attributed JSON segments)</span></div>
                  <div>🧠 analysis/ <span className="text-2xs italic font-sans text-surface-600">(Llama structured decision JSON)</span></div>
                  <div>🔍 evidence/ <span className="text-2xs italic font-sans text-surface-600">(Timestamped validation hashes)</span></div>
                </div>
              </div>
            </div>

            <div>
              <span className="text-purple-300 font-semibold">📁 database/</span>
              <div className="pl-6 border-l border-surface-800 text-surface-400 mt-1">
                💾 meetguard.db <span className="text-2xs italic font-sans text-surface-600">(Encrypted SQLite enterprise database)</span>
              </div>
            </div>

            <div>
              <span className="text-emerald-300 font-semibold">📁 speakers/voice_profiles/</span>
              <div className="pl-6 border-l border-surface-800 text-surface-400 mt-1">
                🎙️ voice_embeddings.bin <span className="text-2xs italic font-sans text-surface-600">(Voiceprints for speaker identification)</span>
              </div>
            </div>

            <div>
              <span className="text-amber-300 font-semibold">📁 exports/</span>
              <div className="pl-6 border-l border-surface-800 text-surface-400 mt-1">
                📑 executive_briefs.json
              </div>
            </div>

            <div>
              <span className="text-surface-400 font-semibold">📁 logs/</span>
              <div className="pl-6 border-l border-surface-800 text-surface-500 mt-1">
                🛡️ audit_trail.log
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LocalStorage;
