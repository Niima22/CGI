import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Target, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const enableDemoLogin = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login({ username, password });
    setLoading(false);
    
    if (result.success) {
      toast.success(`Bienvenue ! Connexion ${result.role === 'SUPERVISOR' ? 'Superviseur' : 'Agent'}`);
      navigate(result.role === 'SUPERVISOR' ? '/supervisor/dashboard' : '/agent/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  const fillDemo = (role) => {
    setUsername(role === 'supervisor' ? 'malika' : 'agent1');
    setPassword(role === 'supervisor' ? 'admin123' : 'agent123');
  };

  return (
    <div style={{
      height: '100%', minHeight: 0, background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(82,54,152,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(169,78,137,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: 'white', margin: '0 auto 16px',
            boxShadow: 'var(--shadow-primary)',
          }}>K</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>Indicateurs KPI</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>DS Magasin · Carrefour Support IT</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '32px', backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Connexion</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>IDENTIFIANT</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="votre.login" required
                style={{
                  width: '100%', padding: '11px 14px', background: 'var(--bg-input)',
                  border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-primary)',
                  fontSize: 14, fontFamily: 'var(--font)', outline: 'none', transition: 'var(--transition)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>MOT DE PASSE</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{
                  width: '100%', padding: '11px 14px', background: 'var(--bg-input)',
                  border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-primary)',
                  fontSize: 14, fontFamily: 'var(--font)', outline: 'none', transition: 'var(--transition)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 8, padding: '12px', background: 'var(--gradient-primary)',
              border: 'none', borderRadius: 10, color: 'white', fontSize: 14,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1,
              transition: 'var(--transition)', boxShadow: loading ? 'none' : '0 4px 20px rgba(82,54,152,0.28)',
            }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Connexion...</> : '→ Se connecter'}
            </button>
          </form>

          {enableDemoLogin && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Accès démo rapide</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => fillDemo('supervisor')} style={{
                padding: '9px 0', background: 'rgba(0,0,0,0.03)',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font)', transition: 'var(--transition)',
              }}><Target size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Superviseur</button>
              <button onClick={() => fillDemo('agent')} style={{
                padding: '9px 0', background: 'var(--accent-primary-glow)',
                border: '1px solid rgba(82,54,152,0.2)', borderRadius: 8,
                color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font)', transition: 'var(--transition)',
              }}><User size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Agent</button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
