import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { kpiService } from '../../services/kpiService';
import { npsService } from '../../services/npsService';

const BANNETTE_COLORS = {
  FO: '#3B82F6',
  BO: '#8B5CF6',
  Promocash: '#F59E0B',
  Proximite: '#10B981',
  SCO: '#06B6D4',
};

const emptyData = {
  daily: [],
  weekly: [],
  npsSummary: null,
  npsRetours: [],
  agentScores: [],
  alerts: [],
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: '#6B7280' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: '#111827' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function StatCard({ label, value, sub, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}18` }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-sub">{sub}</div>
      </div>
      <div style={{ position: 'absolute', right: 16, top: 16, opacity: 0.06, fontSize: 48, lineHeight: 1 }}>{icon}</div>
    </div>
  );
}

function EmptyState({ children = 'Aucune donnee disponible.' }) {
  return (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
      {children}
    </div>
  );
}

function NpsGauge({ score }) {
  if (score == null) {
    return <EmptyState>Score NPS non calcule.</EmptyState>;
  }
  const color = score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  const angle = (score / 100) * 180;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${angle * 1.047} 999`}
        />
        <text x="70" y="68" textAnchor="middle" fill="#111827" fontSize="20" fontWeight="700">{Math.round(score)}</text>
        <text x="70" y="80" textAnchor="middle" fill="#6B7280" fontSize="9">NPS GLOBAL</text>
      </svg>
    </div>
  );
}

function buildNpsByBannette(retours) {
  const groups = {};
  retours.forEach((retour) => {
    const bannette = retour.bannetteGrafana || retour.equipeDs || 'Non assigne';
    if (!groups[bannette]) groups[bannette] = { promoteurs: 0, detracteurs: 0, neutres: 0 };
    if (retour.nps >= 9) groups[bannette].promoteurs += 1;
    else if (retour.nps <= 6) groups[bannette].detracteurs += 1;
    else groups[bannette].neutres += 1;
  });

  return Object.entries(groups).map(([bannette, values]) => {
    const total = values.promoteurs + values.neutres + values.detracteurs;
    const score = total > 0 ? ((values.promoteurs - values.detracteurs) / total) * 100 : null;
    return {
      bannette,
      total,
      score_nps: score == null ? null : Math.round(score),
    };
  });
}

export default function SupervisorDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(emptyData);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const [daily, weekly, npsSummary, leaderboard, npsRetours, alerts] = await Promise.all([
          kpiService.getDaily().catch(() => []),
          kpiService.getWeekly().catch(() => []),
          npsService.getSummary().catch(() => null),
          kpiService.getLeaderboard().catch(() => []),
          npsService.getRetours().catch(() => []),
          kpiService.getAlerts().catch(() => []),
        ]);

        if (mounted) {
          setData({
            daily: Array.isArray(daily) ? daily : [],
            weekly: Array.isArray(weekly) ? weekly : [],
            npsSummary,
            npsRetours: Array.isArray(npsRetours) ? npsRetours : [],
            agentScores: Array.isArray(leaderboard) ? leaderboard : [],
            alerts: Array.isArray(alerts) ? alerts : [],
          });
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Impossible de charger les indicateurs KPI.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const count = data.daily.length;
    const totals = data.daily.reduce(
      (acc, item) => {
        acc.ticketsResolus += item.ticketsResolus || 0;
        acc.appelsRepondus += item.appelsRepondus || 0;
        acc.qs += item.qs || 0;
        acc.tauxResolution += item.tauxResolution || 0;
        return acc;
      },
      { ticketsResolus: 0, appelsRepondus: 0, qs: 0, tauxResolution: 0 },
    );

    return {
      ticketsResolus: totals.ticketsResolus,
      appelsRepondus: totals.appelsRepondus,
      qs: count > 0 ? `${(totals.qs / count).toFixed(1)}%` : 'Non calcule',
      tauxResolution: count > 0 ? `${(totals.tauxResolution / count).toFixed(1)}%` : 'Non calcule',
      nps: data.npsSummary?.npsNet ?? null,
    };
  }, [data]);

  const npsByBannette = useMemo(() => buildNpsByBannette(data.npsRetours), [data.npsRetours]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Chargement des KPI...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div className="section-title"><div className="dot" style={{ background: '#EF4444' }} />Indicateurs indisponibles</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="grid-4 mb-4">
        <StatCard label="Tickets resolus" value={summary.ticketsResolus.toLocaleString()} sub="Periode actuelle" icon="OK" color="#10B981" />
        <StatCard label="Appels repondus" value={summary.appelsRepondus.toLocaleString()} sub="Periode actuelle" icon="TEL" color="#3B82F6" />
        <StatCard label="QS moyenne" value={summary.qs} sub="Qualite de service" icon="QS" color="#F59E0B" />
        <StatCard label="Taux resolution" value={summary.tauxResolution} sub="Moyenne globale" icon="%" color="#8B5CF6" />
      </div>

      <div className="grid-3 mb-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <div className="section-title"><div className="dot" />Evolution KPI par semaine</div>
          {data.weekly.length === 0 ? (
            <EmptyState>Aucune donnee KPI hebdomadaire disponible.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.weekly} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="semaine" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#6B7280' }} />
                <Line type="monotone" dataKey="tauxResolution" name="Resolution" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="qs" name="QS" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="section-title" style={{ justifyContent: 'center' }}><div className="dot" style={{ background: '#F59E0B' }} />NPS global</div>
            <NpsGauge score={summary.nps} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Score moyen toutes bannettes</p>
          </div>
          <div className="card">
            <div className="section-title"><div className="dot" style={{ background: '#EF4444' }} />Alertes actives</div>
            {data.alerts.length === 0 ? (
              <EmptyState>Aucune alerte active.</EmptyState>
            ) : (
              data.alerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="card card-sm mb-4" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{alert.type}</div>
                    <span className="badge badge-yellow" style={{ fontSize: 10 }}>{alert.niveau}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                    {alert.agentNom || alert.agent_nom || alert.bannette || 'Non assigne'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title"><div className="dot" style={{ background: '#8B5CF6' }} />NPS par bannette</div>
          {npsByBannette.length === 0 ? (
            <EmptyState>Aucune donnee NPS disponible.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={npsByBannette} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="bannette" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score_nps" radius={[6, 6, 0, 0]}>
                  {npsByBannette.map((entry, index) => (
                    <Cell key={entry.bannette} fill={BANNETTE_COLORS[entry.bannette] || Object.values(BANNETTE_COLORS)[index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="section-title"><div className="dot" style={{ background: '#10B981' }} />Top agents - Score global</div>
          {data.agentScores.length === 0 ? (
            <EmptyState>Aucun score agent disponible.</EmptyState>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...data.agentScores].sort((a, b) => (b.scoreGlobal || 0) - (a.scoreGlobal || 0)).slice(0, 5).map((agent, index) => {
                const score = agent.scoreGlobal ?? agent.score_global ?? 0;
                return (
                  <div key={agent.agentCodeGdi || agent.agent_id || index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="stat-icon" style={{ width: 26, height: 26, fontSize: 11 }}>{index + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{agent.agentNomComplet || agent.agent_nom || agent.agentCodeGdi}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA' }}>{Number(score).toFixed(1)}</span>
                      </div>
                      <div className="score-bar"><div className="score-fill" style={{ width: `${Math.min(100, score)}%` }} /></div>
                    </div>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>{agent.equipeDs || agent.bannette || 'N/A'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
