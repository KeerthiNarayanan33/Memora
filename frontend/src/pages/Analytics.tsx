// Analytics Page
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend,
} from 'recharts';
import { analyticsApi } from '../services/api';

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6', IN_PROGRESS: '#f59e0b', COMPLETED: '#10b981',
  OVERDUE: '#ef4444', UNRESOLVED: '#f97316', CARRIED_OVER: '#8b5cf6',
};

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsApi.get,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>;

  if (!analytics) return null;

  const statusPieData = Object.entries(analytics.status_distribution)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 animate-fade">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Analytics</h1>
        <p className="text-surface-400 text-sm mt-0.5">Meeting intelligence metrics and performance insights</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Completion Rate', value: `${analytics.action_completion_rate}%`, color: 'text-emerald-400' },
          { label: 'Overdue Rate', value: `${analytics.overdue_rate}%`, color: analytics.overdue_rate > 20 ? 'text-red-400' : 'text-amber-400' },
          { label: 'Actions / Meeting', value: analytics.actions_per_meeting.toFixed(1), color: 'text-brand-400' },
          { label: 'Unresolved Rate', value: `${analytics.unresolved_rate}%`, color: analytics.unresolved_rate > 15 ? 'text-orange-400' : 'text-surface-200' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card">
            <div className="stat-label mb-1">{label}</div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly meetings */}
        <div className="card">
          <div className="section-title mb-4">Meeting Activity (6 months)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.monthly_meetings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="meetings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Action status distribution */}
        <div className="card">
          <div className="section-title mb-4">Action Status Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}>
                {statusPieData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department distribution */}
        {analytics.department_distribution.length > 0 && (
          <div className="card">
            <div className="section-title mb-4">Actions by Department</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.department_distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="department" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="actions" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Goal progress */}
        {analytics.goal_progress.length > 0 && (
          <div className="card">
            <div className="section-title mb-4">Goal Progress</div>
            <div className="space-y-4">
              {analytics.goal_progress.map((g) => (
                <div key={g.title}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-surface-300 truncate flex-1 pr-4">{g.title}</span>
                    <span className="font-bold text-surface-100 flex-shrink-0">{g.progress}%</span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        g.status === 'COMPLETED' ? 'bg-emerald-500' :
                        g.status === 'AT_RISK' ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
