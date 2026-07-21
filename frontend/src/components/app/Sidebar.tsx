import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutDashboard,
  MessageSquareText,
  Sparkles,
  Ticket,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import logoUrl from "../../../images/logo.png?url";
import compactLogoUrl from "../../../images/LOGO2.png?url";
import { getUnreadCount } from "@/lib/api/messages";
import { getBusinessRoleLabel, useAuth, type Role } from "@/lib/auth-store";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  { label: "Employes", icon: Users, to: "/employees", enabled: true },
  { label: "Planning", icon: Calendar, to: "/planning", enabled: true },
  { label: "Notifications", icon: Bell, to: "/dashboard", enabled: false },
  { label: "Messagerie", icon: MessageSquareText, to: "/messages", enabled: true },
  { label: "Indicateurs KPI", icon: BarChart3, to: "/dashboard", enabled: false },
];

export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onMobileOpenChange,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) {
  const content = <SidebarContent collapsed={collapsed} onNavigate={() => undefined} />;

  return (
    <>
      <aside
        data-testid="app-sidebar"
        data-collapsed={collapsed ? "true" : "false"}
        className={`hidden shrink-0 flex-col border-r border-border/60 bg-white transition-[width] duration-200 ease-out lg:flex ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <SidebarContent collapsed={collapsed} onNavigate={() => undefined} />
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Developper le menu" : "Reduire le menu"}
          className="m-3 mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/70 bg-white text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.24_300)]"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed ? <span>Reduire</span> : null}
        </button>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[300px] bg-white p-0 sm:max-w-[320px] lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu principal</SheetTitle>
            <SheetDescription>Navigation principale CGI-Intranet</SheetDescription>
          </SheetHeader>
          <SidebarContent collapsed={false} onNavigate={() => onMobileOpenChange?.(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasRole, authenticatedFetch, isAuthenticated, isReady, fullName, email, roles } = useAuth();
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const isAdmin = hasRole("ADMIN");
  const isManager = hasRole("MANAGER");
  const canManageEmployees = isAdmin || isManager;
  const isEmployee = hasRole("EMPLOYEE") && !canManageEmployees;

  const menuGroups = useMemo<MenuGroup[]>(() => {
    const filteredBaseMenu = baseMenu
      .filter((item) => {
        if (item.to === "/sla/policies" || item.to === "/planning") {
          return canManageEmployees;
        }
        return item.enabled || item.label === "Notifications" || item.label === "Indicateurs KPI";
      })
      .map((item) =>
        item.to === "/employees" && isEmployee
          ? { ...item, to: "/my-profile" as const, label: "Profil", icon: UserRound }
          : item,
      );

    return [
      {
        title: "Pilotage",
        items: filteredBaseMenu.filter(
          (item) => item.to === "/dashboard" || item.label === "Indicateurs KPI",
        ),
      },
      {
        title: "Operations",
        items: filteredBaseMenu.filter((item) =>
          ["/tickets", "/sla/policies", "/planning", "/employees", "/my-profile"].includes(item.to),
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
                  label: "Departements",
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
  }, [canManageEmployees, isAdmin, isEmployee, isManager]);

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
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={`flex h-16 items-center border-b border-border/60 ${
            collapsed ? "justify-center px-3" : "justify-center px-5"
          }`}
        >
          <Link
            to="/dashboard"
            aria-label="Retour au tableau de bord"
            onClick={onNavigate}
            className="inline-flex max-w-full items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.24_300)] focus-visible:ring-offset-2"
          >
            <img
              src={collapsed ? compactLogoUrl : logoUrl}
              alt="CGI-Intranet"
              className={collapsed ? "h-9 w-11 object-contain" : "h-9 max-w-[150px] object-contain"}
            />
          </Link>
        </div>

        {!collapsed ? (
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
        ) : null}

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
          {menuGroups.map((group) => (
            <div key={group.title} className="mb-5">
              {!collapsed ? (
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </div>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarNavItem
                    key={`${group.title}-${item.label}`}
                    item={item}
                    active={(pathname === item.to || pathname.startsWith(`${item.to}/`)) && item.enabled}
                    collapsed={collapsed}
                    messagesUnreadCount={messagesUnreadCount}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
}

function SidebarNavItem({
  item,
  active,
  collapsed,
  messagesUnreadCount,
  onNavigate,
}: {
  item: MenuItem;
  active: boolean;
  collapsed: boolean;
  messagesUnreadCount: number;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const cls = `group flex items-center rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.24_300)] ${
    collapsed ? "h-11 justify-center px-0" : "gap-2.5 px-2.5 py-2"
  } ${
    active
      ? "bg-gradient-cgi-soft text-foreground"
      : item.enabled
        ? "text-muted-foreground hover:bg-muted hover:text-foreground"
        : "cursor-not-allowed text-muted-foreground/50"
  }`;
  const content = (
    <>
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[oklch(0.5_0.22_300)]" : ""}`} />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
      {item.to === "/messages" && messagesUnreadCount > 0 ? (
        <span
          className={
            collapsed
              ? "absolute right-1.5 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-gradient-cgi px-1 text-[9px] font-medium text-white"
              : "ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-gradient-cgi px-1.5 text-[10px] font-medium text-white"
          }
        >
          {messagesUnreadCount > 9 ? "9+" : messagesUnreadCount}
        </span>
      ) : active && !collapsed ? (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-cgi" />
      ) : null}
    </>
  );

  const node = item.enabled ? (
    <Link
      to={item.to}
      className={`relative ${cls}`}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      {content}
    </Link>
  ) : (
    <div className={`relative ${cls}`} aria-disabled="true" title={collapsed ? item.label : undefined}>
      {content}
    </div>
  );

  return (
    <li>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{node}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      ) : (
        node
      )}
    </li>
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
