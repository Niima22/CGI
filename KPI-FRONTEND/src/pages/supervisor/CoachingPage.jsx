import UnavailableState from '../../components/common/UnavailableState';

export default function CoachingPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Coaching</h1>
        <p className="page-subtitle">Plans d'action et accompagnement des agents.</p>
      </div>
      <UnavailableState message="Le service coaching/action plans sera connecte dans un jalon dedie." />
    </div>
  );
}
