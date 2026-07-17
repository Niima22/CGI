import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { agentService } from '../../services/agentService';
import { UploadCard } from './ImportPage';
import { KPI_API_BASE_URL } from '../../services/api';

const BANNETTES = ['FO', 'BO', 'Promocash', 'Proximité', 'SCO'];
const IMPORT_API = `${KPI_API_BASE_URL}/import/upload`;

export default function AgentsPage() {
  const [filterBannette, setFilterBannette] = useState('Tous');
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'import'

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    bannette: 'FO',
    codeGdi: '',
    loginGrafana: '',
    email: '',
    location: '',
    svi: '',
    licence: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await agentService.getAgents();
      // Map equipeNom to bannette for consistency in frontend
      const mappedData = data.map(a => ({
        ...a,
        bannette: a.equipeNom || a.bannette || 'Non assigné'
      }));
      setAgents(mappedData);
    } catch (err) {
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await agentService.createAgent(formData);
      toast.success('Agent ajouté avec succès');
      setShowModal(false);
      setFormData({
        matricule: '', nom: '', prenom: '', bannette: 'FO',
        codeGdi: '', loginGrafana: '', email: '', location: '', svi: '', licence: ''
      });
      loadAgents();
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'ajout de l\'agent');
    } finally {
      setSaving(false);
    }
  };

  const filtered = agents.filter(a => {
    let bannetteMatch = false;
    if (filterBannette === 'Tous') {
      bannetteMatch = true;
    } else if (filterBannette === 'Promocash' || filterBannette === 'Proximité') {
      const b = (a.bannette || '').toLowerCase();
      bannetteMatch = b.includes('promo') || b.includes('proxi') || b.includes('px') || b.includes('pmc');
    } else {
      bannetteMatch = a.bannette === filterBannette;
    }
    
    const searchStr = `${a.prenom} ${a.nom} ${a.loginGrafana || ''}`.toLowerCase();
    const searchMatch = searchStr.includes(search.toLowerCase());
    
    return bannetteMatch && searchMatch;
  });

  const bannetteBadgeColor = { FO: 'badge-blue', BO: 'badge-purple', Promocash: 'badge-yellow', Proximité: 'badge-green', SCO: 'badge-cyan' };

  return (
    <div className="fade-in">
      <div className="page-header flex-between" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Agents</h1>
          <p className="page-subtitle">{agents.length} agents au total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Ajouter un agent</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        <div 
          onClick={() => setActiveTab('list')}
          style={{ 
            padding: '12px 0', 
            fontWeight: 600, 
            cursor: 'pointer',
            color: activeTab === 'list' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'list' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          Liste des agents
        </div>
        <div 
          onClick={() => setActiveTab('import')}
          style={{ 
            padding: '12px 0', 
            fontWeight: 600, 
            cursor: 'pointer',
            color: activeTab === 'import' ? '#8B5CF6' : 'var(--text-secondary)',
            borderBottom: activeTab === 'import' ? '2px solid #8B5CF6' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          Importer des agents
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Rechercher un agent..."
              style={{ flex: 1, minWidth: 200, padding: '9px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
        {['Tous', ...BANNETTES].map(b => (
          <button key={b} onClick={() => setFilterBannette(b)} style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filterBannette === b ? 'var(--accent-primary)' : 'var(--bg-input)',
            color: filterBannette === b ? 'white' : 'var(--text-secondary)',
            border: filterBannette === b ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
            fontFamily: 'var(--font)', transition: 'var(--transition)',
          }}>{b}</button>
        ))}
      </div>

      {/* Agents table */}
      <div className="table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement des agents...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Login Grafana</th>
                <th>Matricule</th>
                <th>Bannette</th>
                <th>Email</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(agent => (
                <tr key={agent.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>{(agent.prenom?.[0] || '')}{(agent.nom?.[0] || '')}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{agent.prenom} {agent.nom}</div>
                      </div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>{agent.loginGrafana || '—'}</code></td>
                  <td><code style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>{agent.matricule || '—'}</code></td>
                  <td><span className={`badge ${bannetteBadgeColor[agent.bannette] || 'badge-gray'}`}>{agent.bannette}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{agent.email || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{agent.location || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/supervisor/agents/${agent.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      Détails
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                    Aucun agent trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
        </>
      ) : (
        <div style={{ maxWidth: 600, margin: '0 auto', marginTop: 40 }}>
          <UploadCard 
            config={{
              key: 'agents-dic',
              label: 'Dictionnaire Agents',
              icon: '👥',
              color: '#8B5CF6',
              gradient: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
              accept: '.xlsx,.xls',
              endpoint: `${IMPORT_API}/agents-dic`,
              description: 'Base de données des agents (Dic & Dic-2)',
              example: 'Suivi KPI-VF+NPS 3.xlsx',
              maxSize: '50 MB',
            }} 
          />
          <div className="card mt-4" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>💡</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#3B82F6' }}>
                  Importation des agents
                </div>
                <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                  <li>Uploadez le fichier de suivi contenant les onglets <strong>Dic</strong> et <strong>Dic-2</strong>.</li>
                  <li>Les données seront fusionnées pour mettre à jour ou créer de nouveaux agents.</li>
                  <li>Les doublons seront gérés grâce au nom normalisé et au matricule.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)', padding: 24, borderRadius: 16, width: '100%', maxWidth: 600,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)', border: '1px solid var(--border)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Ajouter un nouvel agent</h2>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Matricule RH *</label>
                  <input required name="matricule" value={formData.matricule} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Bannette / Activité</label>
                  <select name="bannette" value={formData.bannette} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }}>
                    {BANNETTES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Nom *</label>
                  <input required name="nom" value={formData.nom} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Prénom *</label>
                  <input required name="prenom" value={formData.prenom} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Code GDI</label>
                  <input name="codeGdi" value={formData.codeGdi} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Login Grafana (NPS)</label>
                  <input name="loginGrafana" value={formData.loginGrafana} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Location</label>
                  <input name="location" value={formData.location} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>SVI</label>
                  <input name="svi" value={formData.svi} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Licence</label>
                  <input name="licence" value={formData.licence} onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
