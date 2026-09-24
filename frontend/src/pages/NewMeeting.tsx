// New Meeting Page — with audio upload and classification
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Upload, Mic, Shield, Lock, Cloud, HardDrive, FileAudio, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { meetingsApi, goalsApi } from '../services/api';

export default function NewMeetingPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    meeting_date: new Date().toISOString().slice(0, 16),
    classification: 'INTERNAL',
    storage_policy: 'LOCAL_ONLY',
    goal_id: '',
    participant_names: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'processing'>('form');
  const [processingSteps, setProcessingSteps] = useState<Array<{ label: string; done: boolean; active: boolean }>>([]);

  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: goalsApi.list });

  const createMtg = useMutation({
    mutationFn: meetingsApi.create,
    onSuccess: async (m) => {
      setMeetingId(m.id);
      if (audioFile) {
        try {
          await meetingsApi.uploadAudio(m.id, audioFile);
          toast.success('Audio uploaded');
        } catch {
          toast.error('Audio upload failed, processing without audio');
        }
      }
      // Start processing
      setStep('processing');
      simulateProcessing(m.id);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create meeting'),
  });

  async function simulateProcessing(id: string) {
    const steps = [
      'Audio uploaded',
      'Audio preprocessed',
      'Speakers detected',
      'Transcript generated',
      'AI analysis completed',
      'Evidence validated',
      'Accountability records created',
    ];
    
    const stepsState = steps.map((label, i) => ({ label, done: false, active: i === 0 }));
    setProcessingSteps(stepsState);
    
    // Trigger backend processing
    try {
      await meetingsApi.process(id);
    } catch {}
    
    // Simulate step progression
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
      setProcessingSteps(prev => prev.map((s, j) => ({
        ...s,
        done: j <= i,
        active: j === i + 1,
      })));
    }
    
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Meeting processed successfully!');
    navigate(`/meetings/${id}`);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return toast.error('Title is required');
    
    createMtg.mutate({
      ...form,
      participant_names: form.participant_names.split(',').map(n => n.trim()).filter(Boolean),
      goal_id: form.goal_id || undefined,
    });
  };

  // Auto-set storage policy for highly confidential
  const handleClassificationChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      classification: val,
      storage_policy: val === 'HIGHLY_CONFIDENTIAL' ? 'LOCAL_ONLY' : prev.storage_policy,
    }));
  };

  if (step === 'processing') {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card mt-12">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-surface-100">Processing Meeting</h2>
            <p className="text-surface-400 text-sm mt-1">AI pipeline running…</p>
          </div>
          
          <div className="space-y-3">
            {processingSteps.map((s, i) => (
              <div key={i} className={`process-step ${s.done ? 'process-step-done' : s.active ? 'process-step-active' : 'process-step-pending'}`}>
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  {s.done ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.active ? (
                    <div className="w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-surface-600" />
                  )}
                </div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-50">New Meeting</h1>
        <p className="text-surface-400 text-sm mt-0.5">Configure and process a meeting for AI accountability tracking</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-surface-200 border-b border-surface-700 pb-3">Meeting Details</h2>
          
          <div>
            <label className="label">Meeting Title *</label>
            <input className="input" placeholder="e.g. Q4 Product Strategy Meeting"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          
          <div>
            <label className="label">Description</label>
            <textarea className="textarea" rows={3} placeholder="Brief description of the meeting agenda…"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Meeting Date & Time</label>
              <input type="datetime-local" className="input"
                value={form.meeting_date} onChange={e => setForm({ ...form, meeting_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Company Goal (optional)</label>
              <select className="select" value={form.goal_id} onChange={e => setForm({ ...form, goal_id: e.target.value })}>
                <option value="">— No goal linked —</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          </div>
          
          <div>
            <label className="label">Participants (comma-separated)</label>
            <input className="input" placeholder="Arun Kumar, Priya Sharma, Rahul Verma"
              value={form.participant_names} onChange={e => setForm({ ...form, participant_names: e.target.value })} />
          </div>
        </div>
        
        {/* Classification & Storage */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-surface-200 border-b border-surface-700 pb-3">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-brand-400" />Privacy & Classification</div>
          </h2>
          
          <div>
            <label className="label">Meeting Classification</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { val: 'HIGHLY_CONFIDENTIAL', label: 'Highly Confidential', desc: 'Sensitive data', color: 'border-red-500/30 bg-red-900/10', active: 'border-red-500' },
                { val: 'INTERNAL', label: 'Internal', desc: 'Team only', color: 'border-surface-600 bg-surface-700/30', active: 'border-brand-500' },
                { val: 'GENERAL', label: 'General', desc: 'Not sensitive', color: 'border-surface-600 bg-surface-700/30', active: 'border-emerald-500' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleClassificationChange(opt.val)}
                  className={`p-3 rounded-lg border text-left transition-all ${form.classification === opt.val ? opt.active : opt.color} hover:opacity-90`}
                >
                  <div className="text-xs font-semibold text-surface-200">{opt.label}</div>
                  <div className="text-2xs text-surface-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="label">Storage Policy</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { val: 'LOCAL_ONLY', icon: HardDrive, label: 'Local Only', desc: 'Data stays on your server', disabled: false },
                { val: 'LOCAL_AND_CLOUD', icon: Cloud, label: 'Local + Cloud', desc: 'Synced to cloud backup', disabled: form.classification === 'HIGHLY_CONFIDENTIAL' },
                { val: 'CLOUD', icon: Cloud, label: 'Cloud Only', desc: 'Stored in cloud', disabled: form.classification === 'HIGHLY_CONFIDENTIAL' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && setForm({ ...form, storage_policy: opt.val })}
                  className={`p-3 rounded-lg border text-left transition-all ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'} ${form.storage_policy === opt.val ? 'border-brand-500 bg-brand-900/20' : 'border-surface-600 bg-surface-700/30'}`}
                >
                  <opt.icon className="w-3.5 h-3.5 text-surface-400 mb-1" />
                  <div className="text-xs font-semibold text-surface-200">{opt.label}</div>
                  <div className="text-2xs text-surface-500">{opt.disabled ? '🔒 Restricted' : opt.desc}</div>
                </button>
              ))}
            </div>
            {form.classification === 'HIGHLY_CONFIDENTIAL' && (
              <p className="text-2xs text-amber-400 mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Highly Confidential meetings are always stored locally only.
              </p>
            )}
          </div>
        </div>
        
        {/* Audio Upload */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-surface-200 border-b border-surface-700 pb-3">
            <div className="flex items-center gap-2"><Mic className="w-4 h-4 text-brand-400" />Audio Input</div>
          </h2>
          
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".wav,.mp3,.m4a,.webm,.ogg"
              className="hidden"
              onChange={e => setAudioFile(e.target.files?.[0] || null)}
            />
            {audioFile ? (
              <div className="flex items-center gap-3 p-4 bg-surface-700/50 border border-surface-600 rounded-lg">
                <FileAudio className="w-5 h-5 text-brand-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-200 truncate">{audioFile.name}</div>
                  <div className="text-2xs text-surface-500">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button type="button" onClick={() => setAudioFile(null)} className="text-surface-400 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-surface-600 hover:border-brand-500 rounded-xl p-8 text-center transition-colors group"
              >
                <Upload className="w-8 h-8 text-surface-500 group-hover:text-brand-400 mx-auto mb-2 transition-colors" />
                <div className="text-sm font-medium text-surface-300 group-hover:text-surface-100">Upload Audio File</div>
                <div className="text-2xs text-surface-500 mt-1">WAV, MP3, M4A, WebM — max 100MB</div>
              </button>
            )}
            <p className="text-2xs text-surface-500 mt-2">
              No audio? The system will use demo AI extraction to demonstrate the pipeline.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button type="submit" className="btn-primary btn-lg flex-1 justify-center" disabled={createMtg.isPending}>
            {createMtg.isPending ? 'Creating…' : 'Create & Process Meeting'}
          </button>
          <button type="button" className="btn-secondary btn-lg" onClick={() => navigate('/meetings')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
