import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Laptop, Video, Mic, UploadCloud, Users, Shield, Cpu, 
  Database, Target, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Lock
} from 'lucide-react';
import { meetingsApi, goalsApi, speakersApi } from '../services/api';
import toast from 'react-hot-toast';

export const NewMeetingWizard: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Step (1 to 8)
  const [step, setStep] = useState(1);

  // Form State
  const [meetingType, setMeetingType] = useState<'OFFLINE' | 'ONLINE'>('OFFLINE');
  const [meetingSource, setMeetingSource] = useState('OFFLINE_RECORDING');
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 16));
  const [meetingUrl, setMeetingUrl] = useState('https://meet.google.com/ihf-rvix-cqx');
  const [participantInput, setParticipantInput] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(['Keerthi', 'Priya Sharma', 'Rahul Verma']);
  const [classification, setClassification] = useState('INTERNAL');
  const [aiProcessingMode, setAiProcessingMode] = useState('LOCAL_LLM');
  const [storageMode, setStorageMode] = useState('LOCAL_ONLY');
  const [goalId, setGoalId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query Goals & Speakers
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: goalsApi.list });
  const { data: speakers = [] } = useQuery({ queryKey: ['speakers'], queryFn: speakersApi.list });

  // Add participant
  const addParticipant = (name: string) => {
    if (name && !selectedParticipants.includes(name)) {
      setSelectedParticipants([...selectedParticipants, name]);
    }
  };

  const removeParticipant = (name: string) => {
    setSelectedParticipants(selectedParticipants.filter((p) => p !== name));
  };

  // Submit & Create Meeting
  const handleFinalSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a meeting title');
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const meeting = await meetingsApi.create({
        title: title.trim(),
        meeting_date: new Date(meetingDate).toISOString(),
        classification,
        storage_policy: storageMode,
        storage_mode: storageMode,
        meeting_source: meetingSource,
        ai_processing_mode: aiProcessingMode,
        meeting_url: meetingUrl || undefined,
        goal_id: goalId || undefined,
        participant_names: selectedParticipants,
      });

      toast.success('Meeting created successfully!');
      
      // If user chose microphone recording, direct them straight to live recording!
      if (meetingSource === 'OFFLINE_RECORDING' && meetingType === 'OFFLINE') {
        navigate('/record');
      } else {
        navigate(`/meetings/${meeting.id}`);
      }
    } catch (err: any) {
      toast.error('Failed to create meeting: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step Progress Bar */}
      <div className="card p-4 border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-bold text-slate-900">Step {step} of 8</span>
          <span className="font-medium text-slate-600">
            {step === 1 && 'Choose Meeting Type'}
            {step === 2 && 'Select Source'}
            {step === 3 && 'Participants'}
            {step === 4 && 'Meeting Classification'}
            {step === 5 && 'AI Processing Mode'}
            {step === 6 && 'Storage Policy'}
            {step === 7 && 'Company Goal Alignment'}
            {step === 8 && 'Review & Launch'}
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-brand-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 8) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="card p-6 md:p-8 space-y-6 border-slate-200 bg-white shadow-xs">
        {/* STEP 1: Meeting Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Step 1: Choose Meeting Type</h2>
              <p className="text-sm text-slate-500">Is this meeting conducted physically offline or hosted online?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Meeting Title</label>
                <input
                  type="text"
                  required
                  className="input font-semibold"
                  placeholder="e.g. Q4 Security Architecture & Strategy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMeetingType('OFFLINE');
                    setMeetingSource('OFFLINE_RECORDING');
                    setStorageMode('LOCAL_ONLY');
                    setClassification('HIGHLY_CONFIDENTIAL');
                  }}
                  className={`p-6 rounded-2xl border text-left transition-all ${
                    meetingType === 'OFFLINE'
                      ? 'bg-blue-50/70 border-brand-500 shadow-md ring-1 ring-brand-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <Laptop className="w-8 h-8 text-brand-600 mb-3" />
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">Offline Meeting</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Physical boardroom, conference room, or office. Audio stays strictly inside the room.
                  </p>
                  <span className="badge bg-blue-50 text-blue-700 border border-blue-200 text-2xs mt-4 font-semibold">Local Confinement</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMeetingType('ONLINE');
                    setMeetingSource('GOOGLE_MEET');
                    setStorageMode('CLOUD');
                    setClassification('GENERAL');
                  }}
                  className={`p-6 rounded-2xl border text-left transition-all ${
                    meetingType === 'ONLINE'
                      ? 'bg-purple-50/70 border-purple-500 shadow-md ring-1 ring-purple-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <Video className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">Online Meeting</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Conducted via Google Meet, Microsoft Teams, or cloud video. Local AI extraction still enforced!
                  </p>
                  <span className="badge bg-purple-50 text-purple-700 border border-purple-200 text-2xs mt-4 font-semibold">Online Provider</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Meeting Source */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Step 2: Choose Source</h2>
              <p className="text-sm text-slate-500">Select how audio or recording enters Memora AI.</p>
            </div>

            {meetingType === 'OFFLINE' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMeetingSource('OFFLINE_RECORDING')}
                  className={`p-5 rounded-xl border text-left transition-all ${
                    meetingSource === 'OFFLINE_RECORDING'
                      ? 'bg-blue-50/70 border-brand-500 shadow-md ring-1 ring-brand-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <Mic className="w-6 h-6 text-brand-600 mb-2" />
                  <div className="font-bold text-slate-900 text-sm">Record with Microphone</div>
                  <div className="text-xs text-slate-500 mt-1">Live capture with waveform visualizer</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMeetingSource('UPLOADED_RECORDING')}
                  className={`p-5 rounded-xl border text-left transition-all ${
                    meetingSource === 'UPLOADED_RECORDING'
                      ? 'bg-blue-50/70 border-brand-500 shadow-md ring-1 ring-brand-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <UploadCloud className="w-6 h-6 text-brand-600 mb-2" />
                  <div className="font-bold text-slate-900 text-sm">Upload Local Audio File</div>
                  <div className="text-xs text-slate-500 mt-1">MP3, WAV, M4A, WEBM file</div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'GOOGLE_MEET', label: 'Google Meet', icon: Video },
                    { id: 'MICROSOFT_TEAMS', label: 'Teams', icon: Video },
                    { id: 'ONEDRIVE', label: 'OneDrive', icon: UploadCloud },
                    { id: 'UPLOADED_RECORDING', label: 'Upload', icon: UploadCloud },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setMeetingSource(s.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        meetingSource === s.id ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <s.icon className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <div className="text-xs font-semibold">{s.label}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="label">Meeting URL (Optional)</label>
                  <input
                    type="url"
                    className="input text-xs font-mono"
                    placeholder="https://meet.google.com/..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Participants */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Step 3: Add Participants</h2>
              <p className="text-sm text-slate-500">Select enrolled speakers or type participant names for diarization.</p>
            </div>

            <div>
              <label className="label">Add Participant Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Arun Patel"
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addParticipant(participantInput.trim());
                      setParticipantInput('');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    addParticipant(participantInput.trim());
                    setParticipantInput('');
                  }}
                  className="btn bg-brand-600 hover:bg-brand-500 text-white px-4 text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Quick Select from Enrolled Speakers */}
            {speakers.length > 0 && (
              <div>
                <label className="label text-2xs">Quick Select Enrolled Voice Profiles</label>
                <div className="flex flex-wrap gap-2">
                  {speakers.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => addParticipant(sp.display_name)}
                      className="badge bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-1 px-2.5 text-xs shadow-xs"
                    >
                      + {sp.display_name} ({sp.department || 'Enrolled'})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Participants List */}
            <div>
              <label className="label">Selected for this Meeting ({selectedParticipants.length})</label>
              <div className="flex flex-wrap gap-2">
                {selectedParticipants.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 text-xs font-medium"
                  >
                    <span>{p}</span>
                    <button
                      type="button"
                      onClick={() => removeParticipant(p)}
                      className="hover:text-red-500 ml-1 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Classification */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Step 4: Meeting Classification</h2>
              <p className="text-sm text-slate-500">Classify the sensitivity of the discussion.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'HIGHLY_CONFIDENTIAL', label: 'Highly Confidential', desc: 'Board meetings, M&A, patents, security audits. Local Only storage strictly recommended.', badge: 'badge-confidential' },
                { id: 'INTERNAL', label: 'Internal', desc: 'Sprint planning, engineering architecture, internal updates.', badge: 'badge-internal' },
                { id: 'GENERAL', label: 'General', desc: 'Public announcements, client orientations, operational syncs.', badge: 'badge-general' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClassification(c.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    classification === c.id ? 'bg-blue-50/70 border-brand-500 shadow-sm ring-1 ring-brand-500' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <span className={`badge ${c.badge} mb-2`}>{c.label}</span>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: AI Processing Mode */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Step 5: AI Processing Location</h2>
              <p className="text-sm text-slate-500">Where should the LLM run? Default is Local Llama via Ollama.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'LOCAL_LLM', label: 'Local Llama (Recommended)', desc: '100% on-premises via Ollama. Zero audio or transcript leaves the host device.', active: true },
                { id: 'CLOUD_LLM', label: 'Cloud LLM', desc: 'Process through enterprise private cloud instance.', active: false },
                { id: 'HYBRID', label: 'Hybrid Processing', desc: 'Local transcription + cloud synthesis.', active: false },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAiProcessingMode(m.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    aiProcessingMode === m.id ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold text-slate-900 text-xs">{m.label}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>
                  {m.id === 'LOCAL_LLM' && (
                    <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs mt-3 font-semibold">Active Default</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: Storage Policy */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Step 6: Storage Mode</h2>
              <p className="text-sm text-slate-500">Choose where the persistent records are kept.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'LOCAL_ONLY', label: 'Local Only', desc: 'Saved exclusively in MemoraData folder on this device. Cloud sync disabled.', icon: Lock },
                { id: 'CLOUD', label: 'Cloud Storage', desc: 'Synchronize extracted summary & actions to company vault.', icon: UploadCloud },
                { id: 'LOCAL_AND_CLOUD', label: 'Local + Cloud', desc: 'Store raw audio locally, sync summary to cloud.', icon: Database },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStorageMode(s.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    storageMode === s.id ? 'bg-blue-50/70 border-brand-500 shadow-sm ring-1 ring-brand-500' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <s.icon className="w-5 h-5 text-brand-600 mb-2" />
                  <div className="font-extrabold text-slate-900 text-xs mb-1">{s.label}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: Goal Alignment */}
        {step === 7 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Step 7: Company Goal (Optional)</h2>
              <p className="text-sm text-slate-500">Link this meeting's commitments to a strategic company OKR.</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setGoalId('')}
                className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all font-medium ${
                  goalId === '' ? 'bg-blue-50/70 border-brand-500 text-brand-900 shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                No specific goal (Standalone meeting)
              </button>

              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoalId(g.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    goalId === g.id ? 'bg-blue-50/70 border-brand-500 shadow-sm ring-1 ring-brand-500' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-sm">{g.title}</span>
                    <span className="text-xs text-brand-600 font-mono font-semibold">{g.progress_pct}%</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{g.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 8: Review & Launch */}
        {step === 8 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">Step 8: Review Configuration</h2>
              <p className="text-sm text-slate-500">Verify your meeting settings before starting.</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Meeting Title</span>
                <span className="text-sm font-bold text-slate-900">{title || 'Untitled Meeting'}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Meeting Source</span>
                <span className="badge bg-white text-slate-800 border border-slate-200 shadow-xs">
                  {meetingSource.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">AI Processing Location</span>
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {aiProcessingMode.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Storage Policy</span>
                <span className="badge bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  {storageMode.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Classification</span>
                <span className="badge badge-confidential">{classification.replace('_', ' ')}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Participants ({selectedParticipants.length})</span>
                <span className="text-xs text-slate-800 font-medium">{selectedParticipants.join(', ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="btn bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs px-4 py-2.5 rounded-lg text-sm flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 8 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !title.trim()) {
                  toast.error('Please enter a meeting title');
                  return;
                }
                setStep(step + 1);
              }}
              className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-500/25"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Meeting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Start / Import Meeting</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default NewMeetingWizard;
