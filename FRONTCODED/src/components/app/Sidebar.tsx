import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties, type ElementType } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  GaugeCircle,
  LayoutGrid,
  MessageSquare,
  Sparkles,
  Ticket,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import { getTicketDashboardSummary } from "@/lib/api/tickets";
import { useAuth } from "@/lib/auth-store";
import cgiLogo from "../../../Images/logo.png";

type MenuItem = {
  label: string;
  icon: ElementType;
  to?:
    | "/dashboard"
    | "/kpi"
    | "/tickets"
    | "/quality-lab"
    | "/employees"
    | "/planning"
    | "/planning-view"
    | "/sla/policies"
    | "/messages"
    | "/departments"
    | "/users"
    | "/my-profile";
  badge?: string;
};

const sidebarTheme = {
  "--background": "oklch(0.97 0.005 280)",
  "--foreground": "oklch(0.19 0.03 285)",
  "--muted": "oklch(0.955 0.008 290)",
  "--muted-foreground": "oklch(0.5 0.03 285)",
  "--border": "oklch(0.92 0.01 285)",
  "--cgi-red": "#E21543",
  "--cgi-purple": "#523698",
  "--cgi-lavender": "#A48CC5",
  "--cgi-gradient": "linear-gradient(135deg, #E21543 0%, #A94E89 45%, #523698 100%)",
  "--cgi-gradient-dark": "linear-gradient(145deg, #721B4C 0%, #523698 55%, #241347 100%)",
} as CSSProperties;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasRole, authenticatedFetch, isAuthenticated, isReady } = useAuth();
  const [openTickets, setOpenTickets] = useState<number | null>(null);
  const canManage = hasRole("ADMIN") || hasRole("MANAGER");
  const isPilote = hasRole("ADMIN");
  const isSuperviseur = hasRole("MANAGER") && !isPilote;
  const isEmployee = hasRole("EMPLOYEE") && !isPilote && !isSuperviseur;

  useEffect(() => {
    if (!isReady || !isAuthenticated || !canManage) {
      setOpenTickets(null);
      return;
    }

    let cancelled = false;

    async function refreshTickets() {
      try {
        const summary = await getTicketDashboardSummary(authenticatedFetch);
        if (!cancelled) {
          setOpenTickets(summary.openTickets);
        }
      } catch {
        if (!cancelled) {
          setOpenTickets(null);
        }
      }
    }

    void refreshTickets();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshTickets();
      }
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authenticatedFetch, canManage, isAuthenticated, isReady]);

  const employeeNav = [
    {
      label: "ESPACE PERSONNEL",
      items: [
        { icon: LayoutGrid, label: "Tableau de bord", to: "/dashboard" },
        { icon: Ticket, label: "Mes tickets", to: "/tickets" },
        { icon: CalendarDays, label: "Mon planning", to: "/planning-view" },
        { icon: Bell, label: "Notifications", to: "/dashboard" },
      ],
    },
    {
      label: "OUTILS",
      items: [
        { icon: Sparkles, label: "Quality Lab IA", to: "/quality-lab" },
        { icon: MessageSquare, label: "Messagerie", to: "/messages" },
        { icon: UserRound, label: "Mon profil", to: "/my-profile" },
      ],
    },
  ] satisfies { label: string; items: MenuItem[] }[];

  const staffNav = [
    {
      label: "PILOTAGE",
      items: isSuperviseur
        ? [
            { icon: LayoutGrid, label: "Centre de controle", to: "/dashboard" },
            { icon: BarChart3, label: "Indicateurs KPI", to: "/kpi" },
            {
              icon: Ticket,
              label: "Tickets",
              to: "/tickets",
              badge: formatCompact(openTickets),
            },
            { icon: CalendarDays, label: "Planning", to: "/planning" },
            { icon: GaugeCircle, label: "SLA", to: "/sla/policies" },
            { icon: Users, label: "Agents", to: "/employees" },
            { icon: Users, label: "Bannettes", to: "/employees" },
          ]
        : [
            { icon: LayoutGrid, label: "Centre de controle", to: "/dashboard" },
            { icon: BarChart3, label: "Indicateurs KPI", to: "/kpi" },
            {
              icon: Ticket,
              label: "Tickets",
              to: "/tickets",
              badge: formatCompact(openTickets),
            },
            {
              icon: CalendarDays,
              label: "Planning",
              to: canManage ? "/planning" : "/planning-view",
            },
            { icon: GaugeCircle, label: "SLA", to: "/sla/policies" },
            { icon: Users, label: "Bannettes", to: "/employees" },
          ],
    },
    ...(isSuperviseur
      ? []
      : [
          {
            label: "ADMINISTRATION",
            items: [
              { icon: UserCog, label: "Utilisateurs", to: "/users" },
              { icon: Building2, label: "Departements", to: "/departments" },
            ],
          },
        ]),
    {
      label: "OUTILS",
      items: isPilote
        ? [{ icon: MessageSquare, label: "Messagerie", to: "/messages" }]
        : [
            { icon: Bell, label: "Notifications", to: "/dashboard" },
            { icon: Sparkles, label: "Quality Lab IA", to: "/quality-lab" },
            { icon: MessageSquare, label: "Messagerie", to: "/messages" },
          ],
    },
  ] satisfies { label: string; items: MenuItem[] }[];

  const nav = isEmployee ? employeeNav : staffNav;

  return (
    <aside
      className="hidden w-[260px] shrink-0 flex-col border-r border-border/60 bg-white px-4 py-5 lg:flex"
      style={sidebarTheme}
    >
      <div className="flex justify-center px-2">
        <img src={cgiLogo} alt="CGI" className="h-20 w-36 object-contain" />
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-hidden pr-1">
        {nav.map((section) => (
          <div key={section.label}>
            <div className="px-2 pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.label} className="relative">
                    {active ? (
                      <span
                        className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r"
                        style={{ background: "var(--cgi-gradient)" }}
                      />
                    ) : null}
                    <Link
                      to={item.to ?? "/dashboard"}
                      className={
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors " +
                        (active
                          ? "text-white"
                          : "text-foreground/75 hover:bg-muted hover:text-foreground")
                      }
                      style={active ? { background: "var(--cgi-gradient)" } : undefined}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      {item.badge ? (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: active ? "rgba(255,255,255,0.22)" : "rgba(82,54,152,0.1)",
                            color: active ? "#fff" : "var(--cgi-purple)",
                          }}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function isActive(pathname: string, item: MenuItem) {
  if (!item.to) {
    return false;
  }
  if (item.label === "Notifications") {
    return false;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function formatCompact(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) {
    return undefined;
  }
  return value > 99 ? "99+" : new Intl.NumberFormat("fr-FR").format(value);
}
