import UnavailableState from '../../components/common/UnavailableState';

export default function MyKpiPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Mes KPI</h1>
        <p className="page-subtitle">Indicateurs personnels de performance.</p>
      </div>
      <UnavailableState message="Le service des KPI personnels agent n'est pas encore connecte." />
    </div>
  );
}
