import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app/AppShell";
import { RoleGuard } from "@/components/app/RoleGuard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchEmployees, type Employee } from "@/lib/api/employees";
import { getEmployeeProductivity, type EmployeeProductivityKpiResponse } from "@/lib/api/kpi";
import { getTicketDashboardSummary, type TicketDashboardSummaryResponse } from "@/lib/api/tickets";
import { useAuth } from "@/lib/auth-store";
import {
  getAdminKpiMockData,
  getFilteredAdminKpiMockData,
  isAdminKpiMockEnabled,
  REAL_BANNETTES,
  type AgentPerformance,
  type BannettePerformance,
  type KpiAlert,
  type KpiEvolutionPoint,
  type KpiIndicatorKey,
  type KpiMainCard,
  type RealBannette,
} from "@/mocks/adminKpiMock";

export const Route = createFileRoute("/kpi")({
  head: () => ({
    meta: [
      { title: "Indicateurs KPI - CGI-Intranet" },
      {
        name: "description",
        content: "Vision globale de la performance des bannettes CGI-Intranet.",
      },
    ],
  }),
  component: AdminKpiPage,
});

const kpiTheme = {
  "--background": "oklch(0.97 0.005 280)",
  "--foreground": "oklch(0.19 0.03 285)",
  "--muted": "oklch(0.955 0.008 290)",
  "--muted-foreground": "oklch(0.5 0.03 285)",
  "--border": "oklch(0.92 0.01 285)",
  "--cgi-red": "#E21543",
  "--cgi-purple": "#523698",
  "--cgi-burgundy": "#721B4C",
  "--cgi-med-purple": "#6E5BB4",
  "--cgi-pink-purple": "#A94E89",
  "--cgi-lavender": "#A48CC5",
  "--cgi-gradient": "linear-gradient(135deg, #E21543 0%, #A94E89 45%, #523698 100%)",
  "--cgi-shadow-card": "0 1px 2px rgba(20, 10, 40, 0.04), 0 8px 24px -12px rgba(82, 54, 152, 0.12)",
} as CSSProperties;

const INDICATOR_OPTIONS = [
  { value: "ticketsTraites", label: "Tickets traités" },
  { value: "tauxResolution", label: "Taux de résolution" },
  { value: "qualiteService", label: "Qualité de service" },
  { value: "nps", label: "NPS" },
] as const;
type IndicatorKey = (typeof INDICATOR_OPTIONS)[number]["value"];

const PERIOD_OPTIONS = [
  { value: "6", label: "6 dernières semaines" },
  { value: "4", label: "4 dernières semaines" },
  { value: "1", label: "Semaine courante" },
] as const;

const BAR_COLORS = ["#523698", "#6E5BB4", "#A94E89", "#A48CC5", "#E21543", "#721B4C"];

const KPI_SECTION_GAP = "gap-2";
const KPI_CARD_CLASS = "rounded-2xl border border-border/60 bg-white p-2.5";
const KPI_DETAIL_CARD_CLASS = "rounded-2xl border border-border/60 bg-white p-2";
const KPI_CARD_SHADOW = { boxShadow: "var(--cgi-shadow-card)" } as const;

// The evolution chart fills its grid row instead of using a fixed height, so that
// the dashboard scales with the viewport rather than overflowing onto the row below.
const BAR_CHART_HEIGHT = 88;
const NPS_CHART_HEIGHT = 72;
const CHART_MARGIN = { top: 6, right: 10, left: 2, bottom: 2 };
const BAR_CHART_MARGIN = { top: 2, right: 4, left: 0, bottom: 0 };

const AGENTS_PER_PAGE = 3;
const ALERTS_PER_PAGE = 2;
const MANAGER_BANNETTES: RealBannette[] = ["BO", "FO"];
const MANAGER_AGENTS = [
  "Yasmine Akdim",
  "Omar El Moutaouakil",
  "Salma Raji",
  "Ibtissam Aouad",
  "Mehdi El Harrak",
  "Kawtar Bouzid",
];

interface KpiData {
  mainCards: KpiMainCard[];
  evolution: KpiEvolutionPoint[];
  bannettePerformance: BannettePerformance[];
  ticketProductivity: {
    resolus: number;
    escalades: number;
    transfertsInternes: number;
    transfertsExternes: number;
    totalTraite: number;
  } | null;
  callQuality: {
    appelsComptabilises: number;
    appelsRepondus: number;
    appelsPerdus: number;
    appelsAbandonnes: number;
    tauxDecrochePercent: number;
    tempsMoyenAttenteSeconds: number;
    tempsMoyenCommunicationSeconds: number;
    slaReponseSous30sPercent: number;
  } | null;
  npsBreakdown: {
    promoteursPercent: number;
    neutresPercent: number;
    detracteursPercent: number;
    npsGlobal: number;
  } | null;
  agentPerformance: AgentPerformance[];
  alerts: KpiAlert[];
}

const managerKpiData: KpiData = {
  mainCards: [
    {
      key: "quality",
      label: "Qualité de service du périmètre",
      value: 91,
      unit: "%",
      delta: 2,
      deltaUnit: "%",
    },
    { key: "handled", label: "Tickets traités", value: 80, unit: "count", delta: 9, deltaUnit: "count" },
    { key: "resolution", label: "Taux de résolution", value: 79, unit: "%", delta: 3, deltaUnit: "%" },
    { key: "escalation", label: "Taux d'escalade", value: 10, unit: "%", delta: -1, deltaUnit: "%" },
    { key: "transfer", label: "Taux de transfert", value: 8, unit: "%", delta: 0, deltaUnit: "%" },
    { key: "nps", label: "NPS du périmètre", value: 42, unit: "score", delta: 4, deltaUnit: "points" },
  ],
  evolution: [
    { period: "Semaine 1", qualiteService: 84, tauxResolution: 70, nps: 30 },
    { period: "Semaine 2", qualiteService: 86, tauxResolution: 72, nps: 32 },
    { period: "Semaine 3", qualiteService: 88, tauxResolution: 74, nps: 35 },
    { period: "Semaine 4", qualiteService: 89, tauxResolution: 76, nps: 38 },
    { period: "Semaine 5", qualiteService: 90, tauxResolution: 78, nps: 40 },
    { period: "Semaine 6", qualiteService: 91, tauxResolution: 79, nps: 42 },
  ],
  bannettePerformance: [
    { bannette: "BO", ticketsTraites: 42, tauxResolution: 76, qualiteService: 90, nps: 39 },
    { bannette: "FO", ticketsTraites: 38, tauxResolution: 82, qualiteService: 92, nps: 45 },
  ],
  ticketProductivity: {
    resolus: 64,
    escalades: 8,
    transfertsInternes: 5,
    transfertsExternes: 3,
    totalTraite: 80,
  },
  callQuality: {
    appelsComptabilises: 180,
    appelsRepondus: 166,
    appelsPerdus: 9,
    appelsAbandonnes: 5,
    tauxDecrochePercent: 92,
    tempsMoyenAttenteSeconds: 22,
    tempsMoyenCommunicationSeconds: 365,
    slaReponseSous30sPercent: 89,
  },
  npsBreakdown: {
    promoteursPercent: 61,
    neutresPercent: 20,
    detracteursPercent: 19,
    npsGlobal: 42,
  },
  agentPerformance: [
    { fullName: "Yasmine Akdim", bannette: "BO", ticketsTraites: 16, tauxResolution: 78, tauxEscalade: 10, qualiteService: 90, nps: 40 },
    { fullName: "Omar El Moutaouakil", bannette: "BO", ticketsTraites: 14, tauxResolution: 80, tauxEscalade: 8, qualiteService: 91, nps: 42 },
    { fullName: "Salma Raji", bannette: "BO", ticketsTraites: 12, tauxResolution: 74, tauxEscalade: 12, qualiteService: 88, nps: 36 },
    { fullName: "Ibtissam Aouad", bannette: "FO", ticketsTraites: 13, tauxResolution: 83, tauxEscalade: 7, qualiteService: 93, nps: 46 },
    { fullName: "Mehdi El Harrak", bannette: "FO", ticketsTraites: 12, tauxResolution: 82, tauxEscalade: 9, qualiteService: 92, nps: 44 },
    { fullName: "Kawtar Bouzid", bannette: "FO", ticketsTraites: 13, tauxResolution: 81, tauxEscalade: 8, qualiteService: 91, nps: 45 },
  ],
  alerts: [
    { bannette: "BO", message: "Qualité de service en légère baisse sur les tickets critiques.", tone: "purple" },
    { bannette: "FO", message: "Un ticket approche de son échéance SLA.", tone: "orange" },
  ],
};

function AdminKpiPage() {
  const { authenticatedFetch, hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const isManager = hasRole("MANAGER") && !isAdmin;
  const canView = isAdmin || isManager;
  const demoMode = isManager || isAdminKpiMockEnabled();

  const [apiData, setApiData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(!demoMode);

  const [period, setPeriod] = useState<string>("6");
  const [bannette, setBannette] = useState<string>("all");
  const [agent, setAgent] = useState<string>("all");
  const [indicator, setIndicator] = useState<IndicatorKey>("ticketsTraites");
  const [agentPage, setAgentPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);

  const mockData = useMemo(() => {
    if (!demoMode || !canView || isManager) {
      return null;
    }
    return getFilteredAdminKpiMockData({
      period,
      bannette,
      agent,
      indicator: indicator as KpiIndicatorKey,
    });
  }, [demoMode, canView, isManager, period, bannette, agent, indicator]);

  const loadKpi = useCallback(async () => {
    if (!canView || demoMode) {
      return;
    }
    setLoading(true);

    const [ticketSummary, productivity, employees] = await Promise.all([
      getTicketDashboardSummary(authenticatedFetch).catch(
        () => null as TicketDashboardSummaryResponse | null,
      ),
      getEmployeeProductivity(authenticatedFetch, 8).catch(
        () => [] as EmployeeProductivityKpiResponse[],
      ),
      fetchEmployees(authenticatedFetch).catch(() => [] as Employee[]),
    ]);

    const handled = ticketSummary
      ? ticketSummary.resolvedTickets + ticketSummary.closedTickets
      : null;
    const resolutionRate =
      ticketSummary && ticketSummary.totalTickets > 0
        ? Math.round((ticketSummary.resolvedTickets / ticketSummary.totalTickets) * 100)
        : null;

    const employeeByName = new Map(employees.map((employee) => [employee.fullName, employee]));

    setApiData({
      mainCards: [
        {
          key: "quality",
          label: "Qualité de service globale",
          value: NaN,
          unit: "%",
          delta: 0,
          deltaUnit: "%",
        },
        {
          key: "handled",
          label: "Tickets traités",
          value: handled ?? NaN,
          unit: "count",
          delta: 0,
          deltaUnit: "count",
        },
        {
          key: "resolution",
          label: "Taux de résolution",
          value: resolutionRate ?? NaN,
          unit: "%",
          delta: 0,
          deltaUnit: "%",
        },
        {
          key: "escalation",
          label: "Taux d'escalade",
          value: NaN,
          unit: "%",
          delta: 0,
          deltaUnit: "%",
        },
        {
          key: "transfer",
          label: "Taux de transfert",
          value: NaN,
          unit: "%",
          delta: 0,
          deltaUnit: "%",
        },
        {
          key: "nps",
          label: "NPS global",
          value: NaN,
          unit: "score",
          delta: 0,
          deltaUnit: "points",
        },
      ],
      evolution: [],
      bannettePerformance: [],
      ticketProductivity: ticketSummary
        ? {
            resolus: ticketSummary.resolvedTickets,
            escalades: 0,
            transfertsInternes: 0,
            transfertsExternes: 0,
            totalTraite: ticketSummary.totalTickets,
          }
        : null,
      callQuality: null,
      npsBreakdown: null,
      agentPerformance: productivity.map((entry) => ({
        fullName: entry.assignedUserLabel,
        bannette:
          (employeeByName.get(entry.assignedUserLabel)?.bannette as RealBannette) ??
          ("FO" as RealBannette),
        ticketsTraites: entry.processedTickets,
        tauxResolution:
          entry.slaComplianceRate !== null ? Math.round(entry.slaComplianceRate) : NaN,
        tauxEscalade: NaN,
        qualiteService: NaN,
        nps: NaN,
      })),
      alerts: [],
    });
    setLoading(false);
  }, [authenticatedFetch, canView, demoMode]);

  useEffect(() => {
    void loadKpi();
  }, [loadKpi]);

  useEffect(() => {
    setAgentPage(1);
    setAlertPage(1);
  }, [period, bannette, agent, indicator]);

  const managerData = useMemo(
    () =>
      getFilteredManagerKpiData({
        period,
        bannette,
        agent,
        indicator: indicator as KpiIndicatorKey,
      }),
    [period, bannette, agent, indicator],
  );
  const data = isManager ? managerData : demoMode ? mockData : apiData;
  const isLoading = demoMode ? false : loading;

  const evolutionSlice = useMemo(() => {
    if (!data) return [];
    if (demoMode) {
      return data.evolution;
    }
    const count = Number(period);
    return data.evolution.slice(Math.max(0, data.evolution.length - count));
  }, [data, demoMode, period]);

  const bannetteRows = useMemo(() => {
    if (!data) return [];
    if (demoMode) {
      return data.bannettePerformance;
    }
    return bannette === "all"
      ? data.bannettePerformance
      : data.bannettePerformance.filter((row) => row.bannette === bannette);
  }, [data, bannette, demoMode]);

  const agentRows = useMemo(() => {
    if (!data) return [];
    if (demoMode) {
      return data.agentPerformance;
    }
    return data.agentPerformance.filter(
      (row) =>
        (bannette === "all" || row.bannette === bannette) &&
        (agent === "all" || row.fullName === agent),
    );
  }, [data, bannette, agent, demoMode]);

  const alertRows = useMemo(() => data?.alerts ?? [], [data]);

  const agentTotalPages = Math.max(1, Math.ceil(agentRows.length / AGENTS_PER_PAGE));
  const alertTotalPages = Math.max(1, Math.ceil(alertRows.length / ALERTS_PER_PAGE));

  const paginatedAgents = useMemo(() => {
    const start = (agentPage - 1) * AGENTS_PER_PAGE;
    return agentRows.slice(start, start + AGENTS_PER_PAGE);
  }, [agentRows, agentPage]);

  const paginatedAlerts = useMemo(() => {
    const start = (alertPage - 1) * ALERTS_PER_PAGE;
    return alertRows.slice(start, start + ALERTS_PER_PAGE);
  }, [alertRows, alertPage]);

  useEffect(() => {
    if (agentPage > agentTotalPages) {
      setAgentPage(agentTotalPages);
    }
  }, [agentPage, agentTotalPages]);

  useEffect(() => {
    if (alertPage > alertTotalPages) {
      setAlertPage(alertTotalPages);
    }
  }, [alertPage, alertTotalPages]);

  const indicatorLabel =
    INDICATOR_OPTIONS.find((option) => option.value === indicator)?.label ?? "";

  const allAgentOptions = useMemo(() => {
    if (isManager) {
      const filtered =
        bannette === "all"
          ? managerKpiData.agentPerformance
          : managerKpiData.agentPerformance.filter((row) => row.bannette === bannette);
      return filtered.map((row) => row.fullName);
    }
    if (demoMode) {
      const agents = getAdminKpiMockData().agentPerformance;
      const filtered =
        bannette === "all" ? agents : agents.filter((row) => row.bannette === bannette);
      return filtered.map((row) => row.fullName);
    }

    const source = apiData?.agentPerformance ?? [];
    const filtered =
      bannette === "all" ? source : source.filter((row) => row.bannette === bannette);
    return [...new Set(filtered.map((row) => row.fullName))];
  }, [apiData?.agentPerformance, bannette, demoMode, isManager]);

  return (
    <AppShell compactTopbar>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER"]}
        message="Les indicateurs KPI sont reserves aux Pilotes et aux Superviseurs."
      >
        <div
          className={`mx-auto flex h-full w-full max-w-[1500px] min-h-0 flex-col ${KPI_SECTION_GAP}`}
          style={kpiTheme}
        >
          <PageTitle isManager={isManager} />
          <FiltersBar
            period={period}
            onPeriodChange={setPeriod}
            bannette={bannette}
            onBannetteChange={setBannette}
            allowedBannettes={isManager ? MANAGER_BANNETTES : REAL_BANNETTES}
            allBannettesLabel={isManager ? "BO et FO" : "Toutes les bannettes"}
            agent={agent}
            onAgentChange={setAgent}
            agentOptions={allAgentOptions}
            indicator={indicator}
            onIndicatorChange={setIndicator}
          />

          <div
            className={`grid min-h-[34rem] flex-1 grid-rows-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] ${KPI_SECTION_GAP}`}
          >
            <MainCardsRow loading={isLoading} cards={data?.mainCards ?? []} demoMode={demoMode} />

            <div className={`grid min-h-0 grid-cols-1 ${KPI_SECTION_GAP} xl:grid-cols-12`}>
              <EvolutionChartCard data={evolutionSlice} loading={isLoading} demoMode={demoMode} />
              <BannetteChartCard
                rows={bannetteRows}
                indicator={indicator}
                indicatorLabel={indicatorLabel}
                loading={isLoading}
                demoMode={demoMode}
              />
            </div>

            <div className={`grid min-h-0 grid-cols-1 ${KPI_SECTION_GAP} xl:grid-cols-12`}>
              <TicketProductivityCard
                productivity={data?.ticketProductivity ?? null}
                loading={isLoading}
                demoMode={demoMode}
              />
              <CallQualityCard
                callQuality={data?.callQuality ?? null}
                loading={isLoading}
                demoMode={demoMode}
              />
              <NpsAnalysisCard
                npsBreakdown={data?.npsBreakdown ?? null}
                loading={isLoading}
                demoMode={demoMode}
              />
            </div>

            <div className={`grid min-h-0 grid-cols-1 ${KPI_SECTION_GAP} xl:grid-cols-12`}>
              <AgentPerformanceTable
                rows={paginatedAgents}
                loading={isLoading}
                demoMode={demoMode}
                page={agentPage}
                totalPages={agentTotalPages}
                onPageChange={setAgentPage}
              />
              <AlertsCard
                alerts={paginatedAlerts}
                loading={isLoading}
                demoMode={demoMode}
                page={alertPage}
                totalPages={alertTotalPages}
                onPageChange={setAlertPage}
              />
            </div>
          </div>
        </div>
      </RoleGuard>
    </AppShell>
  );
}

function getFilteredManagerKpiData(filters: {
  period: string;
  bannette: string;
  agent: string;
  indicator: KpiIndicatorKey;
}): KpiData {
  const periodCount = Number(filters.period);
  let bannettePerformance = managerKpiData.bannettePerformance;
  let agentPerformance = managerKpiData.agentPerformance;
  let alerts = managerKpiData.alerts;
  let mainCards = managerKpiData.mainCards;
  let ticketProductivity = managerKpiData.ticketProductivity;
  let npsBreakdown = managerKpiData.npsBreakdown;

  if (filters.bannette !== "all") {
    bannettePerformance = bannettePerformance.filter((row) => row.bannette === filters.bannette);
    agentPerformance = agentPerformance.filter((row) => row.bannette === filters.bannette);
    alerts = alerts.filter((row) => row.bannette === filters.bannette);
    const performance = bannettePerformance[0];
    if (performance && ticketProductivity) {
      mainCards = [
        { key: "quality", label: "Qualité de service du périmètre", value: performance.qualiteService, unit: "%", delta: 2, deltaUnit: "%" },
        { key: "handled", label: "Tickets traités", value: performance.ticketsTraites, unit: "count", delta: 4, deltaUnit: "count" },
        { key: "resolution", label: "Taux de résolution", value: performance.tauxResolution, unit: "%", delta: 2, deltaUnit: "%" },
        { key: "escalation", label: "Taux d'escalade", value: averageKpi(agentPerformance.map((row) => row.tauxEscalade)), unit: "%", delta: -1, deltaUnit: "%" },
        { key: "transfer", label: "Taux de transfert", value: filters.bannette === "BO" ? 9 : 7, unit: "%", delta: 0, deltaUnit: "%" },
        { key: "nps", label: "NPS du périmètre", value: performance.nps, unit: "score", delta: 3, deltaUnit: "points" },
      ];
      ticketProductivity = {
        resolus: Math.round(ticketProductivity.resolus * (performance.ticketsTraites / 80)),
        escalades: Math.round(ticketProductivity.escalades * (performance.ticketsTraites / 80)),
        transfertsInternes: Math.round(ticketProductivity.transfertsInternes * (performance.ticketsTraites / 80)),
        transfertsExternes: Math.round(ticketProductivity.transfertsExternes * (performance.ticketsTraites / 80)),
        totalTraite: performance.ticketsTraites,
      };
    }
  }

  if (filters.agent !== "all") {
    const selectedAgent = managerKpiData.agentPerformance.find(
      (row) => row.fullName === filters.agent,
    );
    agentPerformance = agentPerformance.filter((row) => row.fullName === filters.agent);
    if (selectedAgent) {
      mainCards = [
        { key: "quality", label: "Qualité de service du périmètre", value: selectedAgent.qualiteService, unit: "%", delta: 1, deltaUnit: "%" },
        { key: "handled", label: "Tickets traités", value: selectedAgent.ticketsTraites, unit: "count", delta: 2, deltaUnit: "count" },
        { key: "resolution", label: "Taux de résolution", value: selectedAgent.tauxResolution, unit: "%", delta: 2, deltaUnit: "%" },
        { key: "escalation", label: "Taux d'escalade", value: selectedAgent.tauxEscalade, unit: "%", delta: -1, deltaUnit: "%" },
        { key: "transfer", label: "Taux de transfert", value: 6, unit: "%", delta: 0, deltaUnit: "%" },
        { key: "nps", label: "NPS du périmètre", value: selectedAgent.nps, unit: "score", delta: 2, deltaUnit: "points" },
      ];
      npsBreakdown = {
        promoteursPercent: Math.min(80, selectedAgent.nps + 20),
        neutresPercent: 20,
        detracteursPercent: Math.max(5, 80 - selectedAgent.nps),
        npsGlobal: selectedAgent.nps,
      };
    }
  }

  return {
    ...managerKpiData,
    mainCards,
    evolution: managerKpiData.evolution.slice(Math.max(0, managerKpiData.evolution.length - periodCount)),
    bannettePerformance,
    ticketProductivity,
    npsBreakdown,
    agentPerformance,
    alerts,
  };
}

function averageKpi(values: number[]) {
  return values.length === 0
    ? 0
    : Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function PageTitle({ isManager }: { isManager: boolean }) {
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight md:text-lg">Indicateurs KPI</h1>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground md:text-[11px]">
          {isManager
            ? "Performance et suivi opérationnel des bannettes supervisées."
            : "Performance, tendances et comparaisons de toutes les bannettes CGI-Intranet."}
        </p>
      </div>
    </div>
  );
}

function FiltersBar({
  period,
  onPeriodChange,
  bannette,
  onBannetteChange,
  allowedBannettes,
  allBannettesLabel,
  agent,
  onAgentChange,
  agentOptions,
  indicator,
  onIndicatorChange,
}: {
  period: string;
  onPeriodChange: (value: string) => void;
  bannette: string;
  onBannetteChange: (value: string) => void;
  allowedBannettes: readonly RealBannette[];
  allBannettesLabel: string;
  agent: string;
  onAgentChange: (value: string) => void;
  agentOptions: string[];
  indicator: IndicatorKey;
  onIndicatorChange: (value: IndicatorKey) => void;
}) {
  return (
    <div
      className="grid shrink-0 grid-cols-1 gap-x-4 gap-y-2 rounded-2xl border border-border/60 bg-white p-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-nowrap xl:items-end xl:gap-4"
      style={KPI_CARD_SHADOW}
    >
      <FilterField label="Période">
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-8 w-full min-w-0 rounded-full bg-white px-3 text-[11px] shadow-sm xl:min-w-[148px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Bannette">
        <Select value={bannette} onValueChange={onBannetteChange}>
          <SelectTrigger className="h-8 w-full min-w-0 rounded-full bg-white px-3 text-[11px] shadow-sm xl:min-w-[136px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{allBannettesLabel}</SelectItem>
            {allowedBannettes.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Agent">
        <Select value={agent} onValueChange={onAgentChange}>
          <SelectTrigger className="h-8 w-full min-w-0 rounded-full bg-white px-3 text-[11px] shadow-sm xl:min-w-[136px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les Agents</SelectItem>
            {agentOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Indicateur">
        <Select
          value={indicator}
          onValueChange={(value) => onIndicatorChange(value as IndicatorKey)}
        >
          <SelectTrigger className="h-8 w-full min-w-0 rounded-full bg-white px-3 text-[11px] shadow-sm xl:min-w-[152px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INDICATOR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 xl:min-w-[140px]">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function MainCardsRow({
  loading,
  cards,
  demoMode,
}: {
  loading: boolean;
  cards: KpiMainCard[];
  demoMode: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => (
        <MainKpiCard
          key={card.key}
          loading={loading}
          card={card}
          highlight={index === 0}
          demoMode={demoMode}
        />
      ))}
    </div>
  );
}

function MainKpiCard({
  loading,
  card,
  highlight,
  demoMode,
}: {
  loading: boolean;
  card: KpiMainCard;
  highlight?: boolean;
  demoMode: boolean;
}) {
  const positive = card.delta > 0;
  const neutral = card.delta === 0;
  const deltaText =
    card.deltaUnit === "count"
      ? `${positive ? "+" : ""}${formatNumber(card.delta)}`
      : `${positive ? "+" : ""}${formatNumber(card.delta)} ${card.deltaUnit === "%" ? "%" : "pts"}`;

  return (
    <div
      className={
        "relative flex h-full min-h-[4.75rem] flex-col justify-between overflow-hidden rounded-2xl border p-2.5 " +
        (highlight ? "border-transparent text-white" : "border-border/60 bg-white")
      }
      style={{
        background: highlight ? "var(--cgi-gradient)" : undefined,
        boxShadow: highlight ? "0 10px 24px -14px rgba(226,21,67,0.45)" : "var(--cgi-shadow-card)",
      }}
    >
      <div className="text-[10px] font-medium leading-snug opacity-90">{card.label}</div>
      <div className="mt-1 text-lg font-bold tracking-tight md:text-xl">
        {loading ? "..." : formatCardValue(card, demoMode)}
      </div>
      <div
        className={
          "mt-1.5 inline-flex w-fit max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold " +
          (highlight ? "bg-white/15" : "")
        }
        style={
          !highlight
            ? {
                background: neutral
                  ? "rgba(82,54,152,0.08)"
                  : positive
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(226,21,67,0.1)",
                color: neutral ? "var(--cgi-purple)" : positive ? "#16a34a" : "var(--cgi-red)",
              }
            : undefined
        }
      >
        {loading || (!demoMode && Number.isNaN(card.value))
          ? "vs période précédente"
          : `${deltaText} vs période précédente`}
      </div>
    </div>
  );
}

function EvolutionChartCard({
  data,
  loading,
  demoMode,
}: {
  data: KpiEvolutionPoint[];
  loading: boolean;
  demoMode: boolean;
}) {
  const showEmpty = !loading && data.length === 0 && !demoMode;

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden ${KPI_CARD_CLASS} xl:col-span-8`}
      style={KPI_CARD_SHADOW}
    >
      <div className="shrink-0 text-[12px] font-semibold">Évolution des performances</div>
      <div className="mt-1.5 flex min-h-0 w-full flex-1 flex-col">
        {loading ? (
          <ChartEmptyState label="Chargement..." />
        ) : showEmpty ? (
          <ChartEmptyState label="Historique non disponible via l'API." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#8a83a3" }}
                dy={4}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#8a83a3" }}
                width={32}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
              <Line
                type="monotone"
                dataKey="qualiteService"
                name="Qualité de service"
                stroke="#523698"
                strokeWidth={2}
                dot={{ r: 2.5 }}
              />
              <Line
                type="monotone"
                dataKey="tauxResolution"
                name="Taux de résolution"
                stroke="#E21543"
                strokeWidth={2}
                dot={{ r: 2.5 }}
              />
              <Line
                type="monotone"
                dataKey="nps"
                name="NPS"
                stroke="#6E5BB4"
                strokeWidth={2}
                dot={{ r: 2.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function BannetteChartCard({
  rows,
  indicator,
  indicatorLabel,
  loading,
  demoMode,
}: {
  rows: BannettePerformance[];
  indicator: IndicatorKey;
  indicatorLabel: string;
  loading: boolean;
  demoMode: boolean;
}) {
  const showEmpty = !loading && rows.length === 0 && !demoMode;

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden ${KPI_DETAIL_CARD_CLASS} xl:col-span-4`}
      style={KPI_CARD_SHADOW}
    >
      <div className="shrink-0 text-[11px] font-semibold leading-tight">Performance par bannette</div>
      <div className="shrink-0 text-[8px] leading-tight text-muted-foreground">
        Indicateur affiché : {indicatorLabel}
      </div>
      <div
        className="mt-0.5 w-full shrink-0"
        style={{ height: BAR_CHART_HEIGHT }}
      >
        {loading ? (
          <ChartEmptyState label="Chargement..." height={BAR_CHART_HEIGHT} />
        ) : showEmpty ? (
          <ChartEmptyState
            label="Comparaison par bannette non disponible via l'API."
            height={BAR_CHART_HEIGHT}
          />
        ) : (
          <ResponsiveContainer width="100%" height={BAR_CHART_HEIGHT}>
            <BarChart data={rows} margin={BAR_CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis
                dataKey="bannette"
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={{ fontSize: 8, fill: "#8a83a3" }}
                dy={2}
                height={28}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 8, fill: "#8a83a3" }}
                width={24}
                tickCount={4}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 11 }}
              />
              <Bar dataKey={indicator} name={indicatorLabel} radius={[4, 4, 0, 0]} maxBarSize={28}>
                {rows.map((row, index) => (
                  <Cell key={row.bannette} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function TicketProductivityCard({
  productivity,
  loading,
  demoMode,
}: {
  productivity: KpiData["ticketProductivity"];
  loading: boolean;
  demoMode: boolean;
}) {
  const tiles = [
    { label: "Résolus", value: productivity?.resolus },
    { label: "Escaladés", value: productivity?.escalades },
    { label: "Transferts internes", value: productivity?.transfertsInternes },
    { label: "Transferts externes", value: productivity?.transfertsExternes },
  ];

  if (!loading && !productivity && !demoMode) {
    return null;
  }

  return (
    <div
      className={`flex min-h-0 flex-col ${KPI_DETAIL_CARD_CLASS} xl:col-span-3`}
      style={KPI_CARD_SHADOW}
    >
      <div className="shrink-0 text-[11px] font-semibold leading-tight">Productivité des tickets</div>
      <div className="mt-1 grid grid-cols-2 gap-1">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg bg-muted px-2 py-1">
            <div className="truncate text-[8px] font-medium leading-tight text-muted-foreground">
              {tile.label}
            </div>
            <div className="text-[12px] font-semibold tabular-nums leading-tight text-foreground">
              {loading ? "..." : formatCount(tile.value)}
            </div>
          </div>
        ))}
      </div>
      <div
        className="mt-1 shrink-0 rounded-lg px-2 py-1 text-white"
        style={{ background: "var(--cgi-gradient)" }}
      >
        <div className="text-[8px] font-medium leading-tight opacity-90">Total traité</div>
        <div className="text-sm font-bold leading-tight tabular-nums">
          {loading ? "..." : formatCount(productivity?.totalTraite)}
        </div>
      </div>
    </div>
  );
}

function CallQualityCard({
  callQuality,
  loading,
  demoMode,
}: {
  callQuality: KpiData["callQuality"];
  loading: boolean;
  demoMode: boolean;
}) {
  const rows = [
    { label: "Appels comptabilisés", value: formatCount(callQuality?.appelsComptabilises) },
    { label: "Appels répondus", value: formatCount(callQuality?.appelsRepondus) },
    { label: "Appels perdus", value: formatCount(callQuality?.appelsPerdus) },
    { label: "Appels abandonnés", value: formatCount(callQuality?.appelsAbandonnes) },
    { label: "Taux de décroché", value: formatPercentValue(callQuality?.tauxDecrochePercent) },
    { label: "SLA < 30 s", value: formatPercentValue(callQuality?.slaReponseSous30sPercent) },
    { label: "Attente moyenne", value: formatSeconds(callQuality?.tempsMoyenAttenteSeconds) },
    {
      label: "Communication moyenne",
      value: formatSeconds(callQuality?.tempsMoyenCommunicationSeconds),
    },
  ];

  const showEmpty = !loading && !callQuality && !demoMode;

  return (
    <div
      className={`flex min-h-0 flex-col ${KPI_DETAIL_CARD_CLASS} xl:col-span-5`}
      style={KPI_CARD_SHADOW}
    >
      <div className="shrink-0 text-[11px] font-semibold leading-tight">Qualité de service</div>
      {showEmpty ? (
        <ChartEmptyState label="Statistiques d'appels non disponibles via l'API." />
      ) : (
        <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-4">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <div className="truncate text-[8px] leading-tight text-muted-foreground">
                {row.label}
              </div>
              <div className="truncate text-[10px] font-semibold tabular-nums leading-tight text-foreground">
                {loading ? "..." : row.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NpsAnalysisCard({
  npsBreakdown,
  loading,
  demoMode,
}: {
  npsBreakdown: KpiData["npsBreakdown"];
  loading: boolean;
  demoMode: boolean;
}) {
  const pieData = npsBreakdown
    ? [
        { name: "Promoteurs", value: npsBreakdown.promoteursPercent, color: "#16a34a" },
        { name: "Neutres", value: npsBreakdown.neutresPercent, color: "var(--cgi-lavender)" },
        { name: "Détracteurs", value: npsBreakdown.detracteursPercent, color: "var(--cgi-red)" },
      ]
    : [];

  const showEmpty = !loading && pieData.length === 0 && !demoMode;

  return (
    <div
      className={`flex min-h-0 flex-col ${KPI_DETAIL_CARD_CLASS} xl:col-span-4`}
      style={KPI_CARD_SHADOW}
    >
      <div className="flex shrink-0 items-center justify-between gap-1.5">
        <div className="text-[11px] font-semibold leading-tight">Analyse NPS</div>
        <div className="text-[11px] font-bold tabular-nums leading-tight" style={{ color: "var(--cgi-purple)" }}>
          {loading
            ? "..."
            : npsBreakdown
              ? `NPS ${formatSignedNumber(npsBreakdown.npsGlobal)}`
              : "—"}
        </div>
      </div>
      <div className="mt-2 w-full shrink-0" style={{ height: NPS_CHART_HEIGHT }}>
        {loading ? (
          <ChartEmptyState label="Chargement..." height={NPS_CHART_HEIGHT} />
        ) : showEmpty ? (
          <ChartEmptyState
            label="Répartition NPS non disponible via l'API."
            height={NPS_CHART_HEIGHT}
          />
        ) : (
          <ResponsiveContainer width="100%" height={NPS_CHART_HEIGHT}>
            <PieChart margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                innerRadius={22}
                outerRadius={34}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 11 }}
                formatter={(value: number) => [`${value} %`, ""]}
              />
              <Legend
                wrapperStyle={{ fontSize: 8, lineHeight: "12px" }}
                iconSize={8}
                verticalAlign="bottom"
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function AgentPerformanceTable({
  rows,
  loading,
  demoMode,
  page,
  totalPages,
  onPageChange,
}: {
  rows: AgentPerformance[];
  loading: boolean;
  demoMode: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const showEmpty = !loading && rows.length === 0 && !demoMode;

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${KPI_CARD_CLASS} xl:col-span-8`}
      style={KPI_CARD_SHADOW}
    >
      <div className="shrink-0 text-[12px] font-semibold">Performance des Agents</div>
      <div className="mt-1.5 min-h-0 flex-1 overflow-x-auto">
        <table className="w-full min-w-[520px] table-fixed border-collapse text-left text-[11px]">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border/60 text-[9px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-1.5 pr-3 font-medium">Agent</th>
              <th className="pb-1.5 pr-2 font-medium">Bannette</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Traités</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Résolution</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Escalade</th>
              <th className="pb-1.5 pr-2 text-right font-medium">Qualité</th>
              <th className="pb-1.5 pr-2 text-right font-medium">NPS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-3 text-center text-muted-foreground">
                  Chargement...
                </td>
              </tr>
            ) : showEmpty ? (
              <tr>
                <td colSpan={7} className="py-3 text-center text-muted-foreground">
                  Aucun agent disponible.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.fullName} className="border-t border-border/50">
                  <td className="py-1.5 pr-3 font-semibold leading-snug text-foreground">
                    {row.fullName}
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{row.bannette}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {formatCount(row.ticketsTraites)}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {formatPercentValue(row.tauxResolution)}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {formatPercentValue(row.tauxEscalade)}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {formatPercentValue(row.qualiteService)}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">
                    {formatCount(row.nps)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <CompactPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

const alertToneStyles: Record<KpiAlert["tone"], { bg: string; fg: string }> = {
  red: { bg: "rgba(226,21,67,0.1)", fg: "var(--cgi-red)" },
  orange: { bg: "rgba(234,150,32,0.15)", fg: "#c2740c" },
  purple: { bg: "rgba(82,54,152,0.1)", fg: "var(--cgi-purple)" },
};

function AlertsCard({
  alerts,
  loading,
  demoMode,
  page,
  totalPages,
  onPageChange,
}: {
  alerts: KpiAlert[];
  loading: boolean;
  demoMode: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const showEmpty = !loading && alerts.length === 0 && !demoMode;

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${KPI_CARD_CLASS} xl:col-span-4`}
      style={KPI_CARD_SHADOW}
    >
      <div className="shrink-0 text-[12px] font-semibold">Alertes de performance</div>
      <div className="mt-1.5 min-h-0 flex-1 space-y-1.5">
        {loading ? (
          <div className="rounded-xl bg-muted px-2.5 py-2 text-[10px] text-muted-foreground">
            Chargement...
          </div>
        ) : showEmpty ? (
          <div className="rounded-xl bg-muted px-2.5 py-2 text-[10px] text-muted-foreground">
            Aucune alerte disponible via l'API.
          </div>
        ) : (
          alerts.map((alert) => {
            const style = alertToneStyles[alert.tone];
            return (
              <div
                key={`${alert.bannette}-${alert.message}`}
                className="flex items-start gap-2 rounded-xl px-2.5 py-2"
                style={{ background: style.bg }}
              >
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: style.fg }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold leading-tight" style={{ color: style.fg }}>
                    {alert.bannette}
                  </div>
                  <div className="mt-0.5 text-[10px] leading-snug text-foreground/80">
                    {alert.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <CompactPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

function CompactPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-2 flex shrink-0 items-center justify-end gap-1.5">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex h-7 items-center gap-0.5 rounded-md border border-border/60 px-2 text-[10px] text-muted-foreground transition-colors enabled:hover:bg-muted disabled:opacity-40"
        aria-label="Page précédente"
      >
        <ChevronLeft className="h-3 w-3" />
        Préc.
      </button>
      <span className="min-w-[2.75rem] text-center text-[10px] tabular-nums text-muted-foreground">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex h-7 items-center gap-0.5 rounded-md border border-border/60 px-2 text-[10px] text-muted-foreground transition-colors enabled:hover:bg-muted disabled:opacity-40"
        aria-label="Page suivante"
      >
        Suiv.
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function ChartEmptyState({ label, height }: { label: string; height?: number }) {
  return (
    <div
      className={`grid w-full min-h-0 place-items-center rounded-xl bg-muted/50 text-center text-[10px] text-muted-foreground ${
        height === undefined ? "h-full flex-1" : ""
      }`}
      style={height === undefined ? undefined : { height }}
    >
      <span className="flex items-center gap-1 px-2">
        <BarChart3 className="h-3 w-3" /> {label}
      </span>
    </div>
  );
}

function formatCardValue(card: KpiMainCard, demoMode: boolean) {
  if (!demoMode && Number.isNaN(card.value)) {
    return "Non disponible";
  }
  if (card.unit === "%") {
    return `${formatNumber(card.value)} %`;
  }
  return formatNumber(card.value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatSignedNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatCount(value: number | null | undefined) {
  return formatNumber(value);
}

function formatPercentValue(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${formatNumber(value)} %`;
}

function formatSeconds(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  if (minutes === 0) {
    return `${seconds} s`;
  }
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}
