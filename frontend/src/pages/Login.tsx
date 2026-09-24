// Login Page — Premium Enterprise Auth
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Zap, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const DEMO_ACCOUNTS = [
  { email: 'admin@techcorp.example', password: 'admin123', role: 'Admin', name: 'Admin User' },
  { email: 'arun@techcorp.example', password: 'arun123', role: 'Manager', name: 'Arun Kumar' },
  { email: 'priya@techcorp.example', password: 'priya123', role: 'Manager', name: 'Priya Sharma' },
  { email: 'rahul@techcorp.example', password: 'rahul123', role: 'Member', name: 'Rahul Verma' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('admin@techcorp.example');
  const [password, setPassword] = useState('admin123');
  const [showPass, setShowPass] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (data) => {
      login(data.access_token, data.user);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Invalid credentials');
    },
  });

  const quickLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-[45%] bg-surface-900 border-r border-surface-800 p-12 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(to right, #64748b 1px, transparent 1px), linear-gradient(to bottom, #64748b 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
        
        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-white tracking-tight">MeetGuard AI</div>
            <div className="text-xs text-surface-500">Enterprise Intelligence Platform</div>
          </div>
        </div>
        
        <div className="mt-16 relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight">
            From conversations<br />
            to <span className="text-gradient">commitments.</span>
          </h1>
          <p className="mt-4 text-surface-400 text-lg leading-relaxed">
            Transform enterprise meetings into verified decisions, accountable actions, and tracked outcomes — with full evidence trail.
          </p>
        </div>
        
        {/* Feature highlights */}
        <div className="mt-12 space-y-4 relative z-10">
          {[
            { dot: 'bg-brand-500', text: 'Privacy-first local AI processing' },
            { dot: 'bg-purple-500', text: 'Speaker-aware intelligence with voice profiles' },
            { dot: 'bg-emerald-500', text: 'Evidence-backed zero-hallucination extraction' },
            { dot: 'bg-amber-500', text: 'Cross-meeting accountability tracking' },
            { dot: 'bg-cyan-500', text: 'Company goal alignment' },
          ].map(({ dot, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
              <span className="text-surface-300 text-sm">{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div className="mt-auto pt-8 relative z-10 border-t border-surface-700">
          <p className="text-surface-500 text-sm italic">
            "Meetings should not end when the meeting ends."
          </p>
        </div>
      </div>
      
      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-xl font-bold text-white">MeetGuard AI</div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-surface-50">Sign in to your account</h2>
            <p className="text-surface-400 text-sm mt-1">Enterprise Meeting Intelligence Platform</p>
          </div>
          
          <form
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
            className="space-y-4"
          >
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full justify-center btn-lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
          
          {/* Demo accounts */}
          <div className="border-t border-surface-800 pt-5">
            <p className="text-xs text-surface-500 text-center mb-3 uppercase tracking-wide font-medium">
              Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => quickLogin(acc)}
                  className="text-left p-3 bg-surface-800 hover:bg-surface-700 border border-surface-700 hover:border-surface-600 rounded-lg transition-all"
                >
                  <div className="text-xs font-semibold text-surface-200">{acc.name}</div>
                  <div className="text-2xs text-surface-500 mt-0.5">{acc.role}</div>
                </button>
              ))}
            </div>
            <p className="text-center text-2xs text-surface-600 mt-3">
              Click an account above to pre-fill credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
