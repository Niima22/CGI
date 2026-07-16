import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ElementType } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Clock,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  Ticket,
  UserCog,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";
import { getUnreadCount } from "@/lib/api/messages";
import { getBusinessRoleLabel, useAuth, type Role } from "@/lib/auth-store";

type MenuItem = {
  label: string;
  icon: ElementType;
  to:
    | "/dashboard"
    | "/tickets"
    | "/sla/policies"
    | "/quality-lab"
    | "/employees"
    | "/planning"
    | "/planning-view"
    | "/messages"
    | "/my-profile"
    | "/departments"
    | "/users";
  enabled: boolean;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

const baseMenu: MenuItem[] = [
  { label: "Tableau de bord", icon: LayoutDashboard, to: "/dashboard", enabled: true },
  { label: "Tickets", icon: Ticket, to: "/tickets", enabled: true },
  { label: "SLA", icon: Clock, to: "/sla/policies", enabled: true },
  { label: "Quality Lab IA", icon: Sparkles, to: "/quality-lab", enabled: true },
  { label: "Employés", icon: Users, to: "/employees", enabled: true },
  { label: "Planning", icon: Calendar, to: "/planning", enabled: true },
  { label: "Notifications", icon: Bell, to: "/dashboard", enabled: false },
  { label: "Messagerie", icon: MessageSquare, to: "/messages", enabled: true },
  { label: "Indicateurs KPI", icon: BarChart3, to: "/dashboard", enabled: false },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { logout, hasRole, authenticatedFetch, isAuthenticated, isReady, fullName, email, roles } =
    useAuth();
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const isAdmin = hasRole("ADMIN");
  const isManager = hasRole("MANAGER");
  const canManageEmployees = isAdmin || isManager;
  const isEmployee = hasRole("EMPLOYEE") && !canManageEmployees;

  const filteredBaseMenu = baseMenu
    .filter((item) => {
      if (item.to === "/sla/policies" || item.to === "/planning") {
        return canManageEmployees || isEmployee;
      }
      return item.enabled || item.label === "Notifications" || item.label === "Indicateurs KPI";
    })
    .map((item) =>
      item.to === "/employees" && isEmployee
        ? { ...item, to: "/my-profile" as const, label: "Profil", icon: UserRound }
        : item.to === "/planning" && isEmployee
          ? { ...item, to: "/planning-view" as const }
          : item,
    );

  const menuGroups: MenuGroup[] = [
    {
      title: "Pilotage",
      items: filteredBaseMenu.filter(
        (item) => item.to === "/dashboard" || item.label === "Indicateurs KPI",
      ),
    },
    {
      title: "Opérations",
      items: filteredBaseMenu.filter((item) =>
        ["/tickets", "/sla/policies", "/planning", "/planning-view", "/employees", "/my-profile"].includes(item.to),
      ),
    },
    {
      title: "Collaboration",
      items: filteredBaseMenu.filter(
        (item) => ["/messages", "/quality-lab"].includes(item.to) || item.label === "Notifications",
      ),
    },
    {
      title: "Administration",
      items: [
        ...(isManager
          ? [{ label: "Utilisateurs", icon: Users, to: "/employees" as const, enabled: true }]
          : []),
        ...(isAdmin
          ? [
              {
                label: "Départements",
                icon: Building2,
                to: "/departments" as const,
                enabled: true,
              },
              { label: "Administration", icon: UserCog, to: "/users" as const, enabled: true },
            ]
          : []),
      ],
    },
  ].filter((group) => group.items.length > 0);

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

  const roleLabel = roles
    .filter((role): role is Role => ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role))
    .map(getBusinessRoleLabel)
    .join(", ");

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border/60 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-cgi text-white shadow-soft">
          <Workflow className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-normal">CGI-FLOW</div>
          <div className="truncate text-[11px] text-muted-foreground">Intranet opérations</div>
        </div>
      </div>

      <div className="border-b border-border/60 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-cgi text-sm font-semibold text-white shadow-soft">
            {getInitials(fullName, email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {fullName ?? email ?? "Utilisateur"}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {roleLabel || "Compte CGI"}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-5">
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  (pathname === item.to || pathname.startsWith(`${item.to}/`)) && item.enabled;
                const Icon = item.icon;
                const cls = `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-gradient-cgi-soft text-foreground"
                    : item.enabled
                      ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                      : "cursor-not-allowed text-muted-foreground/50"
                }`;
                const content = (
                  <>
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? "text-[oklch(0.5_0.22_300)]" : ""}`}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.to === "/messages" && messagesUnreadCount > 0 ? (
                      <span className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-gradient-cgi px-1.5 text-[10px] font-medium text-white">
                        {messagesUnreadCount > 9 ? "9+" : messagesUnreadCount}
                      </span>
                    ) : active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-cgi" />
                    ) : null}
                  </>
                );

                return (
                  <li key={`${group.title}-${item.label}`}>
                    {item.enabled ? (
                      <Link to={item.to} className={cls}>
                        {content}
                      </Link>
                    ) : (
                      <div className={cls}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <button
          type="button"
          onClick={() => {
            void logout();
          }}
          className="mt-5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </nav>
    </aside>
  );
}

function getInitials(fullName?: string | null, email?: string | null) {
  const source = (fullName?.trim() || email?.trim() || "U").replace(/\s+/g, " ");
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? "U"}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
