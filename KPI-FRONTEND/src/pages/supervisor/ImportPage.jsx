import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { KPI_API_BASE_URL } from '../../services/api';

const IMPORT_API = `${KPI_API_BASE_URL}/import/upload`;

const FILE_TYPES = [
  {
    key: 'suivi-kpi-nps',
    label: 'Suivi KPI & NPS',
    icon: '📊',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
    accept: '.xlsx,.xls',
    endpoint: `${IMPORT_API}/suivi-kpi-nps`,
    description: 'Fichier principal de suivi hebdomadaire (KPI + NPS)',
    example: 'Suivi KPI-VF+NPS 3.xlsx',
    maxSize: '50 MB',
  },
  {
    key: 'nps',
    label: 'Détails NPS',
    icon: '⭐',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    accept: '.csv',
    endpoint: `${IMPORT_API}/nps`,
    description: 'Scores NPS à chaud par agent',
    example: 'Détails NPS à chaud...csv',
    maxSize: '30 MB',
  },
  {
    key: 'prod',
    label: 'Productivité',
    icon: '📈',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
    accept: '.csv',
    endpoint: `${IMPORT_API}/productivite`,
    description: 'Résolutions, escalades et transferts',
    example: 'Détails Productivité DA+DS+INC...csv',
    maxSize: '30 MB',
  },
  {
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
  },
];

export function UploadCard({ config }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const token = useAuthStore(state => state.token);
  const navigate = useNavigate();

  const handleFile = useCallback((selectedFile) => {
    setFile(selectedFile);
    setResult(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 15, 90));
    }, 300);

    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(config.endpoint, { 
        method: 'POST', 
        body: formData,
        headers: headers
      });
      clearInterval(interval);
      setProgress(100);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.detail || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      toast.success(`✅ ${file.name} traité avec succès`);
      
      if (data.importId) {
        navigate(`/supervisor/import/result/${data.importId}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      clearInterval(interval);
      toast.error(`❌ ${err.message}`);
      setResult({ error: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Colored top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: config.gradient }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingTop: 8 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: config.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          boxShadow: `0 4px 14px ${config.color}40`,
        }}>{config.icon}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{config.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{config.description}</div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`input-${config.key}`).click()}
        style={{
          border: `2px dashed ${dragActive ? config.color : file ? '#10B981' : 'var(--border)'}`,
          borderRadius: 14, padding: '28px 16px', textAlign: 'center', cursor: 'pointer',
          background: dragActive ? `${config.color}08` : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-input)',
          transition: 'all 0.2s ease', marginBottom: 14,
        }}
      >
        <input
          id={`input-${config.key}`}
          type="file"
          accept={config.accept}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />

        {file ? (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#10B981', marginBottom: 4 }}>
              {file.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB — Prêt à envoyer
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{dragActive ? '📥' : config.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              {dragActive ? 'Relâchez ici' : 'Glissez votre fichier ici'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ou cliquez pour sélectionner — {config.example}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              Formats : {config.accept} · Max {config.maxSize}
            </div>
          </>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
            <span>Traitement en cours...</span><span>{progress}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-input)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, background: config.gradient,
              width: `${progress}%`, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none',
          background: file && !uploading ? config.gradient : 'var(--bg-input)',
          color: file && !uploading ? 'white' : 'var(--text-muted)',
          fontSize: 13, fontWeight: 700, cursor: file && !uploading ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--font)', transition: 'all 0.2s ease',
          boxShadow: file && !uploading ? `0 4px 14px ${config.color}35` : 'none',
        }}
      >
        {uploading ? '⏳ Traitement...' : file ? '🚀 Lancer l\'import' : 'Sélectionnez un fichier'}
      </button>

      {/* Results */}
      {result && !result.error && result.data && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 10,
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#10B981', marginBottom: 8 }}>
            ✓ Import réussi
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Lignes : <strong style={{ color: 'var(--text-primary)' }}>{result.data.count?.toLocaleString()}</strong>
            </div>
            {result.data.stats && Object.entries(result.data.stats).filter(([k]) => k !== 'total').map(([k, v]) => (
              <div key={k} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {k} : <strong style={{ color: 'var(--text-primary)' }}>{v?.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.error && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 10,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: 12, color: '#EF4444',
        }}>
          ❌ {result.error}
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Import de données</h1>
        <p className="page-subtitle">
          Importez vos 3 fichiers sources pour alimenter les tableaux de bord KPI, NPS et Productivité
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
        marginBottom: 24,
      }}>
        {FILE_TYPES.map(config => (
          <UploadCard key={config.key} config={config} />
        ))}
      </div>

      {/* Info */}
      <div className="card" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#3B82F6' }}>
              Comment ça fonctionne ?
            </div>
            <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
              <li>Le système détecte automatiquement les colonnes et les séparateurs de vos fichiers.</li>
              <li>Les noms des agents sont normalisés pour éviter les doublons (ex : "Faid Anas" = "ANAS FAID").</li>
              <li>Les données sont envoyées au backend et sauvegardées en base de données PostgreSQL.</li>
              <li>Vous pouvez ré-importer un fichier à tout moment, les doublons sont gérés automatiquement.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
