import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { KPI_API_BASE_URL } from '../../services/api';
import { Star } from 'lucide-react';

export default function NpsExplorerPage() {
  const token = useAuthStore(state => state.token);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketActions, setTicketActions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${KPI_API_BASE_URL}/nps/retours`, { headers });
      if (!res.ok) throw new Error('Erreur réseau');
      const json = await res.json();
      setData(json);
    } catch (error) {
      toast.error('Erreur lors du chargement des retours NPS: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openTicketDetails = async (ticketId) => {
    if (!ticketId || ticketId === '-') return;
    setModalOpen(true);
    setLoadingDetails(true);
    setTicketActions([]);
    setSelectedTicket(ticketId);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${KPI_API_BASE_URL}/tickets/${ticketId}/actions`, { headers });
      if (res.ok) {
        const json = await res.json();
        setTicketActions(json);
      } else {
        toast.error("Impossible de charger l'historique du ticket");
      }
    } catch (error) {
      toast.error('Erreur réseau lors du chargement des détails');
    } finally {
      setLoadingDetails(false);
    }
  };

  const uniqueTeams = Array.from(new Set(data.map(item => item.bannetteGrafana || item.equipeDs || 'FO').filter(Boolean))).sort();

  const filteredData = data.filter(item => {
    const equipe = item.bannetteGrafana || item.equipeDs || 'FO';
    const matchesText = equipe.toLowerCase().includes(filterAgent.toLowerCase()) ||
           item.ticketId?.toLowerCase().includes(filterAgent.toLowerCase());
    const matchesTeam = selectedTeam === '' || equipe === selectedTeam;
    return matchesText && matchesTeam;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <div className="fade-in" style={{ padding: '0 24px 24px' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Star size={24} /> Explorateur NPS
        </h1>
        <p className="page-subtitle">Consultez les retours NPS détaillés et les commentaires des clients.</p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 16 }}>
        <input 
          type="text" 
          placeholder="Filtrer par équipe ou Ticket ID..." 
          value={filterAgent}
          onChange={(e) => {
            setFilterAgent(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            flex: 2, padding: '10px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-input)',
            color: 'var(--text-primary)'
          }}
        />
        <input
          list="team-options"
          placeholder="Toutes les équipes (Sélectionner ou taper...)"
          value={selectedTeam}
          onChange={(e) => {
            setSelectedTeam(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-input)',
            color: 'var(--text-primary)'
          }}
        />
        <datalist id="team-options">
          {uniqueTeams.map((team, idx) => (
            <option key={idx} value={team} />
          ))}
        </datalist>
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
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Ticket ID</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Équipe</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Note NPS</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Commentaire</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? currentItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-input)' } }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {item.dateRetourNps ? new Date(item.dateRetourNps).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>
                      {item.ticketId || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14 }}>
                      {item.bannetteGrafana || item.equipeDs || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14 }}>
                      {item.nps != null ? (
                        <span style={{
                          padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                          background: item.nps >= 9 ? 'rgba(16,185,129,0.1)' : item.nps <= 6 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                          color: item.nps >= 9 ? '#10B981' : item.nps <= 6 ? '#EF4444' : '#F59E0B'
                        }}>
                          {item.nps}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.commentaire}>
                      {item.commentaire || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.ticketId && item.ticketId !== '-' && (
                        <button onClick={() => openTicketDetails(item.ticketId)} style={{
                          padding: '6px 12px', borderRadius: 6, border: 'none',
                          background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                          fontWeight: 600, cursor: 'pointer', fontSize: 12
                        }}>
                          Traçabilité
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Aucune donnée trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  Affichage {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredData.length)} sur {filteredData.length} entrées
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: currentPage === 1 ? 'var(--bg-input)' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)' }}
                  >Précédent</button>
                  <span style={{ padding: '6px 12px', color: 'var(--text-primary)', fontSize: 14 }}>Page {currentPage} sur {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: currentPage === totalPages ? 'var(--bg-input)' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: 'var(--text-primary)' }}
                  >Suivant</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }}>
          <div className="card fade-in" style={{
            background: 'var(--bg-card)', width: '100%', maxWidth: 800,
            borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Historique du Ticket #{selectedTicket}</h3>
              <button onClick={() => setModalOpen(false)} style={{
                background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                fontSize: 24, cursor: 'pointer', lineHeight: 1
              }}>&times;</button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto' }}>
              {loadingDetails ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>Chargement de l'historique...</div>
              ) : ticketActions.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>Aucune action enregistrée pour ce ticket.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: 12 }}>Date</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: 12 }}>Agent</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: 12 }}>Équipe</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>Résolu</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>Escaladé</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>Transfert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketActions.map((action, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 8px', color: 'var(--text-primary)', fontSize: 13 }}>
                          {action.dateHeure ? new Date(action.dateHeure).toLocaleString() : action.dateAction ? new Date(action.dateAction).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
                          {action.agentCodeGdi}
                        </td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: 13 }}>
                          {action.equipeDs || action.bannetteGrafana || '-'}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          {action.resol > 0 ? <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span> : '-'}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          {action.esc > 0 ? <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>↑</span> : '-'}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                          {action.trfInt > 0 ? 'Int' : ''} {action.trfExt > 0 ? 'Ext' : ''} {action.trfInt === 0 && action.trfExt === 0 ? '-' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
              <button onClick={() => setModalOpen(false)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500
              }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
