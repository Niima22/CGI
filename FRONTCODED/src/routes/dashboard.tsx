import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  Plus,
  Ticket,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { AppShell } from "@/components/app/AppShell";
import { RoleGuard } from "@/components/app/RoleGuard";
import {
  getAdminDashboardMockData,
  isAdminDashboardMockEnabled,
  type AdminDashboardUrgentTicket,
  type AdminDashboardWorkload,
} from "@/mocks/adminDashboardMock";
import {
  isManagerDashboardMockEnabled,
  managerDashboardMock,
} from "@/mocks/managerDashboardMock";
import { agentDashboardData } from "@/mocks/agentDashboardData";
import {
  getEmployeeKpiSummary,
  getEmployeeWorkload,
  type EmployeeWorkloadKpiResponse,
  type KpiEmployeeSummaryResponse,
} from "@/lib/api/kpi";
import { downloadKpiSlaPdfReport, ReportsApiError } from "@/lib/api/reports";
import { fetchEmployees, type Employee } from "@/lib/api/employees";
import { fetchDepartments, type Department } from "@/lib/api/departments";
import {
  getSlaDashboardSummary,
  getSlaUrgentTickets,
  type SlaDashboardSummaryResponse,
  type SlaUrgentTicketResponse,
} from "@/lib/api/sla";
import {
  fetchTickets,
  getTicketDashboardSummary,
  getTicketStatusDistribution,
  type Ticket as TicketResponse,
  type TicketDashboardSummaryResponse,
  type TicketStatusDistributionResponse,
} from "@/lib/api/tickets";
import { useAuth, type Role } from "@/lib/auth-store";

type UrgentTicketDisplay = SlaUrgentTicketResponse | AdminDashboardUrgentTicket;
type WorkloadDisplay = EmployeeWorkloadKpiResponse | AdminDashboardWorkload;

const STATUS_BAR_COLORS = [
  "var(--cgi-lavender)",
  "var(--cgi-med-purple)",
  "var(--cgi-purple)",
  "var(--cgi-pink-purple)",
  "var(--cgi-burgundy)",
];

interface UserProfile {
  id: number;
  keycloakId: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  accountStatus: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

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
  component: DashboardRoute,
});

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
  "--cgi-shadow-card": "0 1px 2px rgba(20, 10, 40, 0.04), 0 8px 24px -12px rgba(82, 54, 152, 0.12)",
  "--cgi-shadow-shell": "0 30px 80px -30px rgba(36, 19, 71, 0.25)",
} as CSSProperties;

async function fetchAdminUsers(
  authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  const response = await authenticatedFetch("/api/auth/users");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<UserProfile[]>;
}

function DashboardRoute() {
  const { hasRole } = useAuth();
  if (hasRole("ADMIN")) {
    return <PiloteDashboard />;
  }
  if (hasRole("MANAGER")) {
    return <ManagerDashboard />;
  }
  if (hasRole("EMPLOYEE")) {
    return <EmployeeDashboard />;
  }
  return (
    <AppShell lockScroll compactTopbar>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER", "EMPLOYEE"]}
        message="Votre session ne permet pas d'accéder au centre de contrôle."
      >
        <EmptyPanel message="Chargement du centre de contrôle..." />
      </RoleGuard>
    </AppShell>
  );
}

function PiloteDashboard() {
  const { authenticatedFetch, hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const useMock = isAdminDashboardMockEnabled();
  const [ticketSummary, setTicketSummary] = useState<TicketDashboardSummaryResponse | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<TicketStatusDistributionResponse[]>(
    [],
  );
  const [slaSummary, setSlaSummary] = useState<SlaDashboardSummaryResponse | null>(null);
  const [urgentTickets, setUrgentTickets] = useState<UrgentTicketDisplay[]>([]);
  const [employeeSummary, setEmployeeSummary] = useState<KpiEmployeeSummaryResponse | null>(null);
  const [employeeWorkload, setEmployeeWorkload] = useState<WorkloadDisplay[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    if (useMock) {
      const mock = getAdminDashboardMockData();
      setUsers(mock.users);
      setDepartments(mock.departments);
      setEmployees(mock.employees);
      setTickets(mock.tickets);
      setTicketSummary(mock.ticketSummary);
      setStatusDistribution(mock.statusDistribution);
      setSlaSummary(mock.slaSummary);
      setUrgentTickets(mock.urgentTickets);
      setEmployeeSummary(mock.employeeSummary);
      setEmployeeWorkload(mock.employeeWorkload);
      setLoading(false);
      return;
    }

    const [
      usersResponse,
      departmentsResponse,
      employeesResponse,
      ticketsResponse,
      ticketSummaryResponse,
      statusResponse,
    ] = await Promise.allSettled([
      fetchAdminUsers(authenticatedFetch),
      fetchDepartments(authenticatedFetch, true),
      fetchEmployees(authenticatedFetch),
      fetchTickets(authenticatedFetch),
      getTicketDashboardSummary(authenticatedFetch),
      getTicketStatusDistribution(authenticatedFetch),
    ]);

    const slaResponse = await getSlaDashboardSummary(authenticatedFetch).catch(() => null);
    const urgentResponse = await getSlaUrgentTickets(authenticatedFetch, 8).catch(() => []);
    const employeeSummaryResponse = await getEmployeeKpiSummary(authenticatedFetch).catch(
      () => null,
    );
    const workloadResponse = await getEmployeeWorkload(authenticatedFetch, 6).catch(() => []);

    setUsers(usersResponse.status === "fulfilled" ? usersResponse.value : []);
    setDepartments(departmentsResponse.status === "fulfilled" ? departmentsResponse.value : []);
    setEmployees(employeesResponse.status === "fulfilled" ? employeesResponse.value : []);
    setTickets(ticketsResponse.status === "fulfilled" ? ticketsResponse.value : []);
    setTicketSummary(
      ticketSummaryResponse.status === "fulfilled" ? ticketSummaryResponse.value : null,
    );
    setStatusDistribution(statusResponse.status === "fulfilled" ? statusResponse.value : []);
    setSlaSummary(slaResponse);
    setUrgentTickets(urgentResponse);
    setEmployeeSummary(employeeSummaryResponse);
    setEmployeeWorkload(workloadResponse);
    if (
      usersResponse.status === "rejected" ||
      departmentsResponse.status === "rejected" ||
      employeesResponse.status === "rejected" ||
      ticketsResponse.status === "rejected" ||
      ticketSummaryResponse.status === "rejected" ||
      statusResponse.status === "rejected" ||
      slaResponse === null ||
      employeeSummaryResponse === null
    ) {
      setLoadError("Certaines donnees administratives sont temporairement indisponibles.");
    }
    setLoading(false);
  }, [authenticatedFetch, isAdmin, useMock]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const statusChartData = useMemo(
    () => buildStatusChartData(statusDistribution),
    [statusDistribution],
  );
  const criticalTicketCount = countCriticalTickets(tickets);
  const accountSummary = useMemo(() => getAccountSummary(users), [users]);
  const departmentSummary = useMemo(
    () => getDepartmentSummary(departments, employees),
    [departments, employees],
  );
  const bannetteSummary = useMemo(() => getBannetteSummary(employees), [employees]);
  const slaRate = clampPercent(slaSummary?.slaComplianceRate);
  const nextDeadline = urgentTickets
    .filter((ticket) => ticket.globalStatus !== "BREACHED" && ticket.remainingMinutes !== null)
    .sort(
      (a, b) =>
        (a.remainingMinutes ?? Number.MAX_SAFE_INTEGER) -
        (b.remainingMinutes ?? Number.MAX_SAFE_INTEGER),
    )[0];
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
    <AppShell lockScroll compactTopbar>
      <>
        <div
          className="mx-auto flex h-full w-full max-w-[1500px] min-h-0 flex-col gap-2"
          style={dashboardTheme}
        >
          <PageTitle
            canExport={isAdmin}
            downloading={downloading}
            downloadError={downloadError}
            onExport={handleExport}
          />
          {loadError ? <EmptyPanel message={loadError} /> : null}
          <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr_1fr] gap-2">
            <KpiRow
              loading={loading}
              users={users}
              accountSummary={accountSummary}
              departmentSummary={departmentSummary}
              bannetteSummary={bannetteSummary}
              ticketSummary={ticketSummary}
            />
            <MiddleRow
              statusChartData={statusChartData}
              criticalTicketCount={criticalTicketCount}
              slaSummary={slaSummary}
              accountSummary={accountSummary}
              urgentTickets={urgentTickets}
              loading={loading}
            />
            <BottomRow
              employeeWorkload={employeeWorkload}
              departmentSummary={departmentSummary}
              bannetteSummary={bannetteSummary}
              slaRate={slaRate}
              nextDeadline={nextDeadline}
              loading={loading}
            />
          </div>
        </div>
      </>
    </AppShell>
  );
}

function ManagerDashboard() {
  const useMock = isManagerDashboardMockEnabled();
  const data = managerDashboardMock;
  const statusChartData = useMemo(
    () => buildStatusChartData(data.statusDistribution),
    [data.statusDistribution],
  );

  return (
    <AppShell lockScroll compactTopbar>
      <RoleGuard
        allowedRoles={["MANAGER"]}
        message="Ce centre de controle est reserve aux Superviseurs CGI."
      >
        <div
          className="mx-auto flex h-full w-full max-w-[1500px] min-h-0 flex-col gap-2"
          style={dashboardTheme}
        >
          <ManagerPageTitle />
          {!useMock ? (
            <EmptyPanel message="Les données réelles Superviseur seront chargées depuis les API opérationnelles." />
          ) : null}
          <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr_1fr] gap-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
              {data.kpis.map((kpi, index) => (
                <KpiCard
                  key={kpi.title}
                  highlight={index === 0}
                  title={kpi.title}
                  value={kpi.value}
                  delta={kpi.delta}
                />
              ))}
            </div>
            <ManagerMiddleRow statusChartData={statusChartData} />
            <ManagerBottomRow />
          </div>
        </div>
      </RoleGuard>
    </AppShell>
  );
}

function EmployeeDashboard() {
  const data = agentDashboardData;
  const priorityTicketPath = "/tickets/$id";

  return (
    <AppShell lockScroll compactTopbar>
      <RoleGuard allowedRoles={["EMPLOYEE"]} message="Ce dashboard est réservé à Meryem Zerktouni.">
        <div
          className="mx-auto flex h-full w-full max-w-[1500px] min-h-0 flex-col gap-2"
          style={dashboardTheme}
        >
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight md:text-xl">
                Mon tableau de bord
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Suivi personnel de mes tickets, de mon planning et de mes activités.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {data.quickAccess.map((access) => (
                <Link
                  key={access.label}
                  to={access.route}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
                >
                  {access.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr_1fr] gap-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
              {data.metrics.map((metric, index) => (
                <KpiCard
                  key={metric.title}
                  highlight={index === 0}
                  title={metric.title}
                  value={metric.value}
                  delta={metric.description}
                />
              ))}
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-12">
              <div
                className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl p-2.5 text-white lg:col-span-4"
                style={{ background: "var(--cgi-gradient-dark)" }}
              >
                <div className="text-xs font-semibold opacity-90">
                  Mon prochain ticket prioritaire
                </div>
                <div className="mt-1.5 text-xl font-bold tracking-tight tabular-nums">
                  {data.priorityTicket.reference}
                </div>
                <div className="mt-1 text-[10px] opacity-80">
                  {data.priorityTicket.title} · {data.priorityTicket.status} ·{" "}
                  {data.priorityTicket.priority} · {data.priorityTicket.criticality} ·{" "}
                  {data.priorityTicket.basket} · {data.priorityTicket.sla} ·{" "}
                  {data.priorityTicket.deadline}
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  <Link
                    to={priorityTicketPath}
                    params={{ id: data.priorityTicket.reference }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[color:var(--cgi-purple)]"
                  >
                    <Eye className="h-3 w-3" /> Consulter le ticket
                  </Link>
                </div>
              </div>

              <div
                className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
                style={{ boxShadow: "var(--cgi-shadow-card)" }}
              >
                <div className="text-[13px] font-semibold">Mon planning du jour</div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <AccountMiniStat label="Date" value={data.todayPlanning.date} />
                  <AccountMiniStat label="Horaire" value={data.todayPlanning.schedule} />
                  <AccountMiniStat label="Bannette" value={data.todayPlanning.basket} />
                  <AccountMiniStat label="Statut" value={data.todayPlanning.availability} />
                  <AccountMiniStat label="Mode" value={data.todayPlanning.workMode} />
                </div>
                <Link
                  to="/planning"
                  className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[11px] font-semibold text-white"
                  style={{ background: "var(--cgi-gradient)" }}
                >
                  Voir mon planning <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div
                className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-5"
                style={{ boxShadow: "var(--cgi-shadow-card)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-semibold">Mes tickets récents</div>
                  <Link
                    to="/tickets"
                    className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
                  >
                    Voir tous mes tickets
                  </Link>
                </div>
                <ul className="mt-1.5 flex-1 space-y-1.5 overflow-hidden">
                  {data.recentTickets.map((ticket) => (
                    <li key={ticket.reference} className="flex items-start gap-2">
                      <TicketBadge tone={ticket.sla === "En risque" ? "red" : "purple"} />
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold leading-tight">
                          {ticket.title}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground/70">
                            {ticket.reference}
                          </span>{" "}
                          · {ticket.status} · {ticket.priority} · {ticket.criticality} ·{" "}
                          {ticket.sla} · {ticket.basket}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-12">
              <div
                className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
                style={{ boxShadow: "var(--cgi-shadow-card)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-semibold">Messages non lus</div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: toneBackground.red, color: toneForeground.red }}
                  >
                    2 non lus
                  </span>
                </div>
                <ul className="mt-1.5 flex-1 space-y-1.5 overflow-hidden">
                  {data.unreadMessages.map((message) => (
                    <li key={`${message.sender}-${message.ticketReference}`} className="rounded-xl bg-muted px-2.5 py-1.5">
                      <div className="text-[11px] font-semibold text-foreground">
                        {message.sender} · {message.senderRole}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {message.message}
                      </div>
                      <div className="mt-1 text-[10px] text-foreground/60">
                        {message.time} · {message.type} · {message.ticketReference}
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/messages"
                  className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[11px] font-semibold text-white"
                  style={{ background: "var(--cgi-gradient)" }}
                >
                  Ouvrir la messagerie <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div
                className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
                style={{ boxShadow: "var(--cgi-shadow-card)" }}
              >
                <div className="text-[13px] font-semibold">Mon activité récente</div>
                <ul className="mt-1.5 flex-1 space-y-1 overflow-hidden">
                  {data.recentActivity.map((activity) => (
                    <li key={activity.label} className="rounded-xl bg-muted px-2.5 py-1.5">
                      <div className="text-[11px] font-semibold text-foreground">{activity.label}</div>
                      <div className="text-[10px] text-muted-foreground">{activity.time}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
                style={{ boxShadow: "var(--cgi-shadow-card)" }}
              >
                <div className="text-[13px] font-semibold">Accès rapides</div>
                <div className="mt-1.5 grid flex-1 grid-cols-1 gap-1 overflow-hidden">
                  {data.quickAccess.map((access) => (
                    <Link
                      key={access.label}
                      to={access.route}
                      className="rounded-xl bg-muted px-2.5 py-1.5 transition hover:bg-muted/70"
                    >
                      <div className="text-[11px] font-semibold text-foreground">{access.label}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {access.description}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div
                className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
                style={{ boxShadow: "var(--cgi-shadow-card)" }}
              >
                <div className="text-[13px] font-semibold">À surveiller</div>
                <ul className="mt-1.5 flex-1 space-y-1.5 overflow-hidden">
                  {data.alerts.map((alert) => (
                    <li key={alert.title} className="rounded-xl bg-muted px-2.5 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold text-foreground">{alert.title}</div>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            background:
                              alert.badge === "Urgent" ? toneBackground.red : toneBackground.lavender,
                            color: alert.badge === "Urgent" ? toneForeground.red : toneForeground.lavender,
                          }}
                        >
                          {alert.badge}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{alert.message}</div>
                      <Link
                        to={priorityTicketPath}
                        params={{ id: alert.ticketReference }}
                        className="mt-1 inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
                      >
                        Consulter
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </RoleGuard>
    </AppShell>
  );
}

function ManagerPageTitle() {
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight md:text-xl">Centre de contrôle</h1>
        <p className="text-[11px] text-muted-foreground">
          Supervisez les tickets, les SLA, le planning et l'activité des Agents BO et FO.
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
          style={{ background: "var(--cgi-gradient)" }}
        >
          <Ticket className="h-3.5 w-3.5" /> Voir les tickets
        </Link>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
        >
          Affecter un ticket
        </Link>
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
        >
          Voir les Agents
        </Link>
        <Link
          to="/planning"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
        >
          Consulter le planning
        </Link>
        <Link
          to="/sla/policies"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
        >
          Voir les SLA
        </Link>
        <Link
          to="/kpi"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
        >
          Consulter les KPI
        </Link>
      </div>
    </div>
  );
}

function ManagerMiddleRow({
  statusChartData,
}: {
  statusChartData: { label: string; value: number; color: string }[];
}) {
  const indicators = managerDashboardMock.ticketIndicators;
  return (
    <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-12">
      <div
        className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-6"
        style={{ boxShadow: "var(--cgi-shadow-card)" }}
      >
        <div className="text-[13px] font-semibold">Répartition des tickets par statut</div>
        <div className="mt-1 h-[100px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusChartData} barCategoryGap={14} margin={{ top: 14, left: 0, right: 0, bottom: 0 }}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8a83a3" }} />
              <Tooltip
                cursor={{ fill: "rgba(82,54,152,0.05)" }}
                contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }}
                formatter={(value: number) => [value, "Tickets"]}
              />
              <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                {statusChartData.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#3d3557" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <MetricBadge label="Tickets critiques" value={indicators.critical} tone="red" />
          <MetricBadge label="SLA en risque" value={indicators.atRiskSla} tone="lavender" />
          <MetricBadge label="SLA dépassés" value={indicators.breachedSla} tone="purple" />
        </div>
      </div>

      <ManagerAvailabilityCard />
      <ManagerPriorityTickets />
    </div>
  );
}

function ManagerAvailabilityCard() {
  const availability = managerDashboardMock.agentAvailability;
  return (
    <div
      className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
      style={{ boxShadow: "var(--cgi-shadow-card)" }}
    >
      <div className="text-[13px] font-semibold">Disponibilité des Agents</div>
      <div className="mt-1.5 flex flex-1 items-start gap-2">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-xl"
          style={{ background: "rgba(226,21,67,0.1)", color: "var(--cgi-red)" }}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-snug">
            {availability.available} disponibles / {availability.total} Agents
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            En communication {availability.inCommunication} · Indisponible{" "}
            {availability.unavailable} · Total {availability.total}
          </div>
        </div>
      </div>
      <Link
        to="/employees"
        className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[11px] font-semibold text-white"
        style={{ background: "var(--cgi-gradient)" }}
      >
        Voir les Agents <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function ManagerPlanningCard() {
  const planning = managerDashboardMock.planning;
  return (
    <div
      className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
      style={{ boxShadow: "var(--cgi-shadow-card)" }}
    >
      <div className="text-[13px] font-semibold">Planning et disponibilités</div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <AccountMiniStat label="Présents" value={String(planning.presentAgents)} />
        <AccountMiniStat label="Indisponibles" value={String(planning.unavailableAgents)} />
        <AccountMiniStat label="Congés en attente" value={String(planning.pendingLeaveRequests)} />
        <AccountMiniStat label="Shifts à traiter" value={String(planning.shiftSwapsToProcess)} />
        <AccountMiniStat label="Conflits détectés" value={String(planning.detectedConflicts)} />
      </div>
      <Link
        to="/planning"
        className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[11px] font-semibold text-white"
        style={{ background: "var(--cgi-gradient)" }}
      >
        Consulter le planning <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function ManagerPriorityTickets() {
  return (
    <div
      className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
      style={{ boxShadow: "var(--cgi-shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold">Tickets prioritaires</div>
        <Link to="/tickets" className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-foreground/70">
          Voir tout
        </Link>
      </div>
      <ul className="mt-1.5 flex-1 space-y-1.5 overflow-hidden">
        {managerDashboardMock.priorityTickets.map((ticket) => (
          <li key={ticket.reference} className="flex items-start gap-2">
            <TicketBadge tone={ticket.sla === "Dépassé" ? "red" : "purple"} />
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold leading-tight">{ticket.title}</div>
              <div className="truncate text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground/70">{ticket.reference}</span> · {ticket.priority} · {ticket.criticality} · {ticket.status} · {ticket.sla} · {ticket.bannette} · {ticket.agent}
              </div>
              <div className="mt-1 flex gap-1">
                {["Voir le ticket", "Affecter", "Réaffecter"].map((action) => (
                  <Link key={action} to="/tickets" className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                    {action}
                  </Link>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManagerBottomRow() {
  const next = managerDashboardMock.nextSlaDeadline;
  const sla = managerDashboardMock.sla;
  const slaRate = Math.round((sla.respected / sla.total) * 100);
  const slaGauge = [{ name: "sla", value: slaRate, fill: "url(#managerSlaGrad)" }];
  return (
    <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-12">
      <ManagerAgentWorkload />
      <div
        className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-2"
        style={{ boxShadow: "var(--cgi-shadow-card)" }}
      >
        <div className="text-[13px] font-semibold">Respect des SLA</div>
        <div className="relative mx-auto mt-1 h-[95px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="90%"
              innerRadius={44}
              outerRadius={68}
              startAngle={180}
              endAngle={0}
              data={slaGauge}
            >
              <defs>
                <linearGradient id="managerSlaGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E21543" />
                  <stop offset="50%" stopColor="#A94E89" />
                  <stop offset="100%" stopColor="#523698" />
                </linearGradient>
              </defs>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background={{ fill: "#efeaf6" }} dataKey="value" cornerRadius={20} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
            <div className="text-xl font-bold tracking-tight">{slaRate} %</div>
            <div className="text-[10px] text-muted-foreground">SLA respectés</div>
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-1 gap-1 text-[10px]">
          <AccountMiniStat label="Respectés" value={String(sla.respected)} />
          <AccountMiniStat label="En risque" value={String(sla.atRisk)} />
          <AccountMiniStat label="Dépassés" value={String(sla.breached)} />
        </div>
      </div>
      <div
        className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl p-2.5 text-white lg:col-span-3"
        style={{ background: "var(--cgi-gradient-dark)" }}
      >
        <div className="text-xs font-semibold opacity-90">Prochaine échéance SLA</div>
        <div className="mt-1.5 text-xl font-bold tracking-tight tabular-nums">{next.reference}</div>
        <div className="mt-1 text-[10px] opacity-80">
          {next.title} · {next.sla} · {next.remaining} restantes · {next.bannette} · {next.agent}
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          <Link to="/tickets" className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[color:var(--cgi-purple)]">
            <Eye className="h-3 w-3" /> Voir le ticket
          </Link>
          <Link to="/sla/policies" className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-2.5 py-1 text-[10px] font-semibold text-white">
            <ExternalLink className="h-3 w-3" /> Voir les SLA
          </Link>
        </div>
      </div>
      <ManagerOperationsCard />
    </div>
  );
}

function ManagerAgentWorkload() {
  const activeTickets = managerDashboardMock.statusDistribution
    .filter((entry) => ["TODO", "ASSIGNED", "IN_PROGRESS"].includes(entry.status))
    .reduce((total, entry) => total + entry.count, 0);
  return (
    <div
      className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-4"
      style={{ boxShadow: "var(--cgi-shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold">Charge des Agents</div>
        <Link to="/employees" className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1 text-[10px] font-semibold text-foreground/80">
          <Plus className="h-3 w-3" /> Voir les Agents
        </Link>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        <AccountMiniStat label="Bannettes" value="BO, FO" />
        <AccountMiniStat label="Agents" value="6" />
        <AccountMiniStat label="Tickets actifs" value={String(activeTickets)} />
      </div>
      <ul className="mt-1.5 flex-1 space-y-1.5 overflow-hidden">
        {managerDashboardMock.agentWorkload.map((agent) => (
          <li key={agent.name} className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ background: "var(--cgi-gradient)" }}>
              {getInitials(agent.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold">{agent.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">
                Bannette : {agent.bannette} · {agent.activeTickets} tickets actifs · {agent.criticalTickets} ticket critique
              </div>
            </div>
            <WorkloadBadge status={agent.charge} tone={agent.tone} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManagerOperationsCard() {
  const planning = managerDashboardMock.planning;
  return (
    <div
      className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
      style={{ boxShadow: "var(--cgi-shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold">Planning et disponibilités</div>
        <Link
          to="/planning"
          className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
        >
          Consulter le planning
        </Link>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1">
        <AccountMiniStat label="Présents" value={String(planning.presentAgents)} />
        <AccountMiniStat label="Indisponibles" value={String(planning.unavailableAgents)} />
        <AccountMiniStat label="Congés" value={String(planning.pendingLeaveRequests)} />
        <AccountMiniStat label="Shifts" value={String(planning.shiftSwapsToProcess)} />
        <AccountMiniStat label="Conflits" value={String(planning.detectedConflicts)} />
      </div>
      <div className="mt-1.5 text-[13px] font-semibold">Activité récente</div>
      <ul className="mt-1 flex-1 space-y-1 overflow-hidden">
        {managerDashboardMock.recentActivity.map((activity) => (
          <li key={activity} className="rounded-xl bg-muted px-2 py-1 text-[10px] text-foreground/80">
            {activity}
          </li>
        ))}
      </ul>
    </div>
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
    <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight md:text-xl">Centre de contrôle</h1>
        <p className="text-[11px] text-muted-foreground">
          Supervisez les incidents, les engagements SLA et l'activité des équipes.
        </p>
        {downloadError ? (
          <p className="text-[11px] text-[color:var(--cgi-red)]">{downloadError}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          to="/users"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
          style={{ background: "var(--cgi-gradient)" }}
        >
          <Plus className="h-3.5 w-3.5" /> Créer un utilisateur
        </Link>
        <Link
          to="/users"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
        >
          Utilisateurs
        </Link>
        <Link
          to="/departments"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
        >
          Departements
        </Link>
        <Link
          to="/sla/policies"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
        >
          SLA
        </Link>
        <Link
          to="/kpi"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80"
        >
          KPI globaux
        </Link>
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport || downloading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" /> {downloading ? "Export..." : "Exporter"}
        </button>
      </div>
    </div>
  );
}

function KpiRow({
  loading,
  users,
  accountSummary,
  departmentSummary,
  bannetteSummary,
  ticketSummary,
}: {
  loading: boolean;
  users: UserProfile[];
  accountSummary: AccountSummary;
  departmentSummary: DepartmentSummary;
  bannetteSummary: BannetteSummary;
  ticketSummary: TicketDashboardSummaryResponse | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
      <KpiCard
        highlight
        title="Utilisateurs"
        value={loading ? "..." : formatMetric(users.length)}
        delta="Profils applicatifs"
      />
      <KpiCard
        title="Comptes actifs"
        value={loading ? "..." : formatMetric(accountSummary.active)}
        delta="Connexion autorisee"
      />
      <KpiCard
        title="Comptes inactifs"
        value={loading ? "..." : formatMetric(accountSummary.inactive)}
        delta="Acces suspendu"
      />
      <KpiCard
        title="Departements"
        value={loading ? "..." : formatMetric(departmentSummary.total)}
        delta={`${formatMetric(departmentSummary.active)} actifs`}
      />
      <KpiCard
        title="Bannettes"
        value={loading ? "..." : formatMetric(bannetteSummary.total)}
        delta="Equipes operationnelles"
      />
      <KpiCard
        title="Tickets"
        value={loading ? "..." : formatMetric(ticketSummary?.totalTickets)}
        delta={`${formatMetric(ticketSummary?.openTickets)} ouverts`}
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
        "relative overflow-hidden rounded-2xl border p-2.5 " +
        (highlight ? "border-transparent text-white" : "border-border/60 bg-white")
      }
      style={{
        background: highlight ? "var(--cgi-gradient)" : undefined,
        boxShadow: highlight ? "0 10px 24px -14px rgba(226,21,67,0.45)" : "var(--cgi-shadow-card)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium opacity-90">{title}</div>
        <span
          className="grid h-5 w-5 place-items-center rounded-full"
          style={{
            background: highlight ? "rgba(255,255,255,0.18)" : "rgba(82,54,152,0.08)",
            color: highlight ? "#fff" : "var(--cgi-purple)",
          }}
        >
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
      <div className="mt-1 text-xl font-bold tracking-tight md:text-2xl">{value}</div>
      <div
        className={
          "mt-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium " +
          (highlight ? "bg-white/15" : "")
        }
        style={
          !highlight
            ? { background: "rgba(82,54,152,0.08)", color: "var(--cgi-purple)" }
            : undefined
        }
      >
        {delta}
      </div>
    </div>
  );
}

function MiddleRow({
  statusChartData,
  criticalTicketCount,
  slaSummary,
  accountSummary,
  urgentTickets,
  loading,
}: {
  statusChartData: { label: string; value: number; color: string }[];
  criticalTicketCount: number;
  slaSummary: SlaDashboardSummaryResponse | null;
  accountSummary: AccountSummary;
  urgentTickets: UrgentTicketDisplay[];
  loading: boolean;
}) {
  return (
    <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-12">
      <div
        className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-6"
        style={{ boxShadow: "var(--cgi-shadow-card)" }}
      >
        <div className="text-[13px] font-semibold">Répartition des tickets par statut</div>
        <div className="mt-1 h-[100px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={statusChartData}
              barCategoryGap={14}
              margin={{ top: 14, left: 0, right: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#8a83a3" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(82,54,152,0.05)" }}
                contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }}
                formatter={(value: number) => [value, "Tickets"]}
              />
              <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                {statusChartData.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{ fontSize: 11, fontWeight: 600, fill: "#3d3557" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <MetricBadge label="Tickets critiques" value={criticalTicketCount} tone="red" />
          <MetricBadge
            label="SLA en risque"
            value={slaSummary?.atRiskTickets ?? 0}
            tone="lavender"
          />
          <MetricBadge
            label="SLA dépassés"
            value={slaSummary?.breachedTickets ?? 0}
            tone="purple"
          />
        </div>
      </div>

      <div
        className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
        style={{ boxShadow: "var(--cgi-shadow-card)" }}
      >
        <div className="text-[13px] font-semibold">Comptes utilisateurs</div>
        <div className="mt-1.5 flex flex-1 items-start gap-2">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-xl"
            style={{ background: "rgba(226,21,67,0.1)", color: "var(--cgi-red)" }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-snug">
              {loading
                ? "Chargement..."
                : `${formatMetric(accountSummary.active)} actifs / ${formatMetric(accountSummary.inactive)} inactifs`}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              ADMIN {formatMetric(accountSummary.byRole.ADMIN)} · MANAGER{" "}
              {formatMetric(accountSummary.byRole.MANAGER)} · EMPLOYEE{" "}
              {formatMetric(accountSummary.byRole.EMPLOYEE)}
            </div>
          </div>
        </div>
        <Link
          to="/users"
          className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[11px] font-semibold text-white"
          style={{ background: "var(--cgi-gradient)" }}
        >
          Consulter <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div
        className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
        style={{ boxShadow: "var(--cgi-shadow-card)" }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold">Tickets prioritaires</div>
          <Link
            to="/tickets"
            className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
          >
            Voir tout
          </Link>
        </div>
        <ul className="mt-1.5 flex-1 space-y-1.5 overflow-hidden">
          {urgentTickets.length === 0 ? (
            <li className="rounded-xl bg-muted px-3 py-3 text-xs text-muted-foreground">
              Aucun ticket prioritaire.
            </li>
          ) : (
            urgentTickets.slice(0, 3).map((ticket) => (
              <li key={ticket.ticketId} className="flex items-start gap-2">
                <TicketBadge
                  tone={
                    ticket.globalStatus === "BREACHED"
                      ? "red"
                      : ticket.globalStatus === "AT_RISK"
                        ? "purple"
                        : "lavender"
                  }
                />
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold leading-tight">
                    {ticket.ticketTitle}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    <span className="font-medium text-foreground/70">{ticket.ticketReference}</span>{" "}
                    · {ticket.priorityLabel} · {ticket.globalStatusLabel}
                    {"teamLabel" in ticket && ticket.teamLabel ? ` · ${ticket.teamLabel}` : ""}
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

function MetricBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "purple" | "lavender";
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: toneBackground[tone], color: toneForeground[tone] }}
    >
      {label} <span className="font-bold">{value}</span>
    </span>
  );
}

function BottomRow({
  employeeWorkload,
  departmentSummary,
  bannetteSummary,
  slaRate,
  nextDeadline,
  loading,
}: {
  employeeWorkload: WorkloadDisplay[];
  departmentSummary: DepartmentSummary;
  bannetteSummary: BannetteSummary;
  slaRate: number | null;
  nextDeadline?: UrgentTicketDisplay;
  loading: boolean;
}) {
  const slaGauge = [{ name: "sla", value: slaRate ?? 0, fill: "url(#slaGrad)" }];
  const globalTeamLoad = employeeWorkload.reduce(
    (total, member) => total + safeNumber(member.totalAssignedTickets),
    0,
  );
  return (
    <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-12">
      <div
        className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-6"
        style={{ boxShadow: "var(--cgi-shadow-card)" }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold">Charge des bannettes</div>
          <Link
            to="/employees"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-1 text-[10px] font-semibold text-foreground/80"
          >
            <Plus className="h-3 w-3" /> Voir les bannettes
          </Link>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <AccountMiniStat
            label="Departements"
            value={loading ? "..." : formatMetric(departmentSummary.total)}
          />
          <AccountMiniStat
            label="Bannettes"
            value={loading ? "..." : formatMetric(bannetteSummary.total)}
          />
          <AccountMiniStat
            label="Tickets actifs"
            value={loading ? "..." : formatMetric(globalTeamLoad)}
          />
        </div>
        <ul className="mt-1.5 flex-1 space-y-1.5 overflow-hidden">
          {employeeWorkload.length === 0 ? (
            <li className="rounded-xl bg-muted px-3 py-3 text-xs text-muted-foreground">
              {loading ? "Chargement de la charge bannette..." : "Aucune charge bannette disponible."}
            </li>
          ) : (
            employeeWorkload.slice(0, 3).map((member) => {
              const workload = getWorkloadPresentation(member.workloadScore);
              const responsibleLabel =
                "responsibleLabel" in member ? member.responsibleLabel : undefined;
              return (
                <li
                  key={`${member.assignedUserId ?? "user"}-${member.assignedUserLabel}`}
                  className="flex items-center gap-2"
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                    style={{ background: "var(--cgi-gradient)" }}
                  >
                    {getInitials(member.assignedUserLabel)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold">
                      {member.assignedUserLabel}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {responsibleLabel ? `Responsable : ${responsibleLabel} · ` : ""}
                      {member.totalAssignedTickets} tickets actifs · {member.criticalTickets} ticket critique
                    </div>
                  </div>
                  <WorkloadBadge status={workload.status} tone={workload.tone} />
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div
        className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-white p-2.5 lg:col-span-3"
        style={{ boxShadow: "var(--cgi-shadow-card)" }}
      >
        <div className="text-[13px] font-semibold">Respect des SLA</div>
        <div className="relative mx-auto mt-1 h-[95px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="90%"
              innerRadius={44}
              outerRadius={68}
              startAngle={180}
              endAngle={0}
              data={slaGauge}
            >
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
          <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
            <div className="text-xl font-bold tracking-tight">
              {slaRate === null ? "Non calculé" : `${slaRate} %`}
            </div>
            <div className="text-[10px] text-muted-foreground">SLA respectés</div>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px]">
          <Legend color="var(--cgi-purple)" label="Respectés" />
          <Legend color="var(--cgi-lavender)" label="En risque" />
          <Legend color="var(--cgi-red)" label="Dépassés" />
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl p-2.5 text-white lg:col-span-3"
        style={{ background: "var(--cgi-gradient-dark)" }}
      >
        <div className="text-xs font-semibold opacity-90">Prochaine échéance SLA</div>
        <div className="mt-1.5 text-xl font-bold tracking-tight tabular-nums">
          {nextDeadline ? nextDeadline.ticketReference : "--"}
        </div>
        <div className="mt-1 text-[10px] opacity-80">
          {nextDeadline
            ? `${nextDeadline.ticketTitle} · ${nextDeadline.priorityLabel} · ${nextDeadline.globalStatusLabel} · ${formatRemainingMinutes(nextDeadline.remainingMinutes)} · ${
                "teamLabel" in nextDeadline && nextDeadline.teamLabel
                  ? nextDeadline.teamLabel
                  : ""
              }`
            : "Aucune échéance prioritaire"}
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[color:var(--cgi-purple)]"
          >
            <Eye className="h-3 w-3" /> Voir le ticket
          </Link>
          <Link
            to="/sla/policies"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-2.5 py-1 text-[10px] font-semibold text-white"
          >
            <ExternalLink className="h-3 w-3" /> Voir les SLA
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

function AccountMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-2.5 py-2">
      <div className="truncate text-[10px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
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
    <div
      className="mt-5 rounded-2xl border border-border/60 bg-white p-5 text-sm text-muted-foreground"
      style={{ boxShadow: "var(--cgi-shadow-card)" }}
    >
      {message}
    </div>
  );
}

interface AccountSummary {
  active: number;
  inactive: number;
  byRole: Record<Role, number>;
}

interface DepartmentSummary {
  total: number;
  active: number;
  employeesByDepartment: { name: string; count: number }[];
}

interface BannetteSummary {
  total: number;
}

function getAccountSummary(users: UserProfile[]): AccountSummary {
  const byRole: Record<Role, number> = { ADMIN: 0, MANAGER: 0, EMPLOYEE: 0 };
  let active = 0;

  users.forEach((user) => {
    if (user.role in byRole) {
      byRole[user.role] += 1;
    }
    if (user.active && user.accountStatus !== "INACTIVE") {
      active += 1;
    }
  });

  return {
    active,
    inactive: Math.max(0, users.length - active),
    byRole,
  };
}

function getDepartmentSummary(departments: Department[], employees: Employee[]): DepartmentSummary {
  const employeesByDepartment = Array.from(
    employees.reduce((accumulator, employee) => {
      const name = normalizeLabel(employee.department, "Non renseigne");
      accumulator.set(name, (accumulator.get(name) ?? 0) + 1);
      return accumulator;
    }, new Map<string, number>()),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

  return {
    total: departments.length,
    active: departments.filter((department) => department.active).length,
    employeesByDepartment,
  };
}

function getBannetteSummary(employees: Employee[]): BannetteSummary {
  const bannettes = new Set(
    employees
      .map((employee) => normalizeLabel(employee.bannette, ""))
      .filter((value) => value.length > 0),
  );

  return { total: bannettes.size };
}

function countCriticalTickets(tickets: TicketResponse[]) {
  return tickets.filter((ticket) => ticket.criticality === "CRITICAL").length;
}

const STATUS_CHART_ORDER: { status: TicketStatusDistributionResponse["status"]; label: string }[] =
  [
    { status: "TODO", label: "À faire" },
    { status: "ASSIGNED", label: "Affectés" },
    { status: "IN_PROGRESS", label: "En cours" },
    { status: "RESOLVED", label: "Résolus" },
    { status: "CLOSED", label: "Fermés" },
  ];

function buildStatusChartData(statusDistribution: TicketStatusDistributionResponse[]) {
  const byStatus = new Map(statusDistribution.map((entry) => [entry.status, entry.count]));
  return STATUS_CHART_ORDER.map((entry, index) => ({
    label: entry.label,
    value: byStatus.get(entry.status) ?? 0,
    color: STATUS_BAR_COLORS[index % STATUS_BAR_COLORS.length],
  }));
}

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function safeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatMetric(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Aucune donnée";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
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

function formatRemainingMinutes(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "Delai indisponible";
  }
  return `${Math.max(0, Math.round(minutes))} minutes restantes`;
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
