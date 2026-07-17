import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
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

const autoLoginEnabled = import.meta.env.VITE_KPI_AUTO_LOGIN !== 'false';
const autoLoginUsername = import.meta.env.VITE_KPI_AUTO_LOGIN_USERNAME || 'malika';
const autoLoginPassword = import.meta.env.VITE_KPI_AUTO_LOGIN_PASSWORD || 'admin123';

function dashboardPathForRole(role) {
  if (role === 'SUPERVISOR') return '/supervisor/dashboard';
  if (role === 'AGENT') return '/agent/dashboard';
  return '/';
}

function AutoLoginRedirect({ force = false }) {
  const { isAuthenticated, user, login } = useAuthStore();
  const [started, setStarted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!autoLoginEnabled || started || (isAuthenticated && !force)) {
      return;
    }

    setStarted(true);
    login({ username: autoLoginUsername, password: autoLoginPassword }).then((result) => {
      if (!result.success) {
        setError(result.error || 'Connexion automatique indisponible.');
      }
      setAttempted(true);
    });
  }, [started, isAuthenticated, login, force]);

  if (isAuthenticated && (!force || attempted)) {
    return <Navigate to={dashboardPathForRole(user?.role)} replace />;
  }

  if (!autoLoginEnabled) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        padding: 24,
        textAlign: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Module KPI indisponible</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--bg-base)',
      color: 'var(--text-secondary)',
      fontSize: 14,
    }}>
      Chargement du tableau de bord KPI...
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <AutoLoginRedirect />;
  if (requiredRole && user?.role !== requiredRole) return <AutoLoginRedirect />;
  return children;
}

function RoleRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (autoLoginEnabled) return <AutoLoginRedirect force />;
  if (!isAuthenticated) return <AutoLoginRedirect />;
  if (user?.role === 'SUPERVISOR') return <Navigate to="/supervisor/dashboard" replace />;
  if (user?.role === 'AGENT') return <Navigate to="/agent/dashboard" replace />;
  return <AutoLoginRedirect />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={autoLoginEnabled ? <AutoLoginRedirect force /> : <LoginPage />} />
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
