// Speakers Page
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Mic, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { speakersApi } from '../services/api';

export default function SpeakersPage() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ display_name: '', employee_id: '', department: '', role_title: '' });
  const qc = useQueryClient();

  const { data: speakers = [], isLoading } = useQuery({
    queryKey: ['speakers'],
    queryFn: speakersApi.list,
  });

  const createMutation = useMutation({
    mutationFn: speakersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['speakers'] });
      setShowNew(false);
      setForm({ display_name: '', employee_id: '', department: '', role_title: '' });
      toast.success('Speaker profile created');
    },
  });

  return (
    <div className="space-y-5 animate-fade">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Speaker Profiles</h1>
          <p className="text-surface-400 text-sm mt-0.5">
            Voice profiles for automatic speaker identification during meeting processing
          </p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Speaker
        </button>
      </div>

      {/* Info box */}
      <div className="card border-brand-500/20 bg-brand-950/10">
        <div className="flex items-start gap-3">
          <Mic className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-brand-300">Voice Enrollment</div>
            <p className="text-xs text-surface-400 mt-0.5">
              Enrolled speakers are automatically identified during audio processing.
              Unknown speakers are labeled "Unknown Speaker N" — never incorrectly attributed.
              Speaker recognition requires a voice sample upload (enterprise feature).
            </p>
          </div>
        </div>
      </div>

      {showNew && (
        <div className="card border-brand-500/20">
          <h3 className="text-sm font-semibold text-surface-200 mb-4">New Speaker Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" placeholder="Arun Kumar"
                value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Employee ID</label>
              <input className="input" placeholder="EMP-001"
                value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" placeholder="Engineering"
                value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <label className="label">Role Title</label>
              <input className="input" placeholder="Engineering Manager"
                value={form.role_title} onChange={e => setForm({ ...form, role_title: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-primary" disabled={createMutation.isPending || !form.display_name}
              onClick={() => createMutation.mutate(form)}>
              {createMutation.isPending ? 'Creating…' : 'Create Profile'}
            </button>
            <button className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {speakers.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-brand-700/50 rounded-full flex items-center justify-center text-base font-bold text-brand-300">
                  {s.display_name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-surface-100">{s.display_name}</div>
                  <div className="text-2xs text-surface-500">{s.role_title}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-surface-400">
                {s.employee_id && <div>ID: <span className="text-surface-300">{s.employee_id}</span></div>}
                {s.department && <div>Dept: <span className="text-surface-300">{s.department}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t border-surface-700 flex items-center gap-2">
                {s.voice_enrolled ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Voice Enrolled
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <XCircle className="w-3.5 h-3.5" />
                    Not Enrolled
                  </div>
                )}
                <span className={`ml-auto text-2xs px-2 py-0.5 rounded-full ${
                  s.enrollment_status === 'ENROLLED' ? 'bg-emerald-500/10 text-emerald-400' :
                  s.enrollment_status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-surface-700 text-surface-400'
                }`}>
                  {s.enrollment_status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
