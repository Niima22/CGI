import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { KPI_API_BASE_URL } from '../../services/api';
import { BarChart3 } from 'lucide-react';

export default function KpiExplorerPage() {
  const token = useAuthStore(state => state.token);
  const [data, setData] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [filterAgent, setFilterAgent] = useState('');
  const [filterBannette, setFilterBannette] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
    fetchAgents();
  }, [token]);

  const fetchAgents = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${KPI_API_BASE_URL}/agents`, { headers });
      if (res.ok) {
        const json = await res.json();
        setAgents(json);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des agents:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${KPI_API_BASE_URL}/kpis/daily`, { headers });
      if (!res.ok) throw new Error('Erreur réseau');
      const json = await res.json();
      setData(json);
    } catch (error) {
      toast.error('Erreur lors du chargement des KPIs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => {
    // Filtre GDI
    if (filterAgent && !item.agentCodeGdi?.toLowerCase().includes(filterAgent.toLowerCase())) {
      return false;
    }
    
    // Filtre Bannette (Équipe)
    if (filterBannette) {
      const agent = agents.find(a => a.codeGdi === item.agentCodeGdi);
      const bannette = agent?.equipeNom || 'Non assigné';
      if (!bannette.toLowerCase().includes(filterBannette.toLowerCase())) {
        return false;
      }
    }

    // Filtre Dates
    if (startDate && new Date(item.dateKpi) < new Date(startDate)) {
      return false;
    }
    if (endDate && new Date(item.dateKpi) > new Date(endDate)) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="fade-in" style={{ padding: '0 24px 24px' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart3 size={24} /> Explorateur KPI
        </h1>
        <p className="page-subtitle">Consultez les statistiques journalières des KPIs (issues du fichier Excel KPI DS MAGASIN).</p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <input 
          type="text" 
          placeholder="Filtrer par GDI..." 
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          style={{
            flex: '1 1 200px', padding: '10px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-input)',
            color: 'var(--text-primary)'
          }}
        />
        <input 
          type="text" 
          placeholder="Filtrer par Bannette (ex: FO, BO)..." 
          value={filterBannette}
          onChange={(e) => setFilterBannette(e.target.value)}
          style={{
            flex: '1 1 200px', padding: '10px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-input)',
            color: 'var(--text-primary)'
          }}
        />
        <input 
          type="date" 
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            flex: '1 1 150px', padding: '10px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-input)',
            color: 'var(--text-primary)'
          }}
          title="Date de début"
        />
        <input 
          type="date" 
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            flex: '1 1 150px', padding: '10px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-input)',
            color: 'var(--text-primary)'
          }}
          title="Date de fin"
        />
        <button onClick={fetchData} style={{
          padding: '10px 20px', borderRadius: 8, border: 'none',
          background: 'var(--accent-primary)', color: 'white',
          fontWeight: 600, cursor: 'pointer'
        }}>
          Rafraîchir
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement des données...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                  <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Agent GDI</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Bannette</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Tickets Résolus</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Tickets Escaladés</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Taux Résolution</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? filteredData.map((item, index) => {
                  const agent = agents.find(a => a.codeGdi === item.agentCodeGdi);
                  const bannette = agent?.equipeNom || 'Non assigné';
                  return (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-input)' } }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14 }}>{item.dateKpi ? new Date(item.dateKpi).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>{item.agentCodeGdi || 'Inconnu'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14 }}>
                      <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                        {bannette}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14 }}>{item.ticketsResolus || 0}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14 }}>{item.ticketsEscalades || 0}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14 }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                        background: (item.tauxResolution >= 80) ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: (item.tauxResolution >= 80) ? '#10B981' : '#EF4444'
                      }}>
                        {item.tauxResolution ? item.tauxResolution.toFixed(1) + '%' : '-'}
                      </span>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Aucune donnée trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
