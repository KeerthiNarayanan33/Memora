// Enterprise Dashboard — Command Center
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Video, CheckSquare, TrendingUp, AlertCircle, Clock,
  Target, AlertTriangle, Zap, ArrowRight, Circle,
  Laptop, Globe, Mic,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { dashboardApi, analyticsApi } from '../services/api';
import { useInterfaceStore } from '../stores/interfaceStore';
import {
  formatDate, formatRelative, statusBadgeClass, statusLabel,
  classificationBadgeClass, truncate,
} from '../utils';

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  OVERDUE: '#ef4444',
  UNRESOLVED: '#f97316',
  CARRIED_OVER: '#8b5cf6',
};

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 30000,
  });
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsApi.get,
  });
  const { currentMode } = useInterfaceStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pieData = analytics
    ? Object.entries(analytics.status_distribution)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6 animate-fade">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-0.5">
            Enterprise Accountability Command Center
            <span className={`ml-2 text-2xs font-semibold px-2 py-0.5 rounded-full border ${
              currentMode === 'LOCAL'
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {currentMode === 'LOCAL' ? '💻 LOCAL MODE' : '🌐 ONLINE MODE'}
            </span>
          </p>
        </div>
        <Link to="/meetings/wizard" className="btn-primary">
          <Zap className="w-4 h-4" />
          New Meeting
        </Link>
      </div>

      {/* Quick Launch Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/meetings/record"
          className="card flex items-center gap-4 p-5 hover:border-brand-500/40 hover:bg-brand-500/5 transition-all duration-200 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform flex-shrink-0">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-surface-100">Record Local Meeting</div>
            <div className="text-2xs text-surface-400 mt-0.5">Live mic + Local AI processing</div>
          </div>
        </Link>
        <Link
          to="/google-meet"
          className="card flex items-center gap-4 p-5 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all duration-200 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform flex-shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-surface-100">Google Meet Hub</div>
            <div className="text-2xs text-surface-400 mt-0.5">Import & process online meetings</div>
          </div>
        </Link>
        <Link
          to="/meetings/wizard"
          className="card flex items-center gap-4 p-5 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-200 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform flex-shrink-0">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-surface-100">3-Axis Wizard</div>
            <div className="text-2xs text-surface-400 mt-0.5">Configure Source → AI → Storage</div>
          </div>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <KpiCard
          label="Total Meetings"
          value={stats?.total_meetings ?? 0}
          icon={<Video className="w-4 h-4 text-brand-400" />}
          color="brand"
          span={2}
        />
        <KpiCard label="Total Actions" value={stats?.total_actions ?? 0} icon={<CheckSquare className="w-4 h-4 text-surface-400" />} color="surface" span={1} />
        <KpiCard label="Completed" value={stats?.completed_actions ?? 0} icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} color="emerald" span={1} />
        <KpiCard label="In Progress" value={stats?.in_progress_actions ?? 0} icon={<Circle className="w-4 h-4 text-amber-400" />} color="amber" span={1} />
        <KpiCard label="Overdue" value={stats?.overdue_actions ?? 0} icon={<AlertCircle className="w-4 h-4 text-red-400" />} color="red" span={1} urgent />
        <KpiCard label="Unresolved" value={stats?.unresolved_actions ?? 0} icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} color="orange" span={1} urgent />
        <KpiCard
          label="Active Goals"
          value={stats?.active_goals ?? 0}
          icon={<Target className="w-4 h-4 text-purple-400" />}
          color="purple"
          span={1}
        />
      </div>

      {/* Completion rate bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-surface-200">Overall Action Completion Rate</div>
            <div className="text-2xs text-surface-500 mt-0.5">
              {stats?.completed_actions} of {stats?.total_actions} actions completed
            </div>
          </div>
          <div className="text-2xl font-bold text-surface-50">{stats?.completion_rate ?? 0}%</div>
        </div>
        <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${stats?.completion_rate ?? 0}%` }}
          />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent meetings */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title">Recent Meetings</div>
            <Link to="/meetings" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {stats?.recent_meetings.length === 0 && (
              <p className="text-surface-500 text-sm py-4 text-center">No meetings yet</p>
            )}
            {stats?.recent_meetings.map((m) => (
              <Link key={m.id} to={`/meetings/${m.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-700/50 transition-colors group">
                <div className="w-9 h-9 bg-surface-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Video className="w-4 h-4 text-surface-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-200 group-hover:text-white transition-colors truncate">
                    {m.title}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-2xs text-surface-500">{formatDate(m.meeting_date)}</span>
                    <span className={classificationBadgeClass(m.classification)}>{m.classification.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-2xs text-surface-500 flex-shrink-0">
                  <span>{m.decision_count} decisions</span>
                  <span>{m.action_count} actions</span>
                  {m.unresolved_count > 0 && (
                    <span className="text-orange-400">{m.unresolved_count} unresolved</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Action distribution */}
        <div className="card">
          <div className="section-title mb-4">Action Status</div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map(({ name, value }) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[name] || '#64748b' }} />
                      <span className="text-surface-300">{name.replace('_', ' ')}</span>
                    </div>
                    <span className="font-semibold text-surface-200">{value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <CheckSquare className="w-8 h-8 text-surface-600 mb-2" />
              <p className="text-surface-500 text-sm">No action data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Overdue actions */}
        <div className="card border-red-500/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <div className="section-title text-red-300">Overdue Actions</div>
            <span className="ml-auto badge-overdue">{stats?.overdue_actions} overdue</span>
          </div>
          <div className="space-y-2">
            {stats?.overdue_actions_list.length === 0 && (
              <p className="text-surface-500 text-sm py-4 text-center">🎉 No overdue actions!</p>
            )}
            {stats?.overdue_actions_list.slice(0, 5).map((a) => (
              <Link key={a.id} to="/actions" className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-700/40 transition-colors">
                <div className="w-1 h-full min-h-[2.5rem] bg-red-500 rounded-full flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-surface-200 truncate">{a.action_text}</div>
                  <div className="flex items-center gap-2 mt-1 text-2xs text-surface-500">
                    <span>Owner: <span className="text-surface-300">{a.owner_name || 'Unresolved'}</span></span>
                    <span>•</span>
                    <span className="text-red-400">Due: {a.deadline_text}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Company goals */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <div className="section-title">Company Goals</div>
            </div>
            <Link to="/goals" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {stats?.active_goals_list.length === 0 && (
              <div className="empty-state">
                <Target className="w-8 h-8 text-surface-600 mb-2" />
                <p className="text-surface-500 text-sm">No active goals</p>
              </div>
            )}
            {stats?.active_goals_list.map((g) => (
              <Link key={g.id} to="/goals" className="block hover:bg-surface-700/30 rounded-lg p-2 -mx-2 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-sm font-medium text-surface-200 truncate flex-1">{g.title}</div>
                  <span className="text-sm font-bold text-surface-100 ml-3">{g.progress_pct}%</span>
                </div>
                <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-brand-500 rounded-full transition-all duration-500"
                    style={{ width: `${g.progress_pct}%` }}
                  />
                </div>
                <div className="text-2xs text-surface-500 mt-1">
                  {g.completed_action_count} of {g.action_count} actions complete
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly activity */}
      {analytics?.monthly_meetings && analytics.monthly_meetings.length > 0 && (
        <div className="card">
          <div className="section-title mb-4">Meeting Activity (6 months)</div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={analytics.monthly_meetings}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Area type="monotone" dataKey="meetings" stroke="#3b82f6" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label, value, icon, color, span = 1, urgent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  span?: number;
  urgent?: boolean;
}) {
  const colors: Record<string, string> = {
    brand: 'border-brand-500/20',
    emerald: 'border-emerald-500/20',
    amber: 'border-amber-500/20',
    red: 'border-red-500/30',
    orange: 'border-orange-500/20',
    purple: 'border-purple-500/20',
    surface: '',
  };

  return (
    <div className={`card stat-card col-span-${span} ${urgent && value > 0 ? colors[color] : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="stat-label">{label}</div>
        {icon}
      </div>
      <div className={`stat-value ${urgent && value > 0 ? `text-${color}-400` : ''}`}>{value}</div>
    </div>
  );
}
