import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Laptop, Video, Cloud, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useInterfaceStore } from '../stores/interfaceStore';

export const InterfaceLanding: React.FC = () => {
  const navigate = useNavigate();
  const { setMode } = useInterfaceStore();

  const handleSelect = (mode: 'LOCAL' | 'ONLINE') => {
    setMode(mode);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between z-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              MeetGuard AI
              <span className="text-2xs bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded-full font-mono">
                v2.0
              </span>
            </h1>
            <p className="text-xs text-surface-400">From conversations to commitments.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-400 bg-surface-900 border border-surface-700 px-3 py-1.5 rounded-full">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local AI Intelligence Boundary</span>
        </div>
      </header>

      {/* Main Selector Content */}
      <main className="max-w-5xl mx-auto w-full my-auto py-8 z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            HOW DO YOU WANT TO USE <span className="text-gradient">MEETGUARD AI</span>?
          </h2>
          <p className="text-base text-surface-300 max-w-xl mx-auto">
            Choose how your meeting is being conducted. Select Local for sensitive discussions or Online for Google Meet workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* CARD 1: LOCAL INTERFACE */}
          <div className="card hover:border-brand-500/50 transition-all duration-300 flex flex-col justify-between p-8 bg-surface-900/90 border-surface-700/80 hover:shadow-2xl hover:shadow-brand-500/10 group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform">
                  <Laptop className="w-7 h-7" />
                </div>
                <span className="badge bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs px-3 py-1">
                  Offline / Local
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Local Interface</h3>
              <p className="text-sm text-surface-300 mb-6 leading-relaxed">
                For highly confidential meetings occurring in physical conference rooms or labs. Record and process meetings directly on your device using local AI.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2.5 text-sm text-surface-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Works directly on your PC / laptop</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-surface-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Uses local Llama via Ollama (Zero Cloud)</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-surface-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Stores data inside your local MeetGuard folder</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-surface-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Best for highly confidential & board meetings</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelect('LOCAL')}
              className="w-full btn-primary py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 group-hover:bg-brand-500"
            >
              <span>Open Local Interface</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* CARD 2: ONLINE INTERFACE */}
          <div className="card hover:border-purple-500/50 transition-all duration-300 flex flex-col justify-between p-8 bg-surface-900/90 border-surface-700/80 hover:shadow-2xl hover:shadow-purple-500/10 group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Video className="w-7 h-7" />
                </div>
                <span className="badge bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs px-3 py-1">
                  Online / Cloud
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Google & Online Interface</h3>
              <p className="text-sm text-surface-300 mb-6 leading-relaxed">
                Process meetings from Google Meet, Microsoft Teams, and cloud recordings while keeping AI processing local and controlling cloud sync scope.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2.5 text-sm text-surface-200">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Integrates with Google Meet & Teams workflows</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-surface-200">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>OneDrive & Cloud meeting audio/video support</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-surface-200">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>AI processing still executes via Local Llama</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-surface-200">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Best for general, customer, and team standups</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelect('ONLINE')}
              className="w-full btn bg-purple-600 hover:bg-purple-500 text-white py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all"
            >
              <span>Open Online Interface</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Value Proposition Callout */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 bg-surface-900/60 border border-surface-800 rounded-full px-5 py-2 text-xs text-surface-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Your meeting. Your data. Your choice.</span>
            <span className="text-surface-500">|</span>
            <span>Local AI extraction active by default across both interfaces</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 max-w-5xl mx-auto w-full text-center text-xs text-surface-500 pt-4 border-t border-surface-800/60">
        <p>MeetGuard AI — Enterprise Meeting-to-Accountability Platform. Built for KPR Hack the Horizon 2.0.</p>
      </footer>
    </div>
  );
};
export default InterfaceLanding;
