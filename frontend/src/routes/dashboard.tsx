import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  ShieldCheck,
  Sparkles,
  Ticket,
  Timer,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, SectionSurface } from "@/components/ui/page";
import {
  getEmployeeKpiSummary,
  getEmployeeProductivity,
  getEmployeeWorkload,
  KpiApiError,
  type EmployeeProductivityKpiResponse,
  type EmployeeWorkloadKpiResponse,
  type KpiEmployeeSummaryResponse,
} from "@/lib/api/kpi";
import {
  downloadKpiSlaPdfReport,
  downloadSlaPdfReport,
  ReportsApiError,
} from "@/lib/api/reports";
import {
  getSlaDashboardSummary,
  getSlaUrgentTickets,
  SlaApiError,
  type SlaDashboardSummaryResponse,
  type SlaStatus,
  type SlaUrgentTicketResponse,
} from "@/lib/api/sla";
import {
  getTicketDashboardSummary,
  getTicketPriorityDistribution,
  getTicketStatusDistribution,
  TicketApiError,
  type TicketDashboardSummaryResponse,
  type TicketPriorityDistributionResponse,
  type TicketStatusDistributionResponse,
} from "@/lib/api/tickets";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard - CGI Intranet" },
      {
        name: "description",
        content:
          "Centre de contrôle CGI : snapshot opérationnel des incidents, SLA, Quality Lab IA et ressources.",
      },
    ],
  }),
  component: DashboardPage,
});

type Kpi = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
};

function DashboardPage() {
  const { authenticatedFetch, hasRole } = useAuth();
  const canReadSlaDashboard = hasRole("ADMIN") || hasRole("MANAGER");
  const canReadTicketDashboard = hasRole("ADMIN") || hasRole("MANAGER");
  const canReadEmployeeKpis = hasRole("ADMIN") || hasRole("MANAGER");

  const [slaSummary, setSlaSummary] = useState<SlaDashboardSummaryResponse | null>(null);
  const [urgentTickets, setUrgentTickets] = useState<SlaUrgentTicketResponse[]>([]);
  const [loadingSla, setLoadingSla] = useState(canReadSlaDashboard);
  const [slaError, setSlaError] = useState<string | null>(null);

  const [ticketSummary, setTicketSummary] = useState<TicketDashboardSummaryResponse | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<TicketStatusDistributionResponse[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<TicketPriorityDistributionResponse[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(canReadTicketDashboard);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [employeeKpiSummary, setEmployeeKpiSummary] = useState<KpiEmployeeSummaryResponse | null>(null);
  const [employeeWorkload, setEmployeeWorkload] = useState<EmployeeWorkloadKpiResponse[]>([]);
  const [employeeProductivity, setEmployeeProductivity] = useState<EmployeeProductivityKpiResponse[]>([]);
  const [loadingEmployeeKpis, setLoadingEmployeeKpis] = useState(canReadEmployeeKpis);
  const [employeeKpiError, setEmployeeKpiError] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState<"kpi-sla" | "sla" | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadSlaDashboard = useCallback(async () => {
    if (!canReadSlaDashboard) {
      setLoadingSla(false);
      setSlaSummary(null);
      setUrgentTickets([]);
      return;
    }

    setLoadingSla(true);
    setSlaError(null);
    try {
      const [summaryResponse, urgentResponse] = await Promise.all([
        getSlaDashboardSummary(authenticatedFetch),
        getSlaUrgentTickets(authenticatedFetch, 10),
      ]);
      setSlaSummary(summaryResponse);
      setUrgentTickets(urgentResponse);
    } catch (caught) {
      setSlaError(readSlaError(caught));
      setSlaSummary(null);
      setUrgentTickets([]);
    } finally {
      setLoadingSla(false);
    }
  }, [authenticatedFetch, canReadSlaDashboard]);

  const loadTicketDashboard = useCallback(async () => {
    if (!canReadTicketDashboard) {
      setLoadingTickets(false);
      setTicketSummary(null);
      setStatusDistribution([]);
      setPriorityDistribution([]);
      return;
    }

    setLoadingTickets(true);
    setTicketError(null);
    try {
      const [summaryResponse, statusResponse, priorityResponse] = await Promise.all([
        getTicketDashboardSummary(authenticatedFetch),
        getTicketStatusDistribution(authenticatedFetch),
        getTicketPriorityDistribution(authenticatedFetch),
      ]);
      setTicketSummary(summaryResponse);
      setStatusDistribution(statusResponse);
      setPriorityDistribution(priorityResponse);
    } catch (caught) {
      setTicketError(readTicketError(caught));
      setTicketSummary(null);
      setStatusDistribution([]);
      setPriorityDistribution([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [authenticatedFetch, canReadTicketDashboard]);

  const loadEmployeeKpis = useCallback(async () => {
    if (!canReadEmployeeKpis) {
      setLoadingEmployeeKpis(false);
      setEmployeeKpiSummary(null);
      setEmployeeWorkload([]);
      setEmployeeProductivity([]);
      return;
    }

    setLoadingEmployeeKpis(true);
    setEmployeeKpiError(null);
    try {
      const [summaryResponse, workloadResponse, productivityResponse] = await Promise.all([
        getEmployeeKpiSummary(authenticatedFetch),
        getEmployeeWorkload(authenticatedFetch, 5),
        getEmployeeProductivity(authenticatedFetch, 5),
      ]);
      setEmployeeKpiSummary(summaryResponse);
      setEmployeeWorkload(workloadResponse);
      setEmployeeProductivity(productivityResponse);
    } catch (caught) {
      setEmployeeKpiError(readEmployeeKpiError(caught));
      setEmployeeKpiSummary(null);
      setEmployeeWorkload([]);
      setEmployeeProductivity([]);
    } finally {
      setLoadingEmployeeKpis(false);
    }
  }, [authenticatedFetch, canReadEmployeeKpis]);

  useEffect(() => {
    void loadSlaDashboard();
  }, [loadSlaDashboard]);

  useEffect(() => {
    void loadTicketDashboard();
  }, [loadTicketDashboard]);

  useEffect(() => {
    void loadEmployeeKpis();
  }, [loadEmployeeKpis]);

  const handleDownloadKpiSlaReport = useCallback(async () => {
    setDownloadingReport("kpi-sla");
    setReportError(null);
    try {
      await downloadKpiSlaPdfReport(authenticatedFetch);
    } catch (caught) {
      setReportError(readReportsError(caught));
    } finally {
      setDownloadingReport(null);
    }
  }, [authenticatedFetch]);

  const handleDownloadSlaReport = useCallback(async () => {
    setDownloadingReport("sla");
    setReportError(null);
    try {
      await downloadSlaPdfReport(authenticatedFetch);
    } catch (caught) {
      setReportError(readReportsError(caught));
    } finally {
      setDownloadingReport(null);
    }
  }, [authenticatedFetch]);

  const slaKpis: Kpi[] = [
    {
      label: "Taux de respect SLA",
      value: formatPercent(slaSummary?.slaComplianceRate),
      hint: slaSummary ? `${formatNumber(slaSummary.respectedTickets)} tickets respectés` : "Suivi global SLA",
      icon: ShieldCheck,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Tickets en risque",
      value: formatNumber(slaSummary?.atRiskTickets),
      hint: "Surveillance prioritaire",
      icon: AlertTriangle,
      tone: "text-amber-600 bg-amber-50",
    },
    {
      label: "Tickets dépassés",
      value: formatNumber(slaSummary?.breachedTickets),
      hint: "Action requise",
      icon: AlertCircle,
      tone: "text-[color:var(--cgi-red)] bg-red-50",
    },
    {
      label: "Tickets critiques dépassés",
      value: formatNumber(slaSummary?.criticalBreachedTickets),
      hint: "Escalade recommandée",
      icon: Activity,
      tone: "text-[color:var(--cgi-red)] bg-red-50",
    },
    {
      label: "Temps moyen de résolution",
      value: formatDurationMinutes(slaSummary?.averageResolutionMinutes),
      hint: "Tickets résolus ou fermés",
      icon: Timer,
      tone: "text-sky-600 bg-sky-50",
    },
    {
      label: "Temps moyen de prise en charge",
      value: formatDurationMinutes(slaSummary?.averageResponseMinutes),
      hint: "Premier traitement",
      icon: Clock,
      tone: "text-[color:var(--cgi-purple)] bg-purple-50",
    },
  ];

  const employeeSummaryKpis: Kpi[] = useMemo(
    () => [
      {
        label: "Agents avec tickets",
        value: formatNumber(employeeKpiSummary?.totalAgentsWithTickets),
        hint: "Agents actuellement pris en compte",
        icon: Users,
        tone: "text-[color:var(--cgi-purple)] bg-purple-50",
      },
      {
        label: "Tickets actifs assignés",
        value: formatNumber(employeeKpiSummary?.totalActiveAssignedTickets),
        hint: "Tickets actifs répartis",
        icon: Ticket,
        tone: "text-sky-600 bg-sky-50",
      },
      {
        label: "Charge moyenne",
        value: formatDecimal(employeeKpiSummary?.averageWorkloadScore),
        hint: "Score moyen par agent",
        icon: TrendingUp,
        tone: "text-amber-600 bg-amber-50",
      },
      {
        label: "Meilleur taux SLA",
        value: formatPercent(employeeKpiSummary?.bestSlaComplianceRate),
        hint: "Performance la plus élevée",
        icon: ShieldCheck,
        tone: "text-emerald-600 bg-emerald-50",
      },
      {
        label: "Taux SLA le plus faible",
        value: formatPercent(employeeKpiSummary?.lowestSlaComplianceRate),
        hint: "Point d'attention",
        icon: AlertTriangle,
        tone: "text-[color:var(--cgi-red)] bg-red-50",
      },
    ],
    [employeeKpiSummary],
  );

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Centre de contrôle"
          description="Snapshot opérationnel en temps réel de la plateforme CGI Intranet."
          actions={
            canReadSlaDashboard ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownloadKpiSlaReport()}
                  disabled={downloadingReport !== null}
                  className="justify-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloadingReport === "kpi-sla" ? "Export du rapport..." : "Exporter rapport KPI & SLA"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownloadSlaReport()}
                  disabled={downloadingReport !== null}
                  className="justify-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloadingReport === "sla" ? "Export du rapport..." : "Exporter rapport SLA"}
                </Button>
              </>
            ) : null
          }
        />

        {reportError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {reportError}
          </div>
        )}

        {canReadSlaDashboard && slaError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Impossible de charger les indicateurs SLA.
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_320px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slaKpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <SectionSurface key={kpi.label} className="p-4 transition-shadow hover:shadow-glow">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-2xl font-bold leading-tight text-foreground">
                    {loadingSla && canReadSlaDashboard ? "..." : kpi.value}
                  </div>
                  <div className="mt-1 text-xs font-medium text-foreground/80">{kpi.label}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{kpi.hint}</div>
                </SectionSurface>
              );
            })}
          </div>

          <QuickActionsCard />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IncidentsCard
            summary={ticketSummary}
            loading={loadingTickets}
            error={ticketError}
            canRead={canReadTicketDashboard}
          />
          <SLACard summary={slaSummary} loading={loadingSla} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TicketStatusDistributionCard
            data={statusDistribution}
            loading={loadingTickets}
            error={ticketError}
            canRead={canReadTicketDashboard}
          />
          <TicketPriorityDistributionCard
            data={priorityDistribution}
            loading={loadingTickets}
            error={ticketError}
            canRead={canReadTicketDashboard}
          />
        </div>

        <UrgentSlaTicketsCard
          tickets={urgentTickets}
          loading={loadingSla}
          error={canReadSlaDashboard ? slaError : null}
        />

        <EmployeeKpiSummaryCard
          kpis={employeeSummaryKpis}
          summary={employeeKpiSummary}
          loading={loadingEmployeeKpis}
          error={employeeKpiError}
          canRead={canReadEmployeeKpis}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <EmployeeWorkloadCard
            data={employeeWorkload}
            loading={loadingEmployeeKpis}
            error={employeeKpiError}
            canRead={canReadEmployeeKpis}
          />
          <EmployeeProductivityCard
            data={employeeProductivity}
            loading={loadingEmployeeKpis}
            error={employeeKpiError}
            canRead={canReadEmployeeKpis}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <QualityLabCard />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EmployeesCard />
          <KnowledgeCard />
        </div>
      </PageContainer>
    </AppShell>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  badge,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <SectionSurface className="h-full p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cgi-gradient shadow-glow">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {badge && (
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      {children}
    </SectionSurface>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
      <div className={`text-lg font-bold ${tone ?? "text-foreground"}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function EmployeeKpiSummaryCard({
  kpis,
  summary,
  loading,
  error,
  canRead,
}: {
  kpis: Kpi[];
  summary: KpiEmployeeSummaryResponse | null;
  loading: boolean;
  error: string | null;
  canRead: boolean;
}) {
  return (
    <SectionCard
      title="KPI employés"
      icon={Users}
      badge={summary?.generatedAt ? `MAJ ${formatDateTime(summary.generatedAt)}` : undefined}
    >
      {!canRead ? (
        <ReservedState message="KPI employés réservés aux administrateurs et superviseurs." />
      ) : loading ? (
        <InfoState message="Chargement des KPI employés..." />
      ) : isEmployeeKpiUnauthorized(error) ? (
        <ReservedState message="KPI employés réservés aux administrateurs et superviseurs." />
      ) : error ? (
        <ErrorState message="Impossible de charger les KPI employés." />
      ) : !summary ? (
        <InfoState message="Aucune donnée de productivité disponible." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-2xl border border-border bg-background/70 p-4 shadow-card"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-2xl font-bold leading-tight text-foreground">{kpi.value}</div>
                <div className="mt-1 text-xs font-medium text-foreground/80">{kpi.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{kpi.hint}</div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function EmployeeWorkloadCard({
  data,
  loading,
  error,
  canRead,
}: {
  data: EmployeeWorkloadKpiResponse[];
  loading: boolean;
  error: string | null;
  canRead: boolean;
}) {
  return (
    <SectionCard title="Charge de travail par agent" icon={TrendingUp}>
      {!canRead ? (
        <ReservedState message="KPI employés réservés aux administrateurs et superviseurs." />
      ) : loading ? (
        <InfoState message="Chargement des KPI employés..." />
      ) : isEmployeeKpiUnauthorized(error) ? (
        <ReservedState message="KPI employés réservés aux administrateurs et superviseurs." />
      ) : error ? (
        <ErrorState message="Impossible de charger les KPI employés." />
      ) : data.length === 0 ? (
        <InfoState message="Aucune charge de travail disponible." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-right">Tickets actifs</th>
                <th className="px-4 py-3 text-right">À faire</th>
                <th className="px-4 py-3 text-right">En cours</th>
                <th className="px-4 py-3 text-right">En attente</th>
                <th className="px-4 py-3 text-right">En risque SLA</th>
                <th className="px-4 py-3 text-right">Dépassés</th>
                <th className="px-4 py-3 text-right">Critiques</th>
                <th className="px-4 py-3 text-right">Score charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {data.map((item) => (
                <tr key={item.assignedUserId ?? item.assignedUserLabel} className="align-middle">
                  <td className="px-4 py-3 font-medium text-foreground">{item.assignedUserLabel}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatNumber(item.totalAssignedTickets)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatNumber(item.todoTickets)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatNumber(item.inProgressTickets)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatNumber(item.waitingTickets)}</td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      item.atRiskTickets > 0 ? "text-amber-700" : "text-foreground"
                    }`}
                  >
                    {formatNumber(item.atRiskTickets)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      item.breachedTickets > 0 ? "text-[color:var(--cgi-red)]" : "text-foreground"
                    }`}
                  >
                    {formatNumber(item.breachedTickets)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">{formatNumber(item.criticalTickets)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex min-w-14 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.workloadScore >= 15
                          ? "bg-red-50 text-[color:var(--cgi-red)]"
                          : item.workloadScore >= 8
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {formatNumber(item.workloadScore)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function EmployeeProductivityCard({
  data,
  loading,
  error,
  canRead,
}: {
  data: EmployeeProductivityKpiResponse[];
  loading: boolean;
  error: string | null;
  canRead: boolean;
}) {
  return (
    <SectionCard title="Productivité par agent" icon={ShieldCheck}>
      {!canRead ? (
        <ReservedState message="KPI employés réservés aux administrateurs et superviseurs." />
      ) : loading ? (
        <InfoState message="Chargement des KPI employés..." />
      ) : isEmployeeKpiUnauthorized(error) ? (
        <ReservedState message="KPI employés réservés aux administrateurs et superviseurs." />
      ) : error ? (
        <ErrorState message="Impossible de charger les KPI employés." />
      ) : data.length === 0 ? (
        <InfoState message="Aucune donnée de productivité disponible." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-right">Tickets traités</th>
                <th className="px-4 py-3 text-right">Résolus</th>
                <th className="px-4 py-3 text-right">Fermés</th>
                <th className="px-4 py-3 text-right">Temps moyen</th>
                <th className="px-4 py-3 text-right">SLA respectés</th>
                <th className="px-4 py-3 text-right">SLA dépassés</th>
                <th className="px-4 py-3 text-right">Taux SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {data.map((item) => (
                <tr key={item.assignedUserId ?? item.assignedUserLabel} className="align-middle">
                  <td className="px-4 py-3 font-medium text-foreground">{item.assignedUserLabel}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatNumber(item.processedTickets)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatNumber(item.resolvedTickets)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatNumber(item.closedTickets)}</td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatDurationMinutes(item.averageTreatmentMinutes)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700">
                    {formatNumber(item.slaRespectedTickets)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      item.slaBreachedTickets > 0 ? "text-[color:var(--cgi-red)]" : "text-foreground"
                    }`}
                  >
                    {formatNumber(item.slaBreachedTickets)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    {formatPercent(item.slaComplianceRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function IncidentsCard({
  summary,
  loading,
  error,
  canRead,
}: {
  summary: TicketDashboardSummaryResponse | null;
  loading: boolean;
  error: string | null;
  canRead: boolean;
}) {
  const segments = [
    { label: "Ouverts", value: summary?.openTickets ?? 0, color: "var(--cgi-pink)" },
    { label: "En cours", value: summary?.inProgressTickets ?? 0, color: "var(--cgi-purple)" },
    { label: "Résolus", value: summary?.resolvedTickets ?? 0, color: "#10b981" },
    { label: "En attente", value: summary?.waitingTickets ?? 0, color: "var(--cgi-red)" },
  ];
  const total = segments.reduce((accumulator, segment) => accumulator + segment.value, 0);

  return (
    <SectionCard title="Incidents" icon={Ticket} badge="Aujourd'hui">
      {!canRead ? (
        <ReservedState message="Indicateurs incidents réservés aux administrateurs et superviseurs." />
      ) : loading ? (
        <InfoState message="Chargement des indicateurs incidents..." />
      ) : error ? (
        <ErrorState message="Impossible de charger les indicateurs incidents." />
      ) : !summary ? (
        <InfoState message="Aucune donnée incident disponible pour le moment." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <MiniStat label="Incidents ouverts" value={formatNumber(summary.openTickets)} tone="text-cgi-pink" />
            <MiniStat label="Tickets à faire" value={formatNumber(summary.todoTickets)} tone="text-sky-700" />
            <MiniStat
              label="Tickets en cours"
              value={formatNumber(summary.inProgressTickets)}
              tone="text-[color:var(--cgi-purple)]"
            />
            <MiniStat
              label="Tickets en attente"
              value={formatNumber(summary.waitingTickets)}
              tone="text-[color:var(--cgi-red)]"
            />
            <MiniStat
              label="Tickets résolus aujourd'hui"
              value={formatNumber(summary.resolvedToday)}
              tone="text-emerald-600"
            />
            <MiniStat
              label="Tickets créés aujourd'hui"
              value={formatNumber(summary.createdToday)}
              tone="text-amber-700"
            />
            <MiniStat
              label="Tickets assignés"
              value={formatNumber(summary.assignedTickets)}
              tone="text-indigo-700"
            />
            <MiniStat
              label="Temps moyen de traitement"
              value={formatDurationMinutes(summary.averageTreatmentMinutes)}
              tone="text-sky-600"
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Répartition opérationnelle</span>
              <span>{formatNumber(summary.totalTickets)} tickets</span>
            </div>
            {total === 0 ? (
              <InfoState message="Aucune donnée incident disponible pour le moment." />
            ) : (
              <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {segments.map((segment) => (
                    <div
                      key={segment.label}
                      style={{ width: `${(segment.value / total) * 100}%`, background: segment.color }}
                      title={`${segment.label}: ${segment.value}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {segments.map((segment) => (
                    <div
                      key={segment.label}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: segment.color }} />
                      {segment.label}
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Mis à jour {formatDateTime(summary.generatedAt)}
              </span>
              <Link
                to="/tickets"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Ouvrir les tickets <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

function TicketStatusDistributionCard({
  data,
  loading,
  error,
  canRead,
}: {
  data: TicketStatusDistributionResponse[];
  loading: boolean;
  error: string | null;
  canRead: boolean;
}) {
  return (
    <SectionCard title="Répartition des tickets par statut" icon={Activity}>
      {!canRead ? (
        <ReservedState message="Indicateurs incidents réservés aux administrateurs et superviseurs." />
      ) : loading ? (
        <InfoState message="Chargement des indicateurs incidents..." />
      ) : error ? (
        <ErrorState message="Impossible de charger les indicateurs incidents." />
      ) : data.length === 0 ? (
        <InfoState message="Aucune donnée incident disponible pour le moment." />
      ) : (
        <div className="space-y-2">
          {data.map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2.5"
            >
              <span className="text-sm text-foreground">{item.statusLabel}</span>
              <span className="text-sm font-semibold text-foreground">{formatNumber(item.count)}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function TicketPriorityDistributionCard({
  data,
  loading,
  error,
  canRead,
}: {
  data: TicketPriorityDistributionResponse[];
  loading: boolean;
  error: string | null;
  canRead: boolean;
}) {
  return (
    <SectionCard title="Répartition des tickets par priorité" icon={TrendingUp}>
      {!canRead ? (
        <ReservedState message="Indicateurs incidents réservés aux administrateurs et superviseurs." />
      ) : loading ? (
        <InfoState message="Chargement des indicateurs incidents..." />
      ) : error ? (
        <ErrorState message="Impossible de charger les indicateurs incidents." />
      ) : data.length === 0 ? (
        <InfoState message="Aucune donnée incident disponible pour le moment." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {data.map((item) => (
            <div
              key={item.priority}
              className="rounded-xl border border-border bg-background/60 px-3 py-3"
            >
              <div className="text-xs text-muted-foreground">{item.priorityLabel}</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{formatNumber(item.count)}</div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SLACard({
  summary,
  loading,
}: {
  summary: SlaDashboardSummaryResponse | null;
  loading: boolean;
}) {
  return (
    <SectionCard title="SLA" icon={Clock} badge="Live">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 rounded-xl bg-cgi-gradient p-4 text-white shadow-glow sm:col-span-1">
          <div className="text-2xl font-bold">{loading ? "..." : formatPercent(summary?.slaComplianceRate)}</div>
          <div className="mt-1 text-xs opacity-90">Taux de respect SLA</div>
        </div>
        <MiniStat
          label="En risque"
          value={loading ? "..." : formatNumber(summary?.atRiskTickets)}
          tone="text-amber-600"
        />
        <MiniStat
          label="Dépassés"
          value={loading ? "..." : formatNumber(summary?.breachedTickets)}
          tone="text-[color:var(--cgi-red)]"
        />
        <div className="col-span-3 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
          <span className="text-[11px] text-muted-foreground">Temps moyen de résolution</span>
          <span className="text-sm font-semibold text-foreground">
            {loading ? "..." : formatDurationMinutes(summary?.averageResolutionMinutes)}
          </span>
        </div>
        <div className="col-span-3 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
          <span className="text-[11px] text-muted-foreground">Temps moyen de prise en charge</span>
          <span className="text-sm font-semibold text-foreground">
            {loading ? "..." : formatDurationMinutes(summary?.averageResponseMinutes)}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs text-muted-foreground">
          Mis à jour {summary?.generatedAt ? formatDateTime(summary.generatedAt) : "-"}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">Tickets suivis</span>
            <span className="text-sm font-semibold text-foreground">{formatNumber(summary?.totalTrackedTickets)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">Tickets critiques dépassés</span>
            <span className="text-sm font-semibold text-[color:var(--cgi-red)]">
              {formatNumber(summary?.criticalBreachedTickets)}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <Link
            to="/sla/policies"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Ouvrir les règles SLA <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}

function UrgentSlaTicketsCard({
  tickets,
  loading,
  error,
}: {
  tickets: SlaUrgentTicketResponse[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <SectionCard title="Tickets SLA urgents" icon={AlertTriangle} badge="Priorité">
      <p className="mb-4 text-sm text-muted-foreground">Tickets en risque ou déjà dépassés</p>

      {loading ? (
        <InfoState message="Chargement des indicateurs SLA..." />
      ) : error ? (
        <ErrorState message="Impossible de charger les indicateurs SLA." />
      ) : tickets.length === 0 ? (
        <InfoState message="Aucun ticket SLA urgent pour le moment." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[120px_minmax(0,1.6fr)_140px_120px_120px_120px_130px_160px_90px] gap-0 border-b border-border bg-muted/50 px-4 py-3 text-xs font-semibold text-muted-foreground">
            <span>Référence</span>
            <span>Titre</span>
            <span>Statut ticket</span>
            <span>Priorité</span>
            <span>Criticité</span>
            <span>Statut SLA</span>
            <span>Temps restant</span>
            <span>Deadline</span>
            <span>Action</span>
          </div>
          {tickets.map((ticket) => (
            <div
              key={ticket.ticketId}
              className="grid grid-cols-[120px_minmax(0,1.6fr)_140px_120px_120px_120px_130px_160px_90px] items-center gap-0 border-b border-border bg-background px-4 py-3 text-sm last:border-b-0"
            >
              <span className="font-mono text-xs font-semibold text-foreground">{ticket.ticketReference}</span>
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{ticket.ticketTitle}</div>
              </div>
              <span className="text-muted-foreground">{ticket.statusLabel}</span>
              <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-700">
                {ticket.priorityLabel}
              </Badge>
              <Badge variant="outline" className="w-fit border-violet-200 bg-violet-50 text-violet-700">
                {ticket.criticalityLabel}
              </Badge>
              <Badge variant="outline" className={`w-fit ${getSlaBadgeClass(ticket.globalStatus)}`}>
                {ticket.globalStatusLabel}
              </Badge>
              <span className="text-muted-foreground">{formatRemainingTime(ticket.remainingMinutes)}</span>
              <span className="text-muted-foreground">{formatDateTime(ticket.resolutionDeadline)}</span>
              <Button asChild size="sm" variant="outline">
                <Link reloadDocument to="/tickets/$id" params={{ id: String(ticket.ticketId) }}>
                  Voir
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function QualityLabCard() {
  return (
    <SectionCard title="Quality Lab IA" icon={Sparkles} badge="Actif">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Trames générées" value="18" tone="text-[color:var(--cgi-purple)]" />
        <MiniStat label="Score qualité" value="91%" tone="text-emerald-600" />
        <MiniStat label="Score confiance" value="84%" tone="text-sky-600" />
        <MiniStat label="Cas similaires" value="46" tone="text-cgi-pink" />
      </div>

      <div className="mt-4 space-y-2">
        <ProgressBar label="Qualité moyenne" value={91} />
        <ProgressBar label="Confiance moyenne" value={84} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="max-w-sm text-xs text-muted-foreground">
          Génération et évaluation intelligente des trames de résolution.
        </p>
        <Link
          to="/quality-lab"
          className="inline-flex items-center gap-2 rounded-xl bg-cgi-gradient px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:opacity-95"
        >
          Ouvrir Quality Lab <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </SectionCard>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-cgi-gradient" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function EmployeesCard() {
  return (
    <SectionCard title="Employés & Planning" icon={Users} badge="Jour">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Disponibles" value="12" tone="text-emerald-600" />
        <MiniStat label="En pause" value="3" tone="text-amber-600" />
        <MiniStat label="En congé" value="2" tone="text-muted-foreground" />
      </div>
      <div className="mt-4">
        <ProgressBar label="Charge moyenne" value={76} />
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
        <span className="text-[11px] text-muted-foreground">Planning du jour</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Stable
        </span>
      </div>
    </SectionCard>
  );
}

function KnowledgeCard() {
  return (
    <SectionCard title="Base de connaissances" icon={BookOpen} badge="Sync">
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Solutions validées" value="320" tone="text-[color:var(--cgi-purple)]" />
        <MiniStat label="Articles mis à jour" value="12" tone="text-sky-600" />
        <MiniStat label="Feedbacks reçus" value="28" tone="text-cgi-pink" />
        <div className="flex flex-col justify-center rounded-xl bg-muted/60 px-3 py-2.5">
          <div className="text-[11px] text-muted-foreground">Recherche hybride</div>
          <div className="mt-0.5 text-xs font-semibold text-foreground">Prévue</div>
        </div>
      </div>
    </SectionCard>
  );
}

function QuickActionsCard() {
  const actions: {
    label: string;
    icon: LucideIcon;
    active: boolean;
    to?: "/quality-lab" | "/tickets" | "/sla/policies";
  }[] = [
    { label: "Créer un ticket", icon: Plus, active: true, to: "/tickets" },
    { label: "Ouvrir Quality Lab", icon: Sparkles, active: true, to: "/quality-lab" },
    { label: "Voir les règles SLA", icon: Activity, active: true, to: "/sla/policies" },
    { label: "Consulter planning", icon: Calendar, active: false },
  ];

  return (
    <SectionCard title="Actions rapides" icon={TrendingUp}>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          if (action.active && action.to) {
            return (
              <Link
                key={action.label}
                to={action.to}
                className="flex w-full items-center gap-3 rounded-xl bg-cgi-gradient px-3 py-2.5 text-sm font-medium text-white shadow-glow transition hover:opacity-95"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{action.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            );
          }

          return (
            <button
              key={action.label}
              disabled
              className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl bg-muted px-3 py-2.5 text-sm font-medium text-muted-foreground"
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{action.label}</span>
              <span className="text-[10px] uppercase tracking-wide">Bientôt</span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

function InfoState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-4 py-8 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-sm text-destructive">
      {message}
    </div>
  );
}

function ReservedState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-sm text-amber-900">
      {message}
    </div>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value)} %`;
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDurationMinutes(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const rounded = Math.round(value);
  if (rounded < 60) {
    return `${rounded} min`;
  }

  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatRemainingTime(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const absolute = Math.abs(Math.round(value));
  if (absolute < 60) {
    return value < 0 ? `Dépassé de ${absolute} min` : `Reste ${absolute} min`;
  }

  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const formatted = minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
  return value < 0 ? `Dépassé de ${formatted}` : `Reste ${formatted}`;
}

function getSlaBadgeClass(status: SlaStatus) {
  switch (status) {
    case "BREACHED":
      return "border-red-200 bg-red-50 text-[color:var(--cgi-red)]";
    case "AT_RISK":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function readSlaError(caught: unknown) {
  if (caught instanceof SlaApiError && (caught.status === 401 || caught.status === 403)) {
    return "Impossible de charger les indicateurs SLA.";
  }
  if (caught instanceof Error) {
    return caught.message;
  }
  return "Impossible de charger les indicateurs SLA.";
}

function readTicketError(caught: unknown) {
  if (caught instanceof TicketApiError && (caught.status === 401 || caught.status === 403)) {
    return "Indicateurs incidents réservés aux administrateurs et superviseurs.";
  }
  if (caught instanceof Error) {
    return caught.message;
  }
  return "Impossible de charger les indicateurs incidents.";
}

function readEmployeeKpiError(caught: unknown) {
  if (caught instanceof KpiApiError && (caught.status === 401 || caught.status === 403)) {
    return "KPI employés réservés aux administrateurs et superviseurs.";
  }
  if (caught instanceof Error) {
    return caught.message;
  }
  return "Impossible de charger les KPI employés.";
}

function isEmployeeKpiUnauthorized(error: string | null) {
  return error === "KPI employés réservés aux administrateurs et superviseurs.";
}

function readReportsError(caught: unknown) {
  if (caught instanceof ReportsApiError && (caught.status === 401 || caught.status === 403)) {
    return "Export réservé aux administrateurs et superviseurs.";
  }
  return "Impossible d’exporter le rapport PDF.";
}
