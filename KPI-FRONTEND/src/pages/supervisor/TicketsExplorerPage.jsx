import { useEffect, useMemo, useState } from 'react';
import { kpiService } from '../../services/kpiService';

export default function TicketsExplorerPage() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    kpiService.getTickets()
      .then((data) => {
        if (mounted) setTickets(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Impossible de charger les tickets.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((ticket) => `${ticket.ticketId || ''} ${ticket.agentNom || ''} ${ticket.statut || ''}`.toLowerCase().includes(q));
  }, [tickets, search]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Explorateur tickets</h1>
        <p className="page-subtitle">{tickets.length} ticket{tickets.length > 1 ? 's' : ''} disponible{tickets.length > 1 ? 's' : ''}</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un ticket, agent ou statut..."
          style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'var(--font)' }}
        />
      </div>

      {loading && <div className="card" style={{ padding: 24 }}>Chargement des tickets...</div>}
      {error && <div className="card" style={{ padding: 24, color: '#EF4444' }}>{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="card" style={{ padding: 24, color: 'var(--text-secondary)' }}>Aucun ticket disponible.</div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Ticket</th>
                <th style={{ padding: 12 }}>Agent</th>
                <th style={{ padding: 12 }}>Statut</th>
                <th style={{ padding: 12 }}>Priorite</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id || ticket.ticketId} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>{ticket.ticketId || ticket.id}</td>
                  <td style={{ padding: 12 }}>{ticket.agentNom || ticket.agentCodeGdi || 'Non assigne'}</td>
                  <td style={{ padding: 12 }}><span className="badge badge-blue">{ticket.statut || 'N/A'}</span></td>
                  <td style={{ padding: 12 }}>{ticket.priorite || 'Non calcule'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
