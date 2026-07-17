import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const pageTitles = {
  '/supervisor/dashboard': { title: 'Tableau de bord', subtitle: 'Vue globale de l\'équipe DS Magasin' },
  '/supervisor/agents': { title: 'Gestion des agents', subtitle: 'Liste, scores et statuts des agents' },
  '/supervisor/import': { title: 'Import de données', subtitle: 'Upload Excel / CSV ou import automatique Grafana' },
  '/supervisor/alerts': { title: 'Alertes actives', subtitle: 'Seuils dépassés et agents en régression' },
  '/supervisor/reports': { title: 'Rapports', subtitle: 'Génération et historique des rapports' },
  '/supervisor/tickets': { title: 'Explorateur de Tickets', subtitle: 'Historique des tickets, TTR et escalades' },
  '/supervisor/coaching': { title: 'Plans d\'action & Coaching', subtitle: 'Suivi des plans d\'amélioration' },
  '/agent/dashboard': { title: 'Mon tableau de bord', subtitle: 'Mes performances de la semaine' },
  '/agent/kpi': { title: 'Mes KPI', subtitle: 'Résolution, qualité de service, appels' },
  '/agent/nps': { title: 'Mon NPS', subtitle: 'Satisfaction client et commentaires' },
  '/agent/coaching': { title: 'Mon Coaching', subtitle: 'Mes plans d\'action et suivis 1-to-1' },
};

export default function Header() {
  const location = useLocation();
  const { user } = useAuthStore();
  const info = pageTitles[location.pathname] || { title: 'KPI Platform', subtitle: '' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <header style={{
      height: 'var(--header-height)', background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{info.title}</h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{info.subtitle}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Date */}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
          <div style={{ textTransform: 'capitalize' }}>{dateStr}</div>
        </div>
        {/* Status live */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>Données live</span>
        </div>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--gradient-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer',
          border: '2px solid rgba(227,25,55,0.3)',
        }}>
          {user?.prenom?.[0]}{user?.nom?.[0]}
        </div>
      </div>
    </header>
  );
}
