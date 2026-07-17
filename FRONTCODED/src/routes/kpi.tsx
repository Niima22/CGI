import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  GaugeCircle,
  RefreshCw,
  TicketCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { RoleGuard } from "@/components/app/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, SectionSurface, StatCard } from "@/components/ui/page";
import {
  getEmployeeKpiSummary,
  getEmployeeProductivity,
  getEmployeeWorkload,
  type EmployeeProductivityKpiResponse,
  type EmployeeWorkloadKpiResponse,
  type KpiEmployeeSummaryResponse,
} from "@/lib/api/kpi";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kpi")({
  head: () => ({
    meta: [
      { title: "Indicateurs KPI - CGI-Intranet" },
      {
        name: "description",
        content: "Indicateurs KPI opérationnels alimentés par les données PostgreSQL.",
      },
    ],
  }),
  component: KpiPage,
});

function KpiPage() {
  const { authenticatedFetch } = useAuth();
  const [summary, setSummary] = useState<KpiEmployeeSummaryResponse | null>(null);
  const [workload, setWorkload] = useState<EmployeeWorkloadKpiResponse[]>([]);
  const [productivity, setProductivity] = useState<EmployeeProductivityKpiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [summaryResult, workloadResult, productivityResult] = await Promise.allSettled([
      getEmployeeKpiSummary(authenticatedFetch),
      getEmployeeWorkload(authenticatedFetch, 8),
      getEmployeeProductivity(authenticatedFetch, 8),
    ]);

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
    } else {
      setSummary(null);
    }

    if (workloadResult.status === "fulfilled") {
      setWorkload(workloadResult.value);
    } else {
      setWorkload([]);
    }

    if (productivityResult.status === "fulfilled") {
      setProductivity(productivityResult.value);
    } else {
      setProductivity([]);
    }

    if (
      summaryResult.status === "rejected" &&
      workloadResult.status === "rejected" &&
      productivityResult.status === "rejected"
    ) {
      setError("Données KPI temporairement indisponibles.");
    }

    setLoading(false);
  }, [authenticatedFetch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const highestWorkload = useMemo(
    () => workload.reduce<EmployeeWorkloadKpiResponse | null>((current, item) => {
      if (!current || item.workloadScore > current.workloadScore) {
        return item;
      }
      return current;
    }, null),
    [workload],
  );

  const generatedAt = summary?.generatedAt ? formatDateTime(summary.generatedAt) : null;

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER"]}
        message="Les indicateurs KPI sont réservés aux Pilotes et aux Superviseurs."
      >
        <PageContainer maxWidth="7xl">
          <PageHeader
            icon={<BarChart3 className="h-5 w-5" />}
            title="Indicateurs KPI"
            description="Suivi opérationnel alimenté par les tickets, SLA et affectations enregistrés en PostgreSQL."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {generatedAt ? (
                  <span className="text-xs text-muted-foreground">Actualisé à {generatedAt}</span>
                ) : null}
                <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Actualiser
                </Button>
              </div>
            }
          />

          {error ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
                Réessayer
              </Button>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Agents suivis"
              value={loading ? "..." : formatMetric(summary?.totalAgentsWithTickets)}
              detail="Agents avec tickets assignés"
            />
            <StatCard
              label="Tickets actifs assignés"
              value={loading ? "..." : formatMetric(summary?.totalActiveAssignedTickets)}
              detail="Tickets ouverts ou en traitement"
            />
            <StatCard
              label="Score de charge moyen"
              value={loading ? "..." : formatNumber(summary?.averageWorkloadScore)}
              detail="Non calculé sans affectations"
            />
            <StatCard
              label="Meilleur respect SLA"
              value={loading ? "..." : formatPercent(summary?.bestSlaComplianceRate)}
              detail="Meilleure performance agent"
            />
            <StatCard
              label="Respect SLA le plus bas"
              value={loading ? "..." : formatPercent(summary?.lowestSlaComplianceRate)}
              detail="Point d'attention prioritaire"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <SectionSurface className="xl:col-span-7">
              <SectionHeader
                icon={<GaugeCircle className="h-4 w-4" />}
                title="Charge des équipes"
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/employees">Voir l'équipe</Link>
                  </Button>
                }
              />
              {loading ? (
                <EmptyState label="Chargement des charges KPI..." />
              ) : workload.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {workload.map((member) => (
                    <WorkloadRow key={`${member.assignedUserId ?? "user"}-${member.assignedUserLabel}`} member={member} />
                  ))}
                </div>
              ) : (
                <EmptyState label="Aucune charge d'équipe disponible." />
              )}
            </SectionSurface>

            <SectionSurface className="xl:col-span-5">
              <SectionHeader icon={<AlertTriangle className="h-4 w-4" />} title="Points d'attention" />
              {loading ? (
                <EmptyState label="Chargement des alertes KPI..." />
              ) : (
                <div className="space-y-3 p-4 pt-0">
                  {highestWorkload ? (
                    <AttentionItem
                      icon={<Users className="h-4 w-4" />}
                      title={highestWorkload.assignedUserLabel}
                      detail={`${formatMetric(highestWorkload.totalAssignedTickets)} tickets assignés · score ${formatNumber(highestWorkload.workloadScore)}`}
                    />
                  ) : null}
                  {summary?.lowestSlaComplianceRate !== null && summary?.lowestSlaComplianceRate !== undefined ? (
                    <AttentionItem
                      icon={<GaugeCircle className="h-4 w-4" />}
                      title="Respect SLA à surveiller"
                      detail={`${formatPercent(summary.lowestSlaComplianceRate)} sur le point le plus bas`}
                    />
                  ) : null}
                  {workload.some((member) => member.breachedTickets > 0 || member.atRiskTickets > 0) ? (
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/tickets">Consulter les tickets</Link>
                    </Button>
                  ) : null}
                  {!highestWorkload &&
                  (summary?.lowestSlaComplianceRate === null || summary?.lowestSlaComplianceRate === undefined) ? (
                    <EmptyState label="Aucun point d'attention KPI." compact />
                  ) : null}
                </div>
              )}
            </SectionSurface>
          </div>

          <SectionSurface>
            <SectionHeader
              icon={<TicketCheck className="h-4 w-4" />}
              title="Productivité tickets"
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to="/tickets">Tous les tickets</Link>
                </Button>
              }
            />
            {loading ? (
              <EmptyState label="Chargement de la productivité KPI..." />
            ) : productivity.length > 0 ? (
              <div className="grid gap-3 p-4 pt-0 md:grid-cols-2 xl:grid-cols-4">
                {productivity.map((member) => (
                  <ProductivityCard
                    key={`${member.assignedUserId ?? "user"}-${member.assignedUserLabel}`}
                    member={member}
                  />
                ))}
              </div>
            ) : (
              <EmptyState label="Aucune productivité calculée." />
            )}
          </SectionSurface>
        </PageContainer>
      </RoleGuard>
    </AppShell>
  );
}

function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-cgi-soft text-[color:var(--cgi-purple)]">
          {icon}
        </span>
        {title}
      </div>
      {action}
    </div>
  );
}

function WorkloadRow({ member }: { member: EmployeeWorkloadKpiResponse }) {
  const tone = member.breachedTickets > 0 ? "destructive" : member.atRiskTickets > 0 ? "warning" : "neutral";

  return (
    <div className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{member.assignedUserLabel}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatMetric(member.totalAssignedTickets)} tickets assignés
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <MiniMetric label="À faire" value={member.todoTickets} />
        <MiniMetric label="En cours" value={member.inProgressTickets} />
        <MiniMetric label="En attente" value={member.waitingTickets} />
        <MiniMetric label="Critiques" value={member.criticalTickets} />
      </div>
      <Badge className={getBadgeClass(tone)}>
        {member.breachedTickets > 0
          ? `${member.breachedTickets} SLA dépassé(s)`
          : member.atRiskTickets > 0
            ? `${member.atRiskTickets} SLA en risque`
            : "Stable"}
      </Badge>
    </div>
  );
}

function ProductivityCard({ member }: { member: EmployeeProductivityKpiResponse }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
      <div className="truncate text-sm font-semibold">{member.assignedUserLabel}</div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MiniMetric label="Traités" value={member.processedTickets} />
        <MiniMetric label="Résolus" value={member.resolvedTickets} />
        <MiniMetric label="SLA respectés" value={member.slaRespectedTickets} />
        <MiniMetric label="SLA dépassés" value={member.slaBreachedTickets} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" />
        Temps moyen: {formatDuration(member.averageTreatmentMinutes)}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Respect SLA: {formatPercent(member.slaComplianceRate)}
      </div>
    </div>
  );
}

function AttentionItem({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border/60 bg-white p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-cgi-soft text-[color:var(--cgi-purple)]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/50 px-3 py-2">
      <div className="truncate text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={cn("text-sm text-muted-foreground", compact ? "py-2" : "p-4 pt-0")}>
      {label}
    </div>
  );
}

function getBadgeClass(tone: "destructive" | "warning" | "neutral") {
  if (tone === "destructive") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatMetric(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Aucune donnée";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Non calculé";
  }
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Non calculé";
  }
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} %`;
}

function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "Non calculé";
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(minutes / 60)} h`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
