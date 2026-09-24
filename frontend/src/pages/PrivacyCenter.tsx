// Privacy Center Page — One of the visually strongest pages
import { useQuery } from '@tanstack/react-query';
import { Shield, HardDrive, Cpu, Cloud, Lock, Eye, ClipboardList, CheckCircle, AlertTriangle } from 'lucide-react';
import { aiApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function PrivacyCenterPage() {
  const { user } = useAuthStore();
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: aiApi.status,
  });

  const org = { name: 'TechCorp Innovation Ltd.', storage_policy: 'LOCAL_ONLY', retention_days: 90 };

  return (
    <div className="space-y-6 animate-fade max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Privacy Center</h1>
        <p className="text-surface-400 text-sm mt-0.5">Data privacy, security controls, and processing transparency</p>
      </div>

      {/* Main security status */}
      <div className="card border-emerald-500/20 bg-emerald-950/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-emerald-300">Secure Local Processing</h2>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-surface-400 text-sm mt-0.5">
              All meeting data is processed locally. No data leaves your controlled environment.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <PrivacyCard
          icon={<Cpu className="w-5 h-5" />}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
          title="AI Processing"
          value={aiStatus?.ollama_available ? 'LOCAL LLAMA' : 'DEMO FALLBACK'}
          status={aiStatus?.ollama_available ? 'secure' : 'info'}
          detail={aiStatus?.ollama_available
            ? `Model: ${aiStatus.model_name} running on your server`
            : 'No external AI API calls — data stays local'}
        />
        <PrivacyCard
          icon={<HardDrive className="w-5 h-5" />}
          iconColor="text-brand-400"
          iconBg="bg-brand-500/10"
          title="Storage Location"
          value="LOCAL ONLY"
          status="secure"
          detail="Audio, transcripts, and AI outputs on your server"
        />
        <PrivacyCard
          icon={<Cloud className="w-5 h-5" />}
          iconColor="text-surface-400"
          iconBg="bg-surface-700/50"
          title="Cloud Sync"
          value="DISABLED"
          status="secure"
          detail="No cloud upload configured — policy: LOCAL_ONLY"
        />
        <PrivacyCard
          icon={<Eye className="w-5 h-5" />}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          title="Speech Processing"
          value={aiStatus?.whisper_available ? 'LOCAL WHISPER' : 'DEMO MODE'}
          status={aiStatus?.whisper_available ? 'secure' : 'info'}
          detail={aiStatus?.whisper_available
            ? 'faster-whisper running locally — no API calls'
            : 'Using pre-loaded demo transcripts'}
        />
        <PrivacyCard
          icon={<Lock className="w-5 h-5" />}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          title="Authentication"
          value="JWT + BCRYPT"
          status="secure"
          detail="Tokens expire in 8h — passwords hashed with bcrypt"
        />
        <PrivacyCard
          icon={<ClipboardList className="w-5 h-5" />}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
          title="Audit Logging"
          value="ACTIVE"
          status="secure"
          detail="All actions logged with timestamp and user ID"
        />
      </div>

      {/* Data classification legend */}
      <div className="card">
        <h3 className="text-base font-semibold text-surface-200 mb-4">Data Classification Guide</h3>
        <div className="space-y-3">
          {[
            {
              cls: 'HIGHLY CONFIDENTIAL',
              bg: 'bg-red-900/20', border: 'border-red-500/30', text: 'text-red-300',
              storage: 'LOCAL ONLY (enforced)', ai: 'Local Llama only', cloud: 'BLOCKED',
              desc: 'Board discussions, salary data, M&A activity, legal matters',
            },
            {
              cls: 'INTERNAL',
              bg: 'bg-surface-800/50', border: 'border-surface-600', text: 'text-surface-200',
              storage: 'Local or Local+Cloud', ai: 'Local Llama preferred', cloud: 'Optional',
              desc: 'Team meetings, project planning, strategy reviews',
            },
            {
              cls: 'GENERAL',
              bg: 'bg-surface-800/30', border: 'border-surface-700', text: 'text-surface-300',
              storage: 'Any mode', ai: 'Any mode', cloud: 'Allowed',
              desc: 'Town halls, public demos, training sessions',
            },
          ].map(c => (
            <div key={c.cls} className={`p-4 rounded-xl border ${c.bg} ${c.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-bold ${c.text}`}>{c.cls}</span>
              </div>
              <p className="text-xs text-surface-400 mb-2">{c.desc}</p>
              <div className="flex gap-4 text-2xs text-surface-500">
                <span>Storage: <span className="text-surface-300">{c.storage}</span></span>
                <span>AI: <span className="text-surface-300">{c.ai}</span></span>
                <span>Cloud: <span className="text-surface-300">{c.cloud}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retention policy */}
      <div className="card">
        <h3 className="text-base font-semibold text-surface-200 mb-4">Data Retention Policy</h3>
        <div className="flex items-start gap-4">
          <div className="text-3xl font-bold text-brand-400">90</div>
          <div>
            <div className="text-sm font-medium text-surface-200">Days</div>
            <p className="text-xs text-surface-400 mt-0.5">
              Meeting recordings and transcripts retained for 90 days by default.
              Decisions and action items retained indefinitely for accountability.
              Configure per-meeting retention in Settings.
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
          ⚠ Data is never automatically deleted without administrator confirmation.
        </div>
      </div>

      {/* AI disclaimer */}
      <div className="card border-blue-500/20 bg-blue-950/10">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">AI Transparency</h3>
        <ul className="space-y-1.5 text-xs text-surface-400">
          <li>• The AI NEVER invents facts, people, deadlines, or decisions</li>
          <li>• Every extracted action item is backed by a transcript quote</li>
          <li>• Unverified items are explicitly marked as UNRESOLVED</li>
          <li>• AI suggestions for goal relationships are always labeled "AI Suggested" and require human confirmation</li>
          <li>• If Ollama is unavailable, DEMO FALLBACK is clearly labeled — never presented as real AI</li>
        </ul>
      </div>
    </div>
  );
}

function PrivacyCard({
  icon, iconColor, iconBg, title, value, status, detail,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  value: string;
  status: 'secure' | 'warning' | 'info';
  detail: string;
}) {
  const statusCfg = {
    secure: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Secure' },
    warning: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Warning' },
    info: { dot: 'bg-blue-400', text: 'text-blue-400', label: 'Info' },
  }[status];

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        <div>
          <div className="text-2xs text-surface-500 uppercase tracking-wide">{title}</div>
          <div className="text-sm font-bold text-surface-100">{value}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
        <span className={`text-2xs font-semibold ${statusCfg.text}`}>{statusCfg.label}</span>
      </div>
      <p className="text-2xs text-surface-500">{detail}</p>
    </div>
  );
}
