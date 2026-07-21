import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  ClipboardList,
  Download,
  FileBarChart,
  Gauge,
  LifeBuoy,
  LogOut,
  Mail,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  Timer,
  TrendingUp,
  UserCog,
  UserRound,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { AuthenticatedView } from "@/components/app/AuthenticatedView";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, SectionSurface } from "@/components/ui/page";
import {
  getEmployeeKpiSummary,
  getEmployeeProductivity,
  getEmployeeWorkload,
  KpiApiError,
  type EmployeeProductivityKpiResponse,
  type EmployeeWorkloadKpiResponse,
  type KpiEmployeeSummaryResponse,
} from "@/lib/api/kpi";
import { downloadKpiSlaPdfReport, downloadSlaPdfReport, ReportsApiError } from "@/lib/api/reports";
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
import { getBusinessRoleLabel, useAuth, type Role } from "@/lib/auth-store";

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
  const { authenticatedFetch, hasRole, logout, fullName, email, roles } = useAuth();
  const canReadSlaDashboard = hasRole("ADMIN") || hasRole("MANAGER");
  const canReadTicketDashboard = hasRole("ADMIN") || hasRole("MANAGER");
  const canReadEmployeeKpis = hasRole("ADMIN") || hasRole("MANAGER");

  const [slaSummary, setSlaSummary] = useState<SlaDashboardSummaryResponse | null>(null);
  const [urgentTickets, setUrgentTickets] = useState<SlaUrgentTicketResponse[]>([]);
  const [loadingSla, setLoadingSla] = useState(canReadSlaDashboard);
  const [slaError, setSlaError] = useState<string | null>(null);

  const [ticketSummary, setTicketSummary] = useState<TicketDashboardSummaryResponse | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<TicketStatusDistributionResponse[]>(
    [],
  );
  const [priorityDistribution, setPriorityDistribution] = useState<
    TicketPriorityDistributionResponse[]
  >([]);
  const [loadingTickets, setLoadingTickets] = useState(canReadTicketDashboard);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [employeeKpiSummary, setEmployeeKpiSummary] = useState<KpiEmployeeSummaryResponse | null>(
    null,
  );
  const [employeeWorkload, setEmployeeWorkload] = useState<EmployeeWorkloadKpiResponse[]>([]);
  const [employeeProductivity, setEmployeeProductivity] = useState<
    EmployeeProductivityKpiResponse[]
  >([]);
  const [loadingEmployeeKpis, setLoadingEmployeeKpis] = useState(canReadEmployeeKpis);
  const [employeeKpiError, setEmployeeKpiError] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState<"kpi-sla" | "sla" | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [availability, setAvailability] = useState<"available" | "busy" | "away">("available");

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
      hint: slaSummary
        ? `${formatNumber(slaSummary.respectedTickets)} tickets respectés`
        : "Suivi global SLA",
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

  const statusSegments = [
    {
      label: "À faire",
      value: ticketSummary?.todoTickets ?? 0,
      color: "bg-[oklch(0.7_0.2_22)]",
    },
    {
      label: "En cours",
      value: ticketSummary?.inProgressTickets ?? 0,
      color: "bg-[oklch(0.65_0.22_350)]",
    },
    {
      label: "En attente",
      value: ticketSummary?.waitingTickets ?? 0,
      color: "bg-[oklch(0.6_0.22_300)]",
    },
    {
      label: "Assignés",
      value: ticketSummary?.assignedTickets ?? 0,
      color: "bg-[oklch(0.55_0.2_285)]",
    },
  ];
  const statusTotal = statusSegments.reduce((total, segment) => total + segment.value, 0);
  const moduleCards: {
    icon: LucideIcon;
    title: string;
    desc: string;
    value: string;
    sub: string;
    to: "/tickets" | "/sla/policies" | "/planning" | "/quality-lab" | "/employees" | "/messages";
    visible?: boolean;
  }[] = [
    {
      icon: LifeBuoy,
      title: "Tickets",
      desc: "Suivi et traitement des incidents actifs.",
      value: loadingTickets ? "..." : formatNumber(ticketSummary?.openTickets),
      sub: "ouverts",
      to: "/tickets",
    },
    {
      icon: Gauge,
      title: "SLA",
      desc: "Conformité et échéances contractuelles.",
      value: loadingSla ? "..." : formatNumber(slaSummary?.atRiskTickets),
      sub: "en risque",
      to: "/sla/policies",
      visible: canReadSlaDashboard,
    },
    {
      icon: Calendar,
      title: "Planning",
      desc: "Prochaines interventions programmées.",
      value: "-",
      sub: "cette semaine",
      to: "/planning",
      visible: canReadSlaDashboard,
    },
    {
      icon: Sparkles,
      title: "Quality Lab IA",
      desc: "Suggestions et cas similaires.",
      value: "-",
      sub: "recommandations",
      to: "/quality-lab",
    },
    {
      icon: Users,
      title: "Employés",
      desc: "État des équipiers en poste.",
      value: loadingEmployeeKpis ? "..." : formatNumber(employeeKpiSummary?.totalAgentsWithTickets),
      sub: "actifs",
      to: "/employees",
      visible: canReadEmployeeKpis,
    },
    {
      icon: Bell,
      title: "Notifications",
      desc: "Alertes et messages récents.",
      value: "-",
      sub: "non lues",
      to: "/messages",
    },
  ];

  const availabilityMap = {
    available: { label: "Disponible", dot: "bg-emerald-500" },
    busy: { label: "Occupé", dot: "bg-amber-500" },
    away: { label: "Indisponible", dot: "bg-rose-500" },
  };
  const currentRole = (roles.find((role): role is Role =>
    ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role),
  ) ?? "EMPLOYEE") as Role;
  const currentUserName = fullName ?? email ?? "Utilisateur CGI";
  const currentUserInitials = getInitials(currentUserName);
  const currentRoleLabel = roles
    .filter((role): role is Role => ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role))
    .map(getBusinessRoleLabel)
    .join(", ");
  const navGroups: {
    title: string;
    items: {
      label: string;
      icon: LucideIcon;
      to?:
        | "/dashboard"
        | "/tickets"
        | "/sla/policies"
        | "/planning"
        | "/employees"
        | "/messages"
        | "/quality-lab"
        | "/users"
        | "/departments"
        | "/my-profile";
      roles?: Role[];
      action?: "logout";
    }[];
  }[] = [
    {
      title: "Pilotage",
      items: [{ label: "Centre de contrôle", icon: Gauge, to: "/dashboard" }],
    },
    {
      title: "Opérations",
      items: [
        { label: "Tickets", icon: LifeBuoy, to: "/tickets" },
        { label: "SLA", icon: Gauge, to: "/sla/policies", roles: ["ADMIN", "MANAGER"] },
        { label: "Planning", icon: Calendar, to: "/planning", roles: ["ADMIN", "MANAGER"] },
        {
          label: "Disponibilité équipe",
          icon: Users,
          to: "/employees",
          roles: ["ADMIN", "MANAGER"],
        },
        { label: "Profil", icon: UserRound, to: "/my-profile", roles: ["EMPLOYEE"] },
      ],
    },
    {
      title: "Collaboration",
      items: [
        { label: "Notifications", icon: Bell, to: "/messages" },
        { label: "Messagerie", icon: Mail, to: "/messages" },
        { label: "Quality Lab IA", icon: Sparkles, to: "/quality-lab" },
      ],
    },
    {
      title: "Administration",
      items: [
        { label: "Utilisateurs", icon: UserCog, to: "/users", roles: ["ADMIN"] },
        { label: "Employés", icon: UserRound, to: "/employees", roles: ["ADMIN", "MANAGER"] },
        { label: "Départements", icon: Users, to: "/departments", roles: ["ADMIN"] },
        {
          label: "Politiques SLA",
          icon: ShieldCheck,
          to: "/sla/policies",
          roles: ["ADMIN", "MANAGER"],
        },
      ],
    },
    {
      title: "Compte",
      items: [
        { label: "Mon profil", icon: Settings, to: "/my-profile" },
        { label: "Déconnexion", icon: LogOut, action: "logout" },
      ],
    },
  ];
  const fronthQuickActions = [
    { label: "Nouveau ticket", icon: Plus, to: "/tickets" as const, primary: true },
    { label: "Mes tickets", icon: ClipboardList, to: "/tickets" as const },
    {
      label: "Planning",
      icon: Calendar,
      to: "/planning" as const,
      roles: ["ADMIN", "MANAGER"] as Role[],
    },
    {
      label: "SLA",
      icon: Gauge,
      to: "/sla/policies" as const,
      roles: ["ADMIN", "MANAGER"] as Role[],
    },
    { label: "Quality Lab IA", icon: Sparkles, to: "/quality-lab" as const },
    {
      label: "Équipe",
      icon: Users,
      to: "/employees" as const,
      roles: ["ADMIN", "MANAGER"] as Role[],
    },
    { label: "Notifications", icon: Bell, to: "/messages" as const },
    {
      label: "Rapports",
      icon: FileBarChart,
      to: "/dashboard" as const,
      roles: ["ADMIN", "MANAGER"] as Role[],
    },
  ].filter((action) => !action.roles || action.roles.includes(currentRole));

  if (shouldRenderLegacyDashboardShell()) {
  return (
    <AuthenticatedView>
      <div className="min-h-dvh bg-[oklch(0.985_0.003_260)] text-foreground">
        <div className="mx-auto flex min-h-dvh max-w-[1600px]">
          <aside className="hidden w-72 shrink-0 flex-col border-r border-border/60 bg-white lg:flex">
            <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-cgi text-white shadow-soft">
                <Workflow className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight">CGI-FLOW</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  Intranet opérations
                </div>
              </div>
            </div>

            <div className="border-b border-border/60 p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-cgi text-sm font-semibold text-white">
                    {currentUserInitials}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${availabilityMap[availability].dot}`}
                    aria-label={availabilityMap[availability].label}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{currentUserName}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {currentRoleLabel || "Compte CGI"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-muted/60 p-1">
                {(Object.keys(availabilityMap) as (keyof typeof availabilityMap)[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAvailability(key)}
                    className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                      availability === key
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${availabilityMap[key].dot}`}
                    />
                    {availabilityMap[key].label}
                  </button>
                ))}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {navGroups.map((group) => {
                const items = group.items.filter(
                  (item) => !item.roles || item.roles.includes(currentRole),
                );
                if (items.length === 0) return null;
                return (
                  <div key={group.title} className="mb-5">
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </div>
                    <ul className="space-y-0.5">
                      {items.map((item) => {
                        const active = item.to === "/dashboard";
                        const Icon = item.icon;
                        const cls = `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-gradient-cgi-soft text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`;
                        const content = (
                          <>
                            <Icon
                              className={`h-4 w-4 shrink-0 ${active ? "text-[oklch(0.5_0.22_300)]" : ""}`}
                            />
                            <span className="truncate">{item.label}</span>
                            {active ? (
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-cgi" />
                            ) : null}
                          </>
                        );
                        return (
                          <li key={item.label}>
                            {item.action === "logout" ? (
                              <button
                                type="button"
                                onClick={() => void logout()}
                                className={`${cls} w-full text-left`}
                              >
                                {content}
                              </button>
                            ) : item.to ? (
                              <Link to={item.to} className={cls}>
                                {content}
                              </Link>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-white/90 px-4 backdrop-blur sm:px-6">
              <div className="relative max-w-2xl flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Rechercher un ticket, un employé, un département..."
                  className="h-10 w-full rounded-xl border border-border/70 bg-muted/40 pl-9 pr-3 text-sm outline-none transition focus:border-[oklch(0.6_0.2_300)] focus:bg-white focus:ring-2 focus:ring-[oklch(0.6_0.2_300)]/20"
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-lg border border-border/70 bg-white px-2.5 py-1.5 text-xs sm:flex">
                  <span className={`h-2 w-2 rounded-full ${availabilityMap[availability].dot}`} />
                  <select
                    value={availability}
                    onChange={(event) =>
                      setAvailability(event.target.value as keyof typeof availabilityMap)
                    }
                    className="bg-transparent text-xs font-medium outline-none"
                    aria-label="Statut de disponibilité"
                  >
                    {(Object.keys(availabilityMap) as (keyof typeof availabilityMap)[]).map(
                      (key) => (
                        <option key={key} value={key}>
                          {availabilityMap[key].label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <Link
                  to="/messages"
                  aria-label="Notifications"
                  className="relative grid h-10 w-10 place-items-center rounded-lg border border-border/70 bg-white text-muted-foreground transition hover:text-foreground"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[oklch(0.65_0.24_22)]" />
                </Link>
                <button
                  type="button"
                  aria-label="Menu utilisateur"
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-white px-1.5 py-1 pr-2.5 text-sm transition hover:bg-muted/50"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-cgi text-[11px] font-semibold text-white">
                    {currentUserInitials}
                  </span>
                  <span className="hidden text-xs font-medium sm:inline">
                    {currentUserName.split(" ")[0]}
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:inline" />
                </button>
              </div>
            </header>

            <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Pilotage</span>
                    <ChevronRight className="h-3 w-3" />
                    <span>Centre de contrôle</span>
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Centre de contrôle
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Vue opérationnelle de la plateforme CGI-FLOW.
                  </p>
                </div>
                {canReadSlaDashboard ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setExportOpen((value) => !value)}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-white px-3.5 text-sm font-medium shadow-sm transition hover:bg-muted/50"
                    >
                      <Download className="h-4 w-4" />
                      Exporter
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {exportOpen && (
                      <div className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-lg border border-border/70 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setExportOpen(false);
                            void handleDownloadKpiSlaReport();
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/60"
                        >
                          Rapport KPI & SLA
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExportOpen(false);
                            void handleDownloadSlaReport();
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/60"
                        >
                          Rapport SLA
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {reportError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
                  {reportError}
                </div>
              ) : null}

              <section aria-labelledby="quick-access">
                <h2
                  id="quick-access"
                  className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Accès rapide
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {fronthQuickActions.map(({ label, icon: Icon, primary, to }) => (
                    <Link
                      key={label}
                      to={to}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                        primary
                          ? "border-transparent bg-gradient-cgi text-white shadow-soft hover:brightness-110"
                          : "border-border/70 bg-white text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </div>
              </section>

              <section aria-labelledby="kpis">
                <h2 id="kpis" className="sr-only">
                  Indicateurs
                </h2>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-white p-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    {
                      icon: ShieldCheck,
                      label: "Respect SLA",
                      value: loadingSla ? "..." : formatPercent(slaSummary?.slaComplianceRate),
                    },
                    {
                      icon: AlertTriangle,
                      label: "En risque",
                      value: loadingSla ? "..." : formatNumber(slaSummary?.atRiskTickets),
                    },
                    {
                      icon: Timer,
                      label: "Dépassés",
                      value: loadingSla ? "..." : formatNumber(slaSummary?.breachedTickets),
                    },
                    {
                      icon: AlertTriangle,
                      label: "Critiques dépassés",
                      value: loadingSla ? "..." : formatNumber(slaSummary?.criticalBreachedTickets),
                    },
                    {
                      icon: Gauge,
                      label: "Temps moyen résolution",
                      value: loadingSla
                        ? "..."
                        : formatDurationMinutes(slaSummary?.averageResolutionMinutes),
                    },
                    {
                      icon: Activity,
                      label: "Temps moyen prise en charge",
                      value: loadingSla
                        ? "..."
                        : formatDurationMinutes(slaSummary?.averageResponseMinutes),
                    },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2.5 rounded-xl p-2.5 hover:bg-muted/40"
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[11px] text-muted-foreground">{label}</div>
                        <div className="truncate text-base font-semibold tabular-nums">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                  <article className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-gradient-cgi-soft/40 px-5 py-3.5">
                      <div>
                        <h2 className="text-base font-semibold tracking-tight">
                          Situation opérationnelle du jour
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Aperçu en temps réel des tickets et incidents.
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2 py-0.5 text-[11px] text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Mise à jour continue
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="col-span-1 rounded-xl border border-border/60 bg-gradient-cgi p-4 text-white sm:col-span-2">
                          <div className="flex items-center gap-2 text-xs opacity-90">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Incidents ouverts
                          </div>
                          <div className="mt-1 text-4xl font-semibold tabular-nums">
                            {loadingTickets ? "..." : formatNumber(ticketSummary?.openTickets)}
                          </div>
                          <p className="mt-1 text-xs opacity-80">
                            Nécessitent une prise en charge coordonnée.
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-[oklch(0.98_0.02_300)] p-4">
                          <div className="text-xs text-muted-foreground">Résolus aujourd'hui</div>
                          <div className="mt-1 text-3xl font-semibold text-[oklch(0.45_0.2_300)] tabular-nums">
                            {loadingTickets ? "..." : formatNumber(ticketSummary?.resolvedToday)}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Clôturés par l'équipe.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs font-medium text-muted-foreground">
                            Répartition par statut
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Total:{" "}
                            {loadingTickets ? "..." : formatNumber(ticketSummary?.totalTickets)}
                          </div>
                        </div>
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          {statusSegments.map((segment) => (
                            <div
                              key={segment.label}
                              className={`h-full ${segment.color}`}
                              style={{
                                width:
                                  statusTotal > 0
                                    ? `${Math.max(4, (segment.value / statusTotal) * 100)}%`
                                    : "25%",
                              }}
                            />
                          ))}
                        </div>
                        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {statusSegments.map((segment) => (
                            <li
                              key={segment.label}
                              className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2"
                            >
                              <span className={`h-2 w-2 rounded-full ${segment.color}`} />
                              <span className="flex-1 truncate text-xs text-muted-foreground">
                                {segment.label}
                              </span>
                              <span className="text-sm font-semibold tabular-nums">
                                {loadingTickets ? "..." : formatNumber(segment.value)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-5 flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Temps moyen de traitement</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {loadingTickets
                            ? "..."
                            : formatDurationMinutes(ticketSummary?.averageTreatmentMinutes)}
                        </span>
                      </div>
                    </div>
                  </article>

                  <section aria-labelledby="modules">
                    <div className="mb-3 flex items-end justify-between">
                      <h2 id="modules" className="text-base font-semibold tracking-tight">
                        Mes modules opérationnels
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {moduleCards
                        .filter((module) => module.visible !== false)
                        .map((module) => {
                          const Icon = module.icon;
                          return (
                            <article
                              key={module.title}
                              className="group rounded-2xl border border-border/60 bg-white p-4 transition hover:border-[oklch(0.7_0.15_300)]/40 hover:shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-semibold tabular-nums">
                                    {module.value}
                                  </div>
                                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    {module.sub}
                                  </div>
                                </div>
                              </div>
                              <h3 className="mt-3 text-sm font-semibold">{module.title}</h3>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {module.desc}
                              </p>
                              <Link
                                to={module.to}
                                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.5_0.22_300)] transition group-hover:gap-1.5"
                              >
                                Ouvrir <ArrowRight className="h-3 w-3" />
                              </Link>
                            </article>
                          );
                        })}
                    </div>
                  </section>
                </div>

                <aside className="space-y-5">
                  <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[oklch(0.96_0.06_22)] text-[oklch(0.55_0.22_22)]">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <h3 className="text-sm font-semibold">Priorité du jour</h3>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {urgentTickets[0]
                        ? `${urgentTickets[0].ticketReference} - ${urgentTickets[0].ticketTitle}`
                        : "Aucune priorité critique détectée pour le moment. Les tickets proches de leur échéance apparaîtront ici."}
                    </p>
                    <Link
                      to="/tickets"
                      className="mt-3 inline-flex text-xs font-medium text-[oklch(0.5_0.22_300)]"
                    >
                      Voir les tickets en risque →
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Disponibilité de l'équipe</h3>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex -space-x-2">
                      {(employeeWorkload.length > 0 ? employeeWorkload.slice(0, 5) : []).map(
                        (employee, index) => (
                          <span
                            key={`${employee.assignedUserId ?? "agent"}-${index}`}
                            className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-semibold ${
                              index % 3 === 0
                                ? "bg-emerald-100 text-emerald-700"
                                : index % 3 === 1
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {getInitials(employee.assignedUserLabel)}
                          </span>
                        ),
                      )}
                      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-muted text-[10px] font-semibold text-muted-foreground">
                        +
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-border/60 py-2">
                        <dt className="text-xs text-emerald-600">Agents</dt>
                        <dd className="text-base font-semibold tabular-nums">
                          {loadingEmployeeKpis
                            ? "..."
                            : formatNumber(employeeKpiSummary?.totalAgentsWithTickets)}
                        </dd>
                      </div>
                      <div className="rounded-lg border border-border/60 py-2">
                        <dt className="text-xs text-amber-600">Assignés</dt>
                        <dd className="text-base font-semibold tabular-nums">
                          {loadingEmployeeKpis
                            ? "..."
                            : formatNumber(employeeKpiSummary?.totalActiveAssignedTickets)}
                        </dd>
                      </div>
                      <div className="rounded-lg border border-border/60 py-2">
                        <dt className="text-xs text-rose-600">Charge</dt>
                        <dd className="text-base font-semibold tabular-nums">
                          {loadingEmployeeKpis
                            ? "..."
                            : formatDecimal(employeeKpiSummary?.averageWorkloadScore)}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      to="/employees"
                      className="mt-3 inline-flex w-full justify-center rounded-lg border border-border/70 bg-white px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
                    >
                      Voir toute l'équipe
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold">Actions</h3>
                    <Link
                      to="/tickets"
                      className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-cgi px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110"
                    >
                      <Plus className="h-4 w-4" /> Créer un ticket
                    </Link>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { label: "Quality Lab IA", icon: Sparkles, to: "/quality-lab" as const },
                        {
                          label: "Planning",
                          icon: Calendar,
                          to: "/planning" as const,
                          visible: canReadSlaDashboard,
                        },
                        {
                          label: "SLA",
                          icon: Gauge,
                          to: "/sla/policies" as const,
                          visible: canReadSlaDashboard,
                        },
                      ]
                        .filter((action) => action.visible !== false)
                        .map((action) => {
                          const Icon = action.icon;
                          return (
                            <Link
                              key={action.label}
                              to={action.to}
                              className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-white px-3 py-2 text-sm hover:bg-muted/50"
                            >
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {action.label}
                            </Link>
                          );
                        })}
                    </div>
                  </div>

                  {slaError && canReadSlaDashboard ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-amber-900">
                            Indicateurs SLA
                          </div>
                          <p className="mt-0.5 text-xs text-amber-800">
                            Indicateurs temporairement indisponibles.
                          </p>
                          <button
                            type="button"
                            onClick={() => void loadSlaDashboard()}
                            className="mt-2 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                          >
                            Réessayer
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Prochaines activités</h3>
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <ul className="space-y-2">
                      {(urgentTickets.length > 0
                        ? urgentTickets.slice(0, 3)
                        : [null, null, null]
                      ).map((ticket, index) => (
                        <li
                          key={ticket?.ticketId ?? index}
                          className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5"
                        >
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
                            <span className="text-[10px] font-semibold">
                              {ticket?.resolutionDeadline
                                ? new Intl.DateTimeFormat("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }).format(new Date(ticket.resolutionDeadline))
                                : "--:--"}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {ticket?.ticketTitle ?? "Activité à planifier"}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {ticket?.ticketReference ?? "Aucune donnée disponible"}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/planning"
                      className="mt-3 inline-flex w-full justify-center rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
                    >
                      Voir le planning complet
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-white p-4 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Plateforme opérationnelle
                      </div>
                      <span>Actualisation en direct</span>
                    </div>
                  </div>
                </aside>
              </section>
            </main>
          </div>
        </div>
      </div>
    </AuthenticatedView>
  );

  }

  return (
    <AppShell>
      <PageContainer className="max-w-none">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Pilotage</span>
              <ChevronRight className="h-3 w-3" />
              <span>Centre de contrôle</span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">
              Centre de contrôle
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vue opérationnelle de la plateforme CGI-FLOW.
            </p>
          </div>
          {canReadSlaDashboard ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((current) => !current)}
                disabled={downloadingReport !== null}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-white px-3.5 text-sm font-medium shadow-sm transition hover:bg-muted/50 disabled:cursor-wait disabled:opacity-70"
              >
                <Download className="h-4 w-4" />
                {downloadingReport ? "Export..." : "Exporter"}
                <ChevronRight className="h-3.5 w-3.5 rotate-90 text-muted-foreground" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-lg border border-border/70 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      void handleDownloadKpiSlaReport();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    Rapport KPI & SLA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      void handleDownloadSlaReport();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    Rapport SLA
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {reportError && (
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {reportError}
          </div>
        )}

        {canReadSlaDashboard && slaError && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4" />
            Indicateurs SLA temporairement indisponibles.
          </div>
        )}

        <QuickAccessLauncher canReadSlaDashboard={canReadSlaDashboard} />

        <section aria-labelledby="kpis">
          <h2 id="kpis" className="sr-only">
            Indicateurs KPI
          </h2>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-white p-2 sm:grid-cols-3 lg:grid-cols-6">
            {slaKpis.map((kpi, index) => {
              const Icon = kpi.icon;
              const labels = [
                "Respect SLA",
                "En risque",
                "Dépassés",
                "Critiques dépassés",
                "Temps moyen résolution",
                "Temps moyen prise en charge",
              ];
              return (
                <div
                  key={kpi.label}
                  className="flex min-w-0 items-center gap-2.5 rounded-xl p-2.5 hover:bg-muted/40"
                >
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${kpi.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] text-muted-foreground">
                      {labels[index] ?? kpi.label}
                    </div>
                    <div className="truncate text-base font-semibold tabular-nums text-foreground">
                      {loadingSla && canReadSlaDashboard ? "..." : kpi.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <article className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-gradient-cgi-soft/40 px-5 py-3.5">
                <div>
                  <h2 className="text-base font-semibold tracking-normal">
                    Situation opérationnelle du jour
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Aperçu en temps réel des tickets et incidents.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2 py-0.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Mise à jour continue
                </span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="col-span-1 rounded-xl border border-border/60 bg-gradient-cgi p-4 text-white sm:col-span-2">
                    <div className="flex items-center gap-2 text-xs opacity-90">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Incidents ouverts
                    </div>
                    <div className="mt-1 text-4xl font-semibold tabular-nums">
                      {loadingTickets ? "..." : formatNumber(ticketSummary?.openTickets)}
                    </div>
                    <p className="mt-1 text-xs opacity-80">
                      Nécessitent une prise en charge coordonnée.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-[oklch(0.98_0.02_300)] p-4">
                    <div className="text-xs text-muted-foreground">Résolus aujourd'hui</div>
                    <div className="mt-1 text-3xl font-semibold text-[oklch(0.45_0.2_300)] tabular-nums">
                      {loadingTickets ? "..." : formatNumber(ticketSummary?.resolvedToday)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Clôturés par l'équipe.</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">
                      Répartition par statut
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Total: {loadingTickets ? "..." : formatNumber(ticketSummary?.totalTickets)}
                    </div>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    {statusSegments.map((segment) => (
                      <div
                        key={segment.label}
                        className={`h-full ${segment.color}`}
                        style={{
                          width:
                            statusTotal > 0
                              ? `${Math.max(4, (segment.value / statusTotal) * 100)}%`
                              : "25%",
                        }}
                      />
                    ))}
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {statusSegments.map((segment) => (
                      <li
                        key={segment.label}
                        className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2"
                      >
                        <span className={`h-2 w-2 rounded-full ${segment.color}`} />
                        <span className="flex-1 truncate text-xs text-muted-foreground">
                          {segment.label}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {loadingTickets ? "..." : formatNumber(segment.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Temps moyen de traitement</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {loadingTickets
                      ? "..."
                      : formatDurationMinutes(ticketSummary?.averageTreatmentMinutes)}
                  </span>
                </div>
              </div>
            </article>

            <section aria-labelledby="modules">
              <div className="mb-3 flex items-end justify-between">
                <h2 id="modules" className="text-base font-semibold tracking-normal">
                  Mes modules opérationnels
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {moduleCards
                  .filter((module) => module.visible !== false)
                  .map((module) => {
                    const Icon = module.icon;
                    return (
                      <article
                        key={module.title}
                        className="group rounded-2xl border border-border/60 bg-white p-4 transition hover:border-[oklch(0.7_0.15_300)]/40 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-semibold tabular-nums">{module.value}</div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {module.sub}
                            </div>
                          </div>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold">{module.title}</h3>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {module.desc}
                        </p>
                        <Link
                          to={module.to}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.5_0.22_300)] transition group-hover:gap-1.5"
                        >
                          Ouvrir <ArrowRight className="h-3 w-3" />
                        </Link>
                      </article>
                    );
                  })}
              </div>
            </section>

            <section className="space-y-4 pt-2" aria-labelledby="details">
              <h2 id="details" className="text-base font-semibold tracking-normal">
                Détails opérationnels
              </h2>
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

              <QualityLabCard />
            </section>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[oklch(0.96_0.06_22)] text-[oklch(0.55_0.22_22)]">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold">Priorité du jour</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {urgentTickets[0]
                  ? `${urgentTickets[0].ticketReference} - ${urgentTickets[0].ticketTitle}`
                  : "Aucune priorité critique détectée pour le moment. Les tickets proches de leur échéance apparaîtront ici."}
              </p>
              <Link
                to="/tickets"
                className="mt-3 inline-flex text-xs font-medium text-[oklch(0.5_0.22_300)]"
              >
                Voir les tickets en risque →
              </Link>
            </div>

            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Disponibilité de l'équipe</h3>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex -space-x-2">
                {employeeWorkload.slice(0, 5).map((employee, index) => (
                  <span
                    key={`${employee.assignedUserId ?? "agent"}-${index}`}
                    className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-semibold ${
                      index % 3 === 0
                        ? "bg-emerald-100 text-emerald-700"
                        : index % 3 === 1
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {getInitials(employee.assignedUserLabel)}
                  </span>
                ))}
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-muted text-[10px] font-semibold text-muted-foreground">
                  +
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border/60 py-2">
                  <dt className="text-xs text-emerald-600">Agents</dt>
                  <dd className="text-base font-semibold tabular-nums">
                    {loadingEmployeeKpis
                      ? "..."
                      : formatNumber(employeeKpiSummary?.totalAgentsWithTickets)}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 py-2">
                  <dt className="text-xs text-amber-600">Assignés</dt>
                  <dd className="text-base font-semibold tabular-nums">
                    {loadingEmployeeKpis
                      ? "..."
                      : formatNumber(employeeKpiSummary?.totalActiveAssignedTickets)}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 py-2">
                  <dt className="text-xs text-rose-600">Charge</dt>
                  <dd className="text-base font-semibold tabular-nums">
                    {loadingEmployeeKpis
                      ? "..."
                      : formatDecimal(employeeKpiSummary?.averageWorkloadScore)}
                  </dd>
                </div>
              </dl>
              <Link
                to="/employees"
                className="mt-3 inline-flex w-full justify-center rounded-lg border border-border/70 bg-white px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
              >
                Voir toute l'équipe
              </Link>
            </div>

            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Actions</h3>
              <Link
                to="/tickets"
                className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-cgi px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> Créer un ticket
              </Link>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { label: "Quality Lab IA", icon: Sparkles, to: "/quality-lab" as const },
                  {
                    label: "Planning",
                    icon: Calendar,
                    to: "/planning" as const,
                    visible: canReadSlaDashboard,
                  },
                  {
                    label: "SLA",
                    icon: Gauge,
                    to: "/sla/policies" as const,
                    visible: canReadSlaDashboard,
                  },
                ]
                  .filter((action) => action.visible !== false)
                  .map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.label}
                        to={action.to}
                        className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-white px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {action.label}
                      </Link>
                    );
                  })}
              </div>
            </div>

            {slaError && canReadSlaDashboard ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-amber-900">Indicateurs SLA</div>
                    <p className="mt-0.5 text-xs text-amber-800">
                      Indicateurs temporairement indisponibles.
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadSlaDashboard()}
                      className="mt-2 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Prochaines activités</h3>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </div>
              <ul className="space-y-2">
                {(urgentTickets.length > 0 ? urgentTickets.slice(0, 3) : [null, null, null]).map(
                  (ticket, index) => (
                    <li
                      key={ticket?.ticketId ?? index}
                      className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
                        <span className="text-[10px] font-semibold">
                          {ticket?.resolutionDeadline
                            ? new Intl.DateTimeFormat("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(ticket.resolutionDeadline))
                            : "--:--"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {ticket?.ticketTitle ?? "Activité à planifier"}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {ticket?.ticketReference ?? "Aucune donnée disponible"}
                        </div>
                      </div>
                    </li>
                  ),
                )}
              </ul>
              <Link
                to="/planning"
                className="mt-3 inline-flex w-full justify-center rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
              >
                Voir le planning complet
              </Link>
            </div>

            <div className="rounded-2xl border border-border/60 bg-white p-4 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Plateforme opérationnelle
                </div>
                <span>Actualisation en direct</span>
              </div>
            </div>
          </aside>
        </section>
      </PageContainer>
    </AppShell>
  );
}

function QuickAccessLauncher({ canReadSlaDashboard }: { canReadSlaDashboard: boolean }) {
  const actions: {
    label: string;
    icon: LucideIcon;
    to?: "/tickets" | "/sla/policies" | "/planning" | "/quality-lab" | "/employees" | "/messages";
    primary?: boolean;
    visible?: boolean;
  }[] = [
    { label: "Nouveau ticket", icon: Plus, to: "/tickets", primary: true },
    { label: "Mes tickets", icon: ClipboardList, to: "/tickets" },
    { label: "Planning", icon: Calendar, to: "/planning", visible: canReadSlaDashboard },
    { label: "SLA", icon: Gauge, to: "/sla/policies", visible: canReadSlaDashboard },
    { label: "Quality Lab IA", icon: Sparkles, to: "/quality-lab" },
    { label: "Équipe", icon: Users, to: "/employees", visible: canReadSlaDashboard },
    { label: "Notifications", icon: Bell },
    { label: "Rapports", icon: FileBarChart },
  ];

  return (
    <section aria-labelledby="quick-access">
      <h2
        id="quick-access"
        className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Accès rapide
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {actions
          .filter((action) => action.visible !== false)
          .map(({ label, icon: Icon, to, primary }) =>
            to ? (
              <Link
                key={label}
                to={to}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                  primary
                    ? "border-transparent bg-gradient-cgi text-white shadow-soft hover:brightness-110"
                    : "border-border/70 bg-white text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ) : (
              <button
                key={label}
                type="button"
                disabled
                className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl border border-border/70 bg-white px-3.5 py-2 text-sm font-medium text-muted-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ),
          )}
      </div>
    </section>
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
    <SectionSurface className="h-full overflow-hidden rounded-2xl border-border/60 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {badge && (
          <span className="rounded-full border border-border/70 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
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
                <div className="mt-3 text-2xl font-bold leading-tight text-foreground">
                  {kpi.value}
                </div>
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
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.assignedUserLabel}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatNumber(item.totalAssignedTickets)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatNumber(item.todoTickets)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatNumber(item.inProgressTickets)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatNumber(item.waitingTickets)}
                  </td>
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
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatNumber(item.criticalTickets)}
                  </td>
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
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.assignedUserLabel}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatNumber(item.processedTickets)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatNumber(item.resolvedTickets)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatNumber(item.closedTickets)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatDurationMinutes(item.averageTreatmentMinutes)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700">
                    {formatNumber(item.slaRespectedTickets)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      item.slaBreachedTickets > 0
                        ? "text-[color:var(--cgi-red)]"
                        : "text-foreground"
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
            <MiniStat
              label="Incidents ouverts"
              value={formatNumber(summary.openTickets)}
              tone="text-cgi-pink"
            />
            <MiniStat
              label="Tickets à faire"
              value={formatNumber(summary.todoTickets)}
              tone="text-sky-700"
            />
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
                      style={{
                        width: `${(segment.value / total) * 100}%`,
                        background: segment.color,
                      }}
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
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: segment.color }}
                      />
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
              <span className="text-sm font-semibold text-foreground">
                {formatNumber(item.count)}
              </span>
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
              <div className="mt-1 text-2xl font-semibold text-foreground">
                {formatNumber(item.count)}
              </div>
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
          <div className="text-2xl font-bold">
            {loading ? "..." : formatPercent(summary?.slaComplianceRate)}
          </div>
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
            <span className="text-sm font-semibold text-foreground">
              {formatNumber(summary?.totalTrackedTickets)}
            </span>
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
              <span className="font-mono text-xs font-semibold text-foreground">
                {ticket.ticketReference}
              </span>
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{ticket.ticketTitle}</div>
              </div>
              <span className="text-muted-foreground">{ticket.statusLabel}</span>
              <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-700">
                {ticket.priorityLabel}
              </Badge>
              <Badge
                variant="outline"
                className="w-fit border-violet-200 bg-violet-50 text-violet-700"
              >
                {ticket.criticalityLabel}
              </Badge>
              <Badge variant="outline" className={`w-fit ${getSlaBadgeClass(ticket.globalStatus)}`}>
                {ticket.globalStatusLabel}
              </Badge>
              <span className="text-muted-foreground">
                {formatRemainingTime(ticket.remainingMinutes)}
              </span>
              <span className="text-muted-foreground">
                {formatDateTime(ticket.resolutionDeadline)}
              </span>
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

function getInitials(value: string | null | undefined) {
  const source = (value?.trim() || "U").replace(/\s+/g, " ");
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? "U"}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function shouldRenderLegacyDashboardShell() {
  return false;
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
