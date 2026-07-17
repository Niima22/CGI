import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const supervisorNav = [
  { to: '/supervisor/dashboard', icon: '⊞', label: 'Tableau de bord' },
  { to: '/supervisor/agents', icon: '👥', label: 'Agents' },
  { to: '/supervisor/tickets', icon: '🔍', label: 'Explorateur de tickets' },
  { to: '/supervisor/kpi-explorer', icon: '📊', label: 'Explorateur KPI' },
  { to: '/supervisor/nps-explorer', icon: '⭐', label: 'Explorateur NPS' },
  { to: '/supervisor/import', icon: '⬆', label: 'Import données' },
  { to: '/supervisor/alerts', icon: '🔔', label: 'Alertes', badge: 3 },
  { to: '/supervisor/coaching', icon: '🎯', label: 'Plans d\'action' },
  { to: '/supervisor/reports', icon: '📈', label: 'Rapports' },
];

const agentNav = [
  { to: '/agent/dashboard', icon: '⊞', label: 'Mon tableau de bord' },
  { to: '/agent/kpi', icon: '📈', label: 'Mes KPI' },
  { to: '/agent/nps', icon: '⭐', label: 'Mon NPS' },
  { to: '/agent/coaching', icon: '🎯', label: 'Mon Coaching' },
];

export default function Sidebar({ role }) {
  const nav = role === 'SUPERVISOR' ? supervisorNav : agentNav;
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Déconnecté avec succès');
    navigate('/login');
  };

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: 'var(--sidebar-width)', zIndex: 100,
      background: 'var(--gradient-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '0',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'white'
          }}>K</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>KPI Platform</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>DS Magasin · Carrefour</div>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: '12px 20px' }}>
        <div style={{
          background: role === 'SUPERVISOR' ? 'rgba(212,212,212,0.1)' : 'rgba(227,25,55,0.12)',
          border: `1px solid ${role === 'SUPERVISOR' ? 'rgba(212,212,212,0.2)' : 'rgba(227,25,55,0.25)'}`,
          borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: role === 'SUPERVISOR' ? 'var(--text-secondary)' : 'var(--accent-primary)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: role === 'SUPERVISOR' ? 'var(--text-secondary)' : 'var(--accent-primary)' }}>
              {role === 'SUPERVISOR' ? 'Superviseur' : 'Agent'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              {user?.prenom} {user?.nom}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>
          {role === 'SUPERVISOR' ? 'Navigation' : 'Ma plateforme'}
        </div>
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 9, textDecoration: 'none',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s ease',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-primary-glow)' : 'transparent',
              border: isActive ? '1px solid var(--accent-primary-glow)' : '1px solid transparent',
              position: 'relative',
            })}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{
                background: 'var(--accent-red)', color: 'white',
                borderRadius: '99px', padding: '1px 7px', fontSize: 10, fontWeight: 700,
              }}>{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLogout} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 9, background: 'transparent',
          border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)',
          fontSize: 13, fontWeight: 500, fontFamily: 'var(--font)', transition: 'var(--transition)'
        }}
          onMouseEnter={e => { e.target.style.color = '#F87171'; e.target.style.borderColor = 'rgba(239,68,68,0.3)'; }}
          onMouseLeave={e => { e.target.style.color = 'var(--text-secondary)'; e.target.style.borderColor = 'var(--border)'; }}
        >
          <span>⏻</span> Déconnexion
        </button>
      </div>
    </aside>
  );
}
