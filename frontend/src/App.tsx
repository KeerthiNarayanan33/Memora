// Main App Router — MeetGuard AI v2.0
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import MeetingsPage from './pages/Meetings';
import MeetingDetailPage from './pages/MeetingDetail';
import NewMeetingPage from './pages/NewMeeting';
import ActionsPage from './pages/Actions';
import DecisionsPage from './pages/Decisions';
import GoalsPage from './pages/Goals';
import SpeakersPage from './pages/Speakers';
import AnalyticsPage from './pages/Analytics';
import SearchPage from './pages/Search';
import PrivacyCenterPage from './pages/PrivacyCenter';
import SettingsPage from './pages/Settings';
import UnresolvedPage from './pages/Unresolved';
// v2 pages
import { InterfaceLanding } from './pages/InterfaceLanding';
import { NewMeetingWizard } from './pages/NewMeetingWizard';
import { RecordMeeting } from './pages/RecordMeeting';
import { GoogleMeetHub } from './pages/GoogleMeetHub';
import { LocalStorage } from './pages/LocalStorage';
import { CloudStorage } from './pages/CloudStorage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Interface selector — full-screen standalone page */}
          <Route
            path="/interface"
            element={
              <ProtectedRoute>
                <InterfaceLanding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="meetings/new" element={<NewMeetingPage />} />
            <Route path="meetings/wizard" element={<NewMeetingWizard />} />
            <Route path="meetings/record" element={<RecordMeeting />} />
            <Route path="meetings/:id" element={<MeetingDetailPage />} />
            <Route path="actions" element={<ActionsPage />} />
            <Route path="decisions" element={<DecisionsPage />} />
            <Route path="unresolved" element={<UnresolvedPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="speakers" element={<SpeakersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="privacy" element={<PrivacyCenterPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Online meeting hub */}
            <Route path="google-meet" element={<GoogleMeetHub />} />
            {/* Storage management */}
            <Route path="storage/local" element={<LocalStorage />} />
            <Route path="storage/cloud" element={<CloudStorage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
        }}
      />
    </QueryClientProvider>
  );
}
