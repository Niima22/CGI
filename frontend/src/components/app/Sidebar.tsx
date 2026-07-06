import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  Clock,
  Sparkles,
  BookOpen,
  Users,
  Calendar,
  Bus,
  Bell,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  UserRound,
  Building2,
} from "lucide-react";
import { getUnreadCount } from "@/lib/api/messages";
import { useAuth } from "@/lib/auth-store";

const logoUrl = "/images/logo.png";

const baseMenu = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" as const, enabled: true },
  { label: "Gestion des incidents", icon: Ticket, to: "/tickets" as const, enabled: true },
  { label: "Suivi des SLA", icon: Clock, to: "/sla/policies" as const, enabled: true },
  { label: "Quality Lab IA", icon: Sparkles, to: "/quality-lab" as const, enabled: true },
  { label: "Base de connaissances", icon: BookOpen, to: "/dashboard" as const, enabled: false },
  { label: "Employés", icon: Users, to: "/employees" as const, enabled: true },
  { label: "Planning", icon: Calendar, to: "/planning" as const, enabled: true },
  { label: "Transport", icon: Bus, to: "/dashboard" as const, enabled: false },
  { label: "Notifications", icon: Bell, to: "/dashboard" as const, enabled: false },
  { label: "Messagerie", icon: MessageSquare, to: "/messages" as const, enabled: true },
  { label: "KPI / Reporting", icon: BarChart3, to: "/dashboard" as const, enabled: false },
  { label: "Paramètres", icon: Settings, to: "/dashboard" as const, enabled: false },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { logout, hasRole, authenticatedFetch, isAuthenticated, isReady } = useAuth();
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const isAdmin = hasRole("ADMIN");
  const isManager = hasRole("MANAGER");
  const canManageEmployees = isAdmin || isManager;
  const isEmployee = hasRole("EMPLOYEE") && !canManageEmployees;
  const employeeMenu = baseMenu
    .filter((item) => {
      if (item.to === "/sla/policies") {
        return canManageEmployees;
      }
      if (item.to === "/planning") {
        return canManageEmployees;
      }
      if (item.to === "/employees") {
        return true;
      }
      return item.enabled;
    })
    .map((item) =>
      item.to === "/employees"
        ? {
            ...item,
            to: isEmployee ? ("/my-profile" as const) : item.to,
            label: isEmployee ? "Mon profil" : "Disponibilité équipe",
            icon: isEmployee ? UserRound : item.icon,
          }
        : item,
    );
  const menu = [
    ...employeeMenu,
    ...(isManager
      ? [{ label: "Gestion d'équipe", icon: Users, to: "/employees" as const, enabled: true }]
      : []),
    ...(isAdmin
      ? [
          { label: "Départements", icon: Building2, to: "/departments" as const, enabled: true },
          {
            label: "Gestion des utilisateurs",
            icon: Settings,
            to: "/users" as const,
            enabled: true,
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      setMessagesUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function refreshUnread() {
      try {
        const response = await getUnreadCount(authenticatedFetch);
        if (!cancelled) {
          setMessagesUnreadCount(response.unreadCount);
        }
      } catch {
        if (!cancelled) {
          setMessagesUnreadCount(0);
        }
      }
    }

    void refreshUnread();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshUnread();
      }
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authenticatedFetch, isAuthenticated, isReady]);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border/70 bg-sidebar/95 lg:flex">
      <div className="flex items-center justify-center border-b border-sidebar-border/70 px-6 py-5">
        <Link
          to="/dashboard"
          aria-label="Go to dashboard"
          className="flex h-11 w-24 items-center justify-center rounded-xl border border-border/80 bg-white px-4 py-2 shadow-card transition hover:border-primary/20"
        >
          <img src={logoUrl} alt="CGI" className="max-h-6 w-full object-contain" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menu.map((item) => {
          const active = (pathname === item.to || pathname.startsWith(`${item.to}/`)) && item.enabled;
          const Icon = item.icon;
          const base =
            "group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";
          const cls = active
            ? `${base} border border-primary/15 bg-primary/8 text-primary`
            : item.enabled
              ? `${base} text-sidebar-foreground hover:bg-sidebar-accent/80`
              : `${base} text-muted-foreground/50 cursor-not-allowed`;

          if (!item.enabled) {
            return (
              <div key={item.label} className={cls}>
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </div>
            );
          }
          return (
            <Link key={item.label} to={item.to} className={cls}>
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
              {item.to === "/messages" && messagesUnreadCount > 0 ? (
                <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-white">
                  {messagesUnreadCount > 9 ? "9+" : messagesUnreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}

        <button
          onClick={() => {
            void logout();
          }}
          className="mt-5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </nav>
    </aside>
  );
}
