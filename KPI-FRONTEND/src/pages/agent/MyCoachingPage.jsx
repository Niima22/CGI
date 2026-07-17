import UnavailableState from '../../components/common/UnavailableState';

export default function MyCoachingPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Mon coaching</h1>
        <p className="page-subtitle">Plans d'accompagnement et objectifs.</p>
      </div>
      <UnavailableState message="Le service coaching agent n'est pas encore connecte." />
    </div>
  );
}
