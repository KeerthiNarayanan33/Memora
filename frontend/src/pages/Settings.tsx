// Settings Page — Organization & User Settings
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Building2, Shield, Clock, Users, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, digestApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestText, setDigestText] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.listUsers,
    enabled: user?.role === 'ADMIN',
  });

  const getDigest = async () => {
    setDigestLoading(true);
    try {
      const data = await digestApi.weekly();
      setDigestText(data.digest_text);
    } catch {
      toast.error('Failed to generate digest');
    } finally {
      setDigestLoading(false);
    }
  };

  const copyDigest = () => {
    navigator.clipboard.writeText(digestText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Digest copied!');
  };

  return (
    <div className="space-y-6 animate-fade max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Settings</h1>
        <p className="text-surface-400 text-sm mt-0.5">Organization configuration and system preferences</p>
      </div>

      {/* Organization */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-700">
          <Building2 className="w-4 h-4 text-brand-400" />
          <h2 className="text-base font-semibold text-surface-200">Organization</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="label">Organization Name</div>
            <div className="text-surface-200 font-medium">TechCorp Innovation Ltd.</div>
          </div>
          <div>
            <div className="label">Domain</div>
            <div className="text-surface-200">techcorp.example</div>
          </div>
          <div>
            <div className="label">Storage Policy</div>
            <div className="text-surface-200 font-medium">LOCAL ONLY</div>
          </div>
          <div>
            <div className="label">Data Retention</div>
            <div className="text-surface-200">90 days</div>
          </div>
        </div>
      </div>

      {/* Demo accounts */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-700">
          <Users className="w-4 h-4 text-brand-400" />
          <h2 className="text-base font-semibold text-surface-200">Team Members</h2>
        </div>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 bg-brand-700/50 rounded-full flex items-center justify-center text-sm font-bold text-brand-300">
                {u.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-surface-200">{u.name}</div>
                <div className="text-2xs text-surface-500">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xs text-surface-500">{u.department}</span>
                <span className={`text-2xs px-2 py-0.5 rounded-full ${
                  u.role === 'ADMIN' ? 'bg-red-500/10 text-red-400' :
                  u.role === 'MANAGER' ? 'bg-brand-500/10 text-brand-400' :
                  'bg-surface-700 text-surface-400'
                }`}>{u.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly digest */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-700">
          <Clock className="w-4 h-4 text-brand-400" />
          <h2 className="text-base font-semibold text-surface-200">Accountability Digest</h2>
        </div>
        <p className="text-sm text-surface-400 mb-4">
          Generate a weekly accountability digest showing completed, in-progress, overdue, and unresolved actions.
          Copy and share via Slack or email (external integrations not configured).
        </p>
        <button onClick={getDigest} disabled={digestLoading} className="btn-primary">
          {digestLoading ? 'Generating…' : 'Generate Weekly Digest'}
        </button>
        {digestText && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-surface-400 font-medium">Weekly Digest</div>
              <button onClick={copyDigest} className="btn-secondary btn-sm">
                {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <pre className="bg-surface-900 border border-surface-700 rounded-lg p-4 text-xs text-surface-300 whitespace-pre-wrap font-mono overflow-x-auto">
              {digestText}
            </pre>
          </div>
        )}
      </div>

      {/* AI Configuration */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-700">
          <Shield className="w-4 h-4 text-brand-400" />
          <h2 className="text-base font-semibold text-surface-200">AI Configuration</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-surface-400">Ollama Endpoint</span>
            <code className="text-surface-300 bg-surface-900 px-2 py-0.5 rounded text-xs">http://localhost:11434</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-surface-400">LLM Model</span>
            <code className="text-surface-300 bg-surface-900 px-2 py-0.5 rounded text-xs">llama3.2</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-surface-400">Whisper Model</span>
            <code className="text-surface-300 bg-surface-900 px-2 py-0.5 rounded text-xs">base</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-surface-400">External API Calls</span>
            <span className="text-emerald-400 text-xs font-semibold">NONE — Privacy First</span>
          </div>
        </div>
        <p className="text-2xs text-surface-500 mt-4">
          Edit AI settings in <code className="bg-surface-900 px-1 rounded">.env</code> file and restart the backend.
        </p>
      </div>
    </div>
  );
}
