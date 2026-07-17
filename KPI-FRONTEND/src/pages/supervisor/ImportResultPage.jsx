import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { KPI_API_BASE_URL } from '../../services/api';
import { ArrowLeft, ArrowRight, BarChart3, Check, Star, X } from 'lucide-react';

export default function ImportResultPage() {
  const { importId } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore(state => state.token);
  const [loading, setLoading] = useState(true);
  const [importData, setImportData] = useState(null);

  useEffect(() => {
    const fetchImportDetails = async () => {
      try {
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${KPI_API_BASE_URL}/import/history/${importId}`, { headers });
        if (!res.ok) {
          throw new Error(`Erreur lors de la récupération (${res.status})`);
        }
        const data = await res.json();
        setImportData(data);
      } catch (err) {
        toast.error(`Impossible de charger les details: ${err.message}`);
        navigate('/supervisor/import');
      } finally {
        setLoading(false);
      }
    };

    fetchImportDetails();
  }, [importId, token, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 40, height: 40, border: '4px solid rgba(82, 54, 152, 0.1)', borderTop: '4px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Chargement des résultats...</div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!importData) return null;

  const isSuccess = importData.status === 'SUCCES' || importData.status === 'success';
  const typeLabels = {
    'CSV_NPS': 'Détails NPS (CSV)',
    'CSV_PRODUCTIVITE': 'Productivité & Tickets (CSV)',
    'EXCEL_KPI_DS_MAGASIN': 'Suivi KPI & NPS (Excel)',
  };

  return (
    <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title">Rapport d'importation</h1>
        <p className="page-subtitle">Détails de l'intégration des données en base de données</p>
      </div>

      <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: 30, marginBottom: 24 }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 6,
          background: isSuccess ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #EF4444, #DC2626)'
        }} />

        {/* Status Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: isSuccess ? '#10B981' : '#EF4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
          }}>
            {isSuccess ? <Check size={28} /> : <X size={28} />}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {isSuccess ? 'Intégration Réussie' : 'Échec de l\'intégration'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Importation ID : <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>#{importData.importId}</code>
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
          <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fichier</div>
            <div style={{ fontSize: 14, fontWeight: 700, wordBreak: 'break-all', color: 'var(--text-primary)' }}>{importData.filename}</div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type de Données</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{typeLabels[importData.typeSource] || importData.typeSource}</div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date d'import</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {new Date(importData.dateImport).toLocaleString('fr-FR')}
            </div>
          </div>
        </div>

        {/* Counter Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 30 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Lignes analysées</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{importData.totalRows}</div>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center', background: 'rgba(16,185,129,0.02)' }}>
            <div style={{ fontSize: 12, color: '#10B981', marginBottom: 6 }}>Lignes insérées</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{importData.insertedRows}</div>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center', background: importData.errorCount > 0 ? 'rgba(239,68,68,0.02)' : 'none' }}>
            <div style={{ fontSize: 12, color: importData.errorCount > 0 ? '#EF4444' : 'var(--text-secondary)', marginBottom: 6 }}>Erreurs rencontrées</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: importData.errorCount > 0 ? '#EF4444' : 'var(--text-primary)' }}>{importData.errorCount || 0}</div>
          </div>
        </div>

        {/* Log details */}
        {importData.message && (
          <div style={{
            background: isSuccess ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
            border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
            padding: 16, borderRadius: 12, marginBottom: 30
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: isSuccess ? '#10B981' : '#EF4444', marginBottom: 6 }}>
              Détails du message :
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, fontFamily: 'monospace' }}>
              {importData.message}
            </div>
          </div>
        )}

        {/* Back navigation */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={() => navigate('/supervisor/import')}
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Retourner aux Imports
          </button>
          
          {isSuccess && (importData.typeSource === 'CSV_PRODUCTIVITE' || importData.typeSource === 'EXCEL_KPI_DS_MAGASIN') && (
            <button
              onClick={() => navigate('/supervisor/kpi-explorer')}
              style={{
                padding: '10px 20px', borderRadius: 8, border: '1px solid var(--accent-primary)',
                background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
            >
              <BarChart3 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Explorer KPI
            </button>
          )}

          {isSuccess && (importData.typeSource === 'CSV_NPS' || importData.typeSource === 'EXCEL_KPI_DS_MAGASIN') && (
            <button
              onClick={() => navigate('/supervisor/nps-explorer')}
              style={{
                padding: '10px 20px', borderRadius: 8, border: '1px solid #10B981',
                background: 'rgba(16,185,129,0.05)', color: '#10B981', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}
            >
              <Star size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Explorer NPS
            </button>
          )}

          {isSuccess && (
            <button
              onClick={() => navigate('/supervisor/dashboard')}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: 'var(--gradient-primary)', color: 'white', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-primary)'
              }}
            >
              Dashboard <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
