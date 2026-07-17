import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  GaugeCircle,
  HelpCircle,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Ticket,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { AuthenticatedView } from "@/components/app/AuthenticatedView";
import { CurrentUserAvatar } from "@/components/app/CurrentUserAvatar";
import {
  getEmployeeKpiSummary,
  getEmployeeWorkload,
  type EmployeeWorkloadKpiResponse,
  type KpiEmployeeSummaryResponse,
} from "@/lib/api/kpi";
import { downloadKpiSlaPdfReport, ReportsApiError } from "@/lib/api/reports";
import { fetchEmployees, type Employee } from "@/lib/api/employees";
import {
  getSlaDashboardSummary,
  getSlaUrgentTickets,
  type SlaDashboardSummaryResponse,
  type SlaUrgentTicketResponse,
} from "@/lib/api/sla";
import {
  getTicketDashboardSummary,
  getTicketStatusDistribution,
  type TicketDashboardSummaryResponse,
  type TicketStatusDistributionResponse,
} from "@/lib/api/tickets";
import { useAuth } from "@/lib/auth-store";
import cgiLogo from "../../Images/logo.png";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Centre de contrôle - CGI-Intranet" },
      {
        name: "description",
        content: "Centre de contrôle opérationnel CGI-Intranet.",
      },
    ],
  }),
  component: PiloteDashboard,
});

type NavItem = {
  icon: LucideIcon;
  label: string;
  to?: "/dashboard" | "/tickets" | "/planning" | "/sla/policies" | "/employees" | "/users" | "/departments" | "/quality-lab" | "/messages" | "/my-profile" | "/kpi";
  badge?: string;
  active?: boolean;
  action?: "logout";
};

const dashboardTheme = {
  "--radius": "0.625rem",
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
  "--cgi-gradient-dark": "linear-gradient(145deg, #721B4C 0%, #523698 55%, #241347 100%)",
  "--cgi-shadow-card":
    "0 1px 2px rgba(20, 10, 40, 0.04), 0 8px 24px -12px rgba(82, 54, 152, 0.12)",
  "--cgi-shadow-shell": "0 30px 80px -30px rgba(36, 19, 71, 0.25)",
} as CSSProperties;

function PiloteDashboard() {
  const { authenticatedFetch, hasRole, logout, email, fullName } = useAuth();
  const canReadOperations = hasRole("ADMIN") || hasRole("MANAGER");
  const [ticketSummary, setTicketSummary] = useState<TicketDashboardSummaryResponse | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<TicketStatusDistributionResponse[]>(
    [],
  );
  const [slaSummary, setSlaSummary] = useState<SlaDashboardSummaryResponse | null>(null);
  const [urgentTickets, setUrgentTickets] = useState<SlaUrgentTicketResponse[]>([]);
  const [employeeSummary, setEmployeeSummary] = useState<KpiEmployeeSummaryResponse | null>(null);
  const [employeeWorkload, setEmployeeWorkload] = useState<EmployeeWorkloadKpiResponse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!canReadOperations) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [ticketSummaryResponse, statusResponse, employeesResponse] = await Promise.allSettled([
      getTicketDashboardSummary(authenticatedFetch),
      getTicketStatusDistribution(authenticatedFetch),
      fetchEmployees(authenticatedFetch),
    ]);

    const slaResponse = await getSlaDashboardSummary(authenticatedFetch).catch(() => null);
    const urgentResponse = await getSlaUrgentTickets(authenticatedFetch, 8).catch(() => []);
    const employeeSummaryResponse = await getEmployeeKpiSummary(authenticatedFetch).catch(() => null);
    const workloadResponse = await getEmployeeWorkload(authenticatedFetch, 6).catch(() => []);

    setTicketSummary(ticketSummaryResponse.status === "fulfilled" ? ticketSummaryResponse.value : null);
    setStatusDistribution(statusResponse.status === "fulfilled" ? statusResponse.value : []);
    setEmployees(employeesResponse.status === "fulfilled" ? employeesResponse.value : []);
    setSlaSummary(slaResponse);
    setUrgentTickets(urgentResponse);
    setEmployeeSummary(employeeSummaryResponse);
    setEmployeeWorkload(workloadResponse);
    setLoading(false);
  }, [authenticatedFetch, canReadOperations]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const activityData = useMemo(
    () => [
      { day: "Créés", value: ticketSummary?.createdToday ?? 0 },
      { day: "À faire", value: ticketSummary?.todoTickets ?? 0 },
      { day: "Assignés", value: ticketSummary?.assignedTickets ?? 0, highlight: true },
      { day: "En cours", value: ticketSummary?.inProgressTickets ?? 0 },
      { day: "Attente", value: ticketSummary?.waitingTickets ?? 0 },
      { day: "Résolus", value: ticketSummary?.resolvedToday ?? 0 },
    ],
    [ticketSummary],
  );
  const slaRate = clampPercent(slaSummary?.slaComplianceRate);
  const urgentUnassigned = urgentTickets.filter((ticket) => ticket.assignedUserId === null).length;
  const actionCount =
    urgentUnassigned || slaSummary?.criticalBreachedTickets || slaSummary?.atRiskTickets || 0;
  const actionLabel = urgentUnassigned
    ? "tickets critiques non affectés"
    : slaSummary?.criticalBreachedTickets
      ? "critiques SLA dépassés"
      : "tickets SLA en risque";
  const nextDeadline = urgentTickets
    .filter((ticket) => ticket.remainingMinutes !== null || ticket.resolutionDeadline)
    .sort((a, b) => (a.remainingMinutes ?? Number.MAX_SAFE_INTEGER) - (b.remainingMinutes ?? Number.MAX_SAFE_INTEGER))[0];
  const displayName = fullName ?? email ?? "Pilote CGI";

  async function handleExport() {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadKpiSlaPdfReport(authenticatedFetch);
    } catch (caught) {
      setDownloadError(
        caught instanceof ReportsApiError && caught.status === 403
          ? "Export réservé aux Pilotes et Superviseurs."
          : "Impossible d'exporter le rapport.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AuthenticatedView>
      <div className="h-[100dvh] w-full overflow-hidden bg-background p-2 md:p-3" style={dashboardTheme}>
        <div
          className="mx-auto flex h-full min-h-0 max-w-[1500px] overflow-hidden rounded-3xl bg-white"
          style={{ boxShadow: "var(--cgi-shadow-shell)" }}
        >
          <Sidebar
            logout={logout}
            openTickets={ticketSummary?.openTickets}
            canManage={canReadOperations}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TopHeader displayName={displayName} email={email} />
            <main className="min-h-0 flex-1 overflow-hidden px-3 pb-3 md:px-5 md:pb-4">
              <PageTitle
                canExport={canReadOperations}
                downloading={downloading}
                downloadError={downloadError}
                onExport={handleExport}
              />
              {!canReadOperations ? (
                <EmptyPanel message="Ce centre de contrôle est réservé aux Pilotes et Superviseurs." />
              ) : (
                <>
                  <KpiRow
                    loading={loading}
                    ticketSummary={ticketSummary}
                    slaSummary={slaSummary}
                    employeeSummary={employeeSummary}
                    employees={employees}
                  />
                  <MiddleRow
                    activityData={activityData}
                    actionCount={actionCount}
                    actionLabel={actionLabel}
                    urgentTickets={urgentTickets}
                    loading={loading}
                  />
                  <BottomRow
                    employeeWorkload={employeeWorkload}
                    slaRate={slaRate}
                    nextDeadline={nextDeadline}
                    loading={loading}
                  />
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </AuthenticatedView>
  );
}

function Sidebar({
  logout,
  openTickets,
  canManage,
}: {
  logout: () => Promise<void> | void;
  openTickets?: number;
  canManage: boolean;
}) {
  const nav = [
    {
      label: "PILOTAGE",
      items: [
        { icon: LayoutGrid, label: "Centre de contrôle", to: "/dashboard", active: true },
        { icon: BarChart3, label: "Indicateurs KPI", to: "/kpi" },
        { icon: Ticket, label: "Tickets", to: "/tickets", badge: formatCompact(openTickets) },
        { icon: CalendarDays, label: "Planning", to: canManage ? "/planning" : "/planning-view" },
        { icon: GaugeCircle, label: "SLA", to: "/sla/policies" },
        { icon: Users, label: "Équipe", to: "/employees" },
      ],
    },
    {
      label: "ADMINISTRATION",
      items: [
        { icon: UserCog, label: "Utilisateurs", to: "/users" },
        { icon: Users, label: "Employés", to: "/employees" },
        { icon: Building2, label: "Départements", to: "/departments" },
        { icon: Shield, label: "Politiques SLA", to: "/sla/policies" },
      ],
    },
    {
      label: "OUTILS",
      items: [
        { icon: Sparkles, label: "Quality Lab IA", to: "/quality-lab" },
        { icon: Bell, label: "Notifications", to: "/messages" },
        { icon: MessageSquare, label: "Messagerie", to: "/messages" },
      ],
    },
    {
      label: "GÉNÉRAL",
      items: [
        { icon: Settings, label: "Paramètres", to: "/my-profile" },
        { icon: HelpCircle, label: "Aide", to: "/dashboard" },
        { icon: LogOut, label: "Déconnexion", action: "logout" },
      ],
    },
  ] satisfies { label: string; items: NavItem[] }[];

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-border/60 bg-white px-3 py-4 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <img src={cgiLogo} alt="CGI" className="h-9 w-9 rounded-lg object-contain" />
        <span className="text-lg font-semibold tracking-tight">CGI-Intranet</span>
      </div>

      <nav className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
        {nav.map((section) => (
          <div key={section.label}>
            <div className="px-2 pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((it) => (
                <li key={it.label} className="relative">
                  {it.active && (
                    <span
                      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r"
                      style={{ background: "var(--cgi-gradient)" }}
                    />
                  )}
                  {it.action === "logout" ? (
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-sm text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <it.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 truncate text-left">{it.label}</span>
                    </button>
                  ) : (
                    <Link
                      to={it.to ?? "/dashboard"}
                      className={
                        "flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-sm transition-colors " +
                        (it.active
                          ? "text-white"
                          : "text-foreground/75 hover:bg-muted hover:text-foreground")
                      }
                      style={it.active ? { background: "var(--cgi-gradient)" } : undefined}
                    >
                      <it.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 truncate text-left">{it.label}</span>
                      {it.badge ? (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: it.active
                              ? "rgba(255,255,255,0.22)"
                              : "rgba(82,54,152,0.1)",
                            color: it.active ? "#fff" : "var(--cgi-purple)",
                          }}
                        >
                          {it.badge}
                        </span>
                      ) : null}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

    </aside>
  );
}

function TopHeader({ displayName, email }: { displayName: string; email?: string | null }) {
  return (
    <header className="flex items-center gap-3 px-3 py-3 md:px-5 md:py-3">
      <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border/60 bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Rechercher un ticket, un utilisateur..."
        />
      </div>
      <Link
        to="/messages"
        className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-white text-foreground/70 shadow-sm"
        aria-label="Messagerie"
      >
        <MessageSquare className="h-4 w-4" />
      </Link>
      <Link
        to="/messages"
        className="relative grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-white text-foreground/70 shadow-sm"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[color:var(--cgi-red)]" />
      </Link>
      <div className="flex items-center gap-3 pl-1">
        <CurrentUserAvatar />
        <div className="hidden text-right leading-tight md:block">
          <div className="text-sm font-semibold">{displayName}</div>
          <div className="text-[11px] text-muted-foreground">{email ?? "Compte CGI"}</div>
        </div>
      </div>
    </header>
  );
}

function PageTitle({
  canExport,
  downloading,
  downloadError,
  onExport,
}: {
  canExport: boolean;
  downloading: boolean;
  downloadError: string | null;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight md:text-[24px]">Centre de contrôle</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Supervisez les incidents, les engagements SLA et l'activité des équipes.
        </p>
        {downloadError ? <p className="mt-1 text-xs text-[color:var(--cgi-red)]">{downloadError}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-white shadow-sm"
          style={{ background: "var(--cgi-gradient)" }}
        >
          <Plus className="h-4 w-4" /> Créer un utilisateur
        </Link>
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport || downloading}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2 text-xs font-semibold text-foreground/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> {downloading ? "Export..." : "Exporter"}
        </button>
      </div>
    </div>
  );
}

function KpiRow({
  loading,
  ticketSummary,
  slaSummary,
  employeeSummary,
  employees,
}: {
  loading: boolean;
  ticketSummary: TicketDashboardSummaryResponse | null;
  slaSummary: SlaDashboardSummaryResponse | null;
  employeeSummary: KpiEmployeeSummaryResponse | null;
  employees: Employee[];
}) {
  const availableEmployees = employees.filter((employee) => employee.availabilityStatus === "AVAILABLE").length;
  const activeEmployees = employees.filter((employee) => employee.status !== "INACTIVE").length;
  const employeeAvailabilityValue =
    employees.length === 0 ? "Aucune donnée" : `${availableEmployees} / ${activeEmployees || employees.length}`;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        highlight
        title="Tickets ouverts"
        value={loading ? "..." : formatMetric(ticketSummary?.openTickets)}
        delta={`${formatMetric(ticketSummary?.createdToday)} créés aujourd'hui`}
      />
      <KpiCard
        title="Tickets résolus"
        value={loading ? "..." : formatMetric(ticketSummary?.resolvedToday)}
        delta={`${formatMetric(ticketSummary?.resolvedTickets)} résolus au total`}
      />
      <KpiCard
        title="SLA en risque"
        value={loading ? "..." : formatMetric(slaSummary?.atRiskTickets)}
        delta={`${formatMetric(slaSummary?.breachedTickets)} dépassés`}
      />
      <KpiCard
        title="Employés disponibles"
        value={loading ? "..." : employeeAvailabilityValue}
        delta={`${formatMetric(employeeSummary?.totalAgentsWithTickets)} agents suivis`}
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  delta,
  highlight,
}: {
  title: string;
  value: string;
  delta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border p-3.5 " +
        (highlight ? "border-transparent text-white" : "border-border/60 bg-white")
      }
      style={{
        background: highlight ? "var(--cgi-gradient)" : undefined,
        boxShadow: highlight
          ? "0 10px 24px -14px rgba(226,21,67,0.45)"
          : "var(--cgi-shadow-card)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium opacity-90">{title}</div>
        <span
          className="grid h-6 w-6 place-items-center rounded-full"
          style={{
            background: highlight ? "rgba(255,255,255,0.18)" : "rgba(82,54,152,0.08)",
            color: highlight ? "#fff" : "var(--cgi-purple)",
          }}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight md:text-[28px]">{value}</div>
      <div
        className={
          "mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium " +
          (highlight ? "bg-white/15" : "")
        }
        style={!highlight ? { background: "rgba(82,54,152,0.08)", color: "var(--cgi-purple)" } : undefined}
      >
        {delta}
      </div>
    </div>
  );
}

function MiddleRow({
  activityData,
  actionCount,
  actionLabel,
  urgentTickets,
  loading,
}: {
  activityData: { day: string; value: number; highlight?: boolean }[];
  actionCount: number;
  actionLabel: string;
  urgentTickets: SlaUrgentTicketResponse[];
  loading: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
      <div className="rounded-2xl border border-border/60 bg-white p-3.5 lg:col-span-6" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">Activité des tickets</div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <Legend color="var(--cgi-purple)" label="Actifs" />
            <Legend color="var(--cgi-red)" label="Résolus" />
            <Legend color="var(--cgi-lavender)" label="En attente" />
          </div>
        </div>
        <div className="mt-2 h-[145px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} barCategoryGap={18}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8a83a3" }} />
              <Tooltip cursor={{ fill: "rgba(82,54,152,0.05)" }} contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} />
              <Bar dataKey="value" radius={[999, 999, 999, 999]}>
                {activityData.map((d, i) => (
                  <Cell key={`${d.day}-${i}`} fill={d.highlight ? "var(--cgi-purple)" : i === activityData.length - 1 ? "var(--cgi-red)" : "var(--cgi-lavender)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-3.5 lg:col-span-3" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="text-[15px] font-semibold">Actions requises</div>
        <div className="mt-2 flex items-start gap-2.5">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
            style={{ background: "rgba(226,21,67,0.1)", color: "var(--cgi-red)" }}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-snug">
              {loading
                ? "Chargement..."
                : actionCount > 0
                  ? `${actionCount} ${actionLabel}`
                  : "Aucune action urgente"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {actionCount > 0 ? "Une intervention est requise." : "La situation opérationnelle est stable."}
            </div>
          </div>
        </div>
        <Link
          to="/tickets"
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-semibold text-white"
          style={{ background: "var(--cgi-gradient)" }}
        >
          Consulter <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-3.5 lg:col-span-3" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">Tickets prioritaires</div>
          <Link to="/tickets" className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-foreground/70">
            Voir tout
          </Link>
        </div>
        <ul className="mt-2 space-y-2">
          {urgentTickets.length === 0 ? (
            <li className="rounded-xl bg-muted px-3 py-3 text-xs text-muted-foreground">
              Aucun ticket prioritaire.
            </li>
          ) : (
            urgentTickets.slice(0, 3).map((ticket) => (
              <li key={ticket.ticketId} className="flex items-start gap-2.5">
                <TicketBadge tone={ticket.globalStatus === "BREACHED" ? "red" : ticket.globalStatus === "AT_RISK" ? "purple" : "lavender"} />
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold leading-tight">{ticket.ticketTitle}</div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/70">{ticket.ticketReference}</span> · {ticket.priorityLabel} · {ticket.globalStatusLabel}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function BottomRow({
  employeeWorkload,
  slaRate,
  nextDeadline,
  loading,
}: {
  employeeWorkload: EmployeeWorkloadKpiResponse[];
  slaRate: number | null;
  nextDeadline?: SlaUrgentTicketResponse;
  loading: boolean;
}) {
  const slaGauge = [{ name: "sla", value: slaRate ?? 0, fill: "url(#slaGrad)" }];
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
      <div className="rounded-2xl border border-border/60 bg-white p-3.5 lg:col-span-6" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">Charge des équipes</div>
          <Link
            to="/employees"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-3 py-1 text-[11px] font-semibold text-foreground/80"
          >
            <Plus className="h-3.5 w-3.5" /> Voir l'équipe
          </Link>
        </div>
        <ul className="mt-2 space-y-2">
          {employeeWorkload.length === 0 ? (
            <li className="rounded-xl bg-muted px-3 py-3 text-xs text-muted-foreground">
              {loading ? "Chargement de la charge équipe..." : "Aucune charge équipe disponible."}
            </li>
          ) : (
            employeeWorkload.slice(0, 3).map((member) => {
              const workload = getWorkloadPresentation(member.workloadScore);
              return (
                <li key={`${member.assignedUserId ?? "user"}-${member.assignedUserLabel}`} className="flex items-center gap-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
                    style={{ background: "var(--cgi-gradient)" }}
                  >
                    {getInitials(member.assignedUserLabel)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{member.assignedUserLabel}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {member.criticalTickets} critiques · {member.totalAssignedTickets} tickets actifs
                    </div>
                  </div>
                  <WorkloadBadge status={workload.status} tone={workload.tone} />
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-3.5 lg:col-span-3" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="text-[15px] font-semibold">Respect des SLA</div>
        <div className="relative mx-auto mt-1 h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="90%" innerRadius={48} outerRadius={76} startAngle={180} endAngle={0} data={slaGauge}>
              <defs>
                <linearGradient id="slaGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E21543" />
                  <stop offset="50%" stopColor="#A94E89" />
                  <stop offset="100%" stopColor="#523698" />
                </linearGradient>
              </defs>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: "#efeaf6" }} dataKey="value" cornerRadius={20} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center">
            <div className="text-2xl font-bold tracking-tight">{slaRate === null ? "Non calculé" : `${slaRate} %`}</div>
            <div className="text-[11px] text-muted-foreground">SLA respectés</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <Legend color="var(--cgi-purple)" label="Respectés" />
          <Legend color="var(--cgi-lavender)" label="En risque" />
          <Legend color="var(--cgi-red)" label="Dépassés" />
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl p-3.5 text-white lg:col-span-3"
        style={{ background: "var(--cgi-gradient-dark)" }}
      >
        <div className="text-sm font-semibold opacity-90">Prochaine échéance SLA</div>
        <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums">
          {nextDeadline ? formatRemainingClock(nextDeadline.remainingMinutes) : "--:--"}
        </div>
        <div className="mt-1 text-[11px] opacity-80">
          {nextDeadline ? `${nextDeadline.ticketReference} · ${nextDeadline.priorityLabel}` : "Aucune échéance prioritaire"}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[color:var(--cgi-purple)]"
          >
            <Eye className="h-3.5 w-3.5" /> Voir le ticket
          </Link>
          <Link
            to="/sla/policies"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Voir les SLA
          </Link>
        </div>
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #E21543 0%, transparent 70%)" }}
        />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

const toneBackground: Record<string, string> = {
  red: "rgba(226,21,67,0.12)",
  purple: "rgba(82,54,152,0.12)",
  lavender: "rgba(164,140,197,0.22)",
};

const toneForeground: Record<string, string> = {
  red: "#E21543",
  purple: "#523698",
  lavender: "#523698",
};

function TicketBadge({ tone }: { tone: string }) {
  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
      style={{ background: toneBackground[tone], color: toneForeground[tone] }}
    >
      <Ticket className="h-4 w-4" />
    </span>
  );
}

const workloadStyles: Record<string, { bg: string; fg: string }> = {
  green: { bg: "rgba(34,197,94,0.12)", fg: "#16a34a" },
  orange: { bg: "rgba(234,150,32,0.15)", fg: "#c2740c" },
  red: { bg: "rgba(226,21,67,0.12)", fg: "#E21543" },
  purple: { bg: "rgba(82,54,152,0.12)", fg: "#523698" },
};

function WorkloadBadge({ status, tone }: { status: string; tone: string }) {
  const style = workloadStyles[tone] ?? workloadStyles.purple;
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: style.bg, color: style.fg }}
    >
      {status}
    </span>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-white p-5 text-sm text-muted-foreground" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
      {message}
    </div>
  );
}

function formatMetric(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Aucune donnée";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatCompact(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) {
    return undefined;
  }
  return value > 99 ? "99+" : new Intl.NumberFormat("fr-FR").format(value);
}

function clampPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatRemainingClock(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "--:--";
  }
  const absolute = Math.abs(Math.round(minutes));
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  return `${minutes < 0 ? "-" : ""}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getInitials(value: string | null | undefined) {
  const source = (value?.trim() || "U").replace(/\s+/g, " ");
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? "U"}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function getWorkloadPresentation(score: number) {
  if (score >= 18) {
    return { status: "Surchargée", tone: "red" };
  }
  if (score >= 10) {
    return { status: "Chargée", tone: "orange" };
  }
  if (score > 0) {
    return { status: "Équilibrée", tone: "purple" };
  }
  return { status: "Disponible", tone: "green" };
}
