import UnavailableState from '../../components/common/UnavailableState';

export default function MyNpsPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Mon NPS</h1>
        <p className="page-subtitle">Satisfaction client liee a mes tickets.</p>
      </div>
      <UnavailableState message="Le service NPS personnel agent n'est pas encore connecte." />
    </div>
  );
}
