export default function UnavailableState({
  title = 'Fonctionnalite temporairement indisponible.',
  message = "Le service associe n'est pas encore connecte.",
}) {
  return (
    <div className="card" style={{ padding: 28, textAlign: 'center' }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          margin: '0 auto 14px',
          background: 'rgba(245,158,11,0.14)',
          display: 'grid',
          placeItems: 'center',
          color: '#F59E0B',
          fontWeight: 800,
        }}
      >
        !
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        {title}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto' }}>
        {message}
      </p>
    </div>
  );
}
