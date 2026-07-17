import UnavailableState from '../../components/common/UnavailableState';
import { useAuthStore } from '../../store/authStore';

export default function AgentDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord agent</h1>
        <p className="page-subtitle">
          Bonjour {user?.prenom || user?.login || 'agent'}.
        </p>
      </div>
      <UnavailableState message="Les indicateurs agent detailles seront affiches ici des que les endpoints agent personnels seront connectes." />
    </div>
  );
}
