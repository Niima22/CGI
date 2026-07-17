import { useEffect, useState } from 'react';
import { kpiService } from '../../services/kpiService';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    kpiService.getAlerts()
      .then((data) => {
        if (mounted) setAlerts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Impossible de charger les alertes.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Alertes</h1>
        <p className="page-subtitle">{alerts.length} alerte{alerts.length > 1 ? 's' : ''} active{alerts.length > 1 ? 's' : ''}</p>
      </div>

      {loading && <div className="card" style={{ padding: 24 }}>Chargement des alertes...</div>}
      {error && <div className="card" style={{ padding: 24, color: '#EF4444' }}>{error}</div>}
      {!loading && !error && alerts.length === 0 && (
        <div className="card" style={{ padding: 24, color: 'var(--text-secondary)' }}>Aucune alerte active.</div>
      )}
      {!loading && !error && alerts.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alerts.map((alert) => (
              <div key={alert.id} className="card card-sm" style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{alert.type || 'Alerte KPI'}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
                    {alert.agentNom || alert.agent_nom || alert.bannette || 'Non assigne'}
                  </div>
                </div>
                <span className="badge badge-yellow">{alert.niveau || 'INFO'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
