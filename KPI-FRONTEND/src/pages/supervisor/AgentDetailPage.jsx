import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { agentService } from '../../services/agentService';

const BANNETTES = ['FO', 'BO', 'Promocash', 'Proximité', 'SCO', 'PX/PMC', 'Promocash / Proximité'];

export default function AgentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    bannette: '',
    codeGdi: '',
    loginGrafana: '',
    email: '',
    location: '',
    svi: '',
    licence: ''
  });

  useEffect(() => {
    loadAgent();
  }, [id]);

  const loadAgent = async () => {
    try {
      setLoading(true);
      const data = await agentService.getAgentById(id);
      setAgent(data);
      setFormData({
        matricule: data.matricule || '',
        nom: data.nom || '',
        prenom: data.prenom || '',
        bannette: data.equipeNom || data.bannette || '',
        codeGdi: data.codeGdi || '',
        loginGrafana: data.loginGrafana || '',
        email: data.email || '',
        location: data.location || '',
        svi: data.svi || '',
        licence: data.licence || ''
      });
    } catch (err) {
      toast.error('Erreur lors du chargement de l\'agent');
      navigate('/supervisor/agents');
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
      await agentService.updateAgent(id, formData);
      toast.success('Agent mis à jour avec succès');
      loadAgent();
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la mise à jour de l\'agent');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement des détails de l'agent...</div>;
  }

  if (!agent) return null;

  return (
    <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header flex-between" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            className="btn" 
            onClick={() => navigate('/supervisor/agents')}
            style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
          >
            ← Retour
          </button>
          <div>
            <h1 className="page-title">Profil Agent</h1>
            <p className="page-subtitle">{agent.matricule}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {(agent.prenom?.[0] || '')}{(agent.nom?.[0] || '')}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{agent.prenom} {agent.nom}</h2>
            <div style={{ color: 'var(--text-secondary)', marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="badge badge-purple">{formData.bannette || 'Non assigné'}</span>
              <span>{agent.email}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Informations générales</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Nom</label>
              <input name="nom" value={formData.nom} onChange={handleInputChange} required
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Prénom</label>
              <input name="prenom" value={formData.prenom} onChange={handleInputChange} required
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)', fontWeight: 600 }}>Équipe / Bannette</label>
              <select name="bannette" value={formData.bannette} onChange={handleInputChange}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', fontWeight: 500 }}>
                {BANNETTES.map(b => <option key={b} value={b}>{b}</option>)}
                {!BANNETTES.includes(formData.bannette) && formData.bannette && (
                  <option value={formData.bannette}>{formData.bannette}</option>
                )}
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Changer l'équipe affectera les statistiques associées à cet agent.</p>
            </div>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Identifiants Systèmes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Code GDI (Appels)</label>
              <input name="codeGdi" value={formData.codeGdi} onChange={handleInputChange}
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Login Grafana (NPS)</label>
              <input name="loginGrafana" value={formData.loginGrafana} onChange={handleInputChange}
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', fontFamily: 'monospace' }} />
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              style={{ padding: '10px 24px', fontSize: 14 }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
