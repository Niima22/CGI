import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Layout
import Layout from './components/layout/Layout';

import AgentDetailPage from './pages/supervisor/AgentDetailPage';

// Supervisor pages
import SupervisorDashboard from './pages/supervisor/DashboardPage';
import AgentsPage from './pages/supervisor/AgentsPage';
import ImportPage from './pages/supervisor/ImportPage';
import ImportResultPage from './pages/supervisor/ImportResultPage';
import AlertsPage from './pages/supervisor/AlertsPage';
import ReportsPage from './pages/supervisor/ReportsPage';
import TicketsExplorerPage from './pages/supervisor/TicketsExplorerPage';
import CoachingPage from './pages/supervisor/CoachingPage';
import KpiExplorerPage from './pages/supervisor/KpiExplorerPage';
import NpsExplorerPage from './pages/supervisor/NpsExplorerPage';

// Agent pages
import AgentDashboardPage from './pages/agent/AgentDashboardPage';
import MyKpiPage from './pages/agent/MyKpiPage';
import MyNpsPage from './pages/agent/MyNpsPage';
import MyCoachingPage from './pages/agent/MyCoachingPage';

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/login" replace />;
  return children;
}

function RoleRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'SUPERVISOR') return <Navigate to="/supervisor/dashboard" replace />;
  if (user?.role === 'AGENT') return <Navigate to="/agent/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Supervisor routes */}
      <Route path="/supervisor" element={
        <ProtectedRoute requiredRole="SUPERVISOR">
          <Layout role="SUPERVISOR" />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<SupervisorDashboard />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/:id" element={<AgentDetailPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="import/result/:importId" element={<ImportResultPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="tickets" element={<TicketsExplorerPage />} />
        <Route path="coaching" element={<CoachingPage />} />
        <Route path="kpi-explorer" element={<KpiExplorerPage />} />
        <Route path="nps-explorer" element={<NpsExplorerPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Agent routes */}
      <Route path="/agent" element={
        <ProtectedRoute requiredRole="AGENT">
          <Layout role="AGENT" />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<AgentDashboardPage />} />
        <Route path="kpi" element={<MyKpiPage />} />
        <Route path="nps" element={<MyNpsPage />} />
        <Route path="coaching" element={<MyCoachingPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
