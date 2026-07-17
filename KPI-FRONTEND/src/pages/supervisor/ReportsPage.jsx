import { useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart3, Check, ClipboardList, Download, FileText, Star, Trophy } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'kpi_weekly', label: 'KPI Hebdomadaire', icon: BarChart3, desc: 'Resolution, escalade, QS par agent' },
  { id: 'nps_monthly', label: 'NPS Mensuel', icon: Star, desc: 'Score NPS par bannette et par agent' },
  { id: 'agent_score', label: 'Scores agents', icon: Trophy, desc: 'Classement et scores composites' },
  { id: 'full_report', label: 'Rapport complet', icon: ClipboardList, desc: 'Toutes les metriques consolidees' },
];

function FormatIcon({ type, size = 20 }) {
  return type === 'EXCEL' ? <BarChart3 size={size} /> : <FileText size={size} />;
}

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState('kpi_weekly');
  const [period, setPeriod] = useState('WEEKLY');
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState('EXCEL');

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    setGenerating(false);
    toast.success('Rapport genere. Telechargement en cours...');
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Rapports</h1>
        <p className="page-subtitle">Generez des rapports Excel ou PDF a partir des donnees KPI et NPS</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title"><div className="dot" />Configurer le rapport</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, letterSpacing: '0.05em' }}>TYPE DE RAPPORT</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {REPORT_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <div key={t.id} onClick={() => setSelectedType(t.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderRadius: 10, border: `1px solid ${selectedType === t.id ? 'rgba(82,54,152,0.32)' : 'var(--border)'}`,
                      background: selectedType === t.id ? 'var(--accent-primary-glow)' : 'var(--bg-input)',
                      cursor: 'pointer', transition: 'var(--transition)',
                    }}>
                      <Icon size={20} color="var(--accent-primary)" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.desc}</div>
                      </div>
                      {selectedType === t.id && (
                        <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>PERIODE</label>
                <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}>
                  <option value="WEEKLY">Semaine S17</option>
                  <option value="MONTHLY">Avril 2026</option>
                  <option value="QUARTERLY">Q1 2026</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, letterSpacing: '0.05em' }}>FORMAT</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['EXCEL', 'PDF'].map(f => (
                    <button key={f} onClick={() => setFormat(f)} style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: `1px solid ${format === f ? 'var(--accent-primary)' : 'var(--border)'}`, background: format === f ? 'var(--accent-primary-glow)' : 'var(--bg-input)', color: format === f ? 'var(--accent-primary)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'var(--transition)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <FormatIcon type={f} size={14} /> {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={generating} className="btn btn-primary" style={{ justifyContent: 'center', padding: '13px' }}>
              {generating ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Generation en cours...</> : <><Download size={16} /> Generer le rapport {format}</>}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-title"><div className="dot" style={{ background: '#06B6D4' }} />Rapports recents</div>
          {[
            { nom: 'KPI_S16_equipe_DS.xlsx', taille: '2.4 MB', date: '28/04/2026', type: 'EXCEL' },
            { nom: 'NPS_Avril2026_bannettes.xlsx', taille: '1.8 MB', date: '30/04/2026', type: 'EXCEL' },
            { nom: 'Scores_agents_S15.pdf', taille: '856 KB', date: '21/04/2026', type: 'PDF' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <FormatIcon type={r.type} size={22} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.taille} - {r.date}</div>
              </div>
              <button className="btn btn-ghost btn-sm"><Download size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
