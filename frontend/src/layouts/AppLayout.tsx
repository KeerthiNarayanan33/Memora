// App Layout — Sidebar + Top Bar
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Video, CheckSquare, GitBranch, Target,
  Users, BarChart3, Search, Shield, Settings, LogOut,
  ChevronLeft, Bell, Zap, AlertTriangle, Cpu, Database, Globe, Laptop,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { aiApi } from '../services/api';
import { useInterfaceStore } from '../stores/interfaceStore';
import { cn } from '../utils';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/meetings', icon: Video, label: 'Meetings' },
  { to: '/actions', icon: CheckSquare, label: 'Action Tracker' },
  { to: '/decisions', icon: GitBranch, label: 'Decisions' },
  { to: '/unresolved', icon: AlertTriangle, label: 'Unresolved' },
  { to: '/goals', icon: Target, label: 'Company Goals' },
  { to: '/speakers', icon: Users, label: 'Speakers' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/privacy', icon: Shield, label: 'Privacy Center' },
  { to: '/google-meet', icon: Globe, label: 'Google Meet Hub' },
  { to: '/storage/local', icon: Database, label: 'Local Storage' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { currentMode, toggleMode } = useInterfaceStore();

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: aiApi.status,
    refetchInterval: 60000,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'flex flex-col bg-surface-900 border-r border-surface-800 transition-all duration-300',
        collapsed ? 'w-14' : 'w-56',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-surface-800">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white leading-tight">MeetGuard</div>
              <div className="text-2xs text-surface-500 leading-tight">AI</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn('ml-auto p-1 rounded hover:bg-surface-800 text-surface-500 transition-transform duration-300', collapsed && 'rotate-180')}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'text-brand-400 bg-brand-500/10'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800',
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* AI Status indicator */}
        {!collapsed && aiStatus && (
          <div className="px-3 py-2 border-t border-surface-800">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-3 h-3 text-surface-500" />
              <div className="flex-1 min-w-0">
                <div className="text-2xs text-surface-500 uppercase tracking-wide">AI Engine</div>
                {aiStatus.ollama_available ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-2xs text-emerald-400 font-medium">Llama — Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-2xs text-amber-400 font-medium">Demo Mode</span>
                  </div>
                )}
              </div>
            </div>
            {/* Interface Mode Switcher */}
            <button
              onClick={toggleMode}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-2xs font-medium transition-all',
                currentMode === 'LOCAL'
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              )}
              title="Toggle Local / Online interface mode"
            >
              {currentMode === 'LOCAL' ? <Laptop className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {currentMode === 'LOCAL' ? 'LOCAL Mode' : 'ONLINE Mode'}
              <span className="ml-auto text-surface-600 text-2xs">switch</span>
            </button>
          </div>
        )}

        {/* User */}
        <div className="border-t border-surface-800 p-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-surface-200 truncate">{user?.name}</div>
                <div className="text-2xs text-surface-500 truncate">{user?.role}</div>
              </div>
            )}
            {!collapsed && (
              <button onClick={handleLogout} className="p-1 text-surface-500 hover:text-red-400 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-3 bg-surface-900 border-b border-surface-800">
          <NavLink to="/search" className="flex-1 max-w-md">
            <div className="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-500 hover:border-surface-600 transition-colors cursor-pointer">
              <Search className="w-4 h-4" />
              <span>Search meetings, actions, decisions…</span>
              <kbd className="ml-auto text-2xs bg-surface-700 text-surface-400 px-1.5 py-0.5 rounded">⌘K</kbd>
            </div>
          </NavLink>
          
          <div className="flex items-center gap-3 ml-auto">
            {aiStatus?.processing_mode === 'DEMO_FALLBACK' && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-2xs text-amber-400 font-medium">DEMO ENVIRONMENT</span>
              </div>
            )}
            
            <button className="btn-icon relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg">
              <div className="w-5 h-5 bg-brand-700 rounded-full flex items-center justify-center text-2xs font-bold text-white">
                {user?.name?.charAt(0)}
              </div>
              <span className="text-sm text-surface-300 font-medium">{user?.name?.split(' ')[0]}</span>
              <span className="text-2xs text-surface-500 px-1.5 py-0.5 bg-surface-700 rounded">{user?.role}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-surface-950">
          <div className="max-w-screen-2xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
