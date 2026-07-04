import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Ticket,
  Clock,
  Sparkles,
  BookOpen,
  Users,
  Calendar,
  CalendarCheck,
  Bus,
  Bell,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { useSidebarState } from "@/lib/sidebar-store";

const logoUrl = "/images/logo.png";

const baseMenu = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" as const, enabled: true },
  { label: "Gestion des incidents", icon: Ticket, to: "/dashboard" as const, enabled: false },
  { label: "Suivi SLA", icon: Clock, to: "/dashboard" as const, enabled: false },
  { label: "Quality Lab IA", icon: Sparkles, to: "/quality-lab" as const, enabled: true },
  { label: "Base de connaissances", icon: BookOpen, to: "/dashboard" as const, enabled: false },
  { label: "Employés", icon: Users, to: "/dashboard" as const, enabled: false },
  { label: "Transport", icon: Bus, to: "/dashboard" as const, enabled: false },
  { label: "Notifications", icon: Bell, to: "/dashboard" as const, enabled: false },
  { label: "Messagerie", icon: MessageSquare, to: "/dashboard" as const, enabled: false },
  { label: "KPI / Reporting", icon: BarChart3, to: "/dashboard" as const, enabled: false },
  { label: "Paramètres", icon: Settings, to: "/dashboard" as const, enabled: false },
];

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebarState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { logout, hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const isManager = isAdmin || hasRole("MANAGER");
  const menu = [
    ...baseMenu,
    ...(isManager
      ? [{ label: "Générer le planning", icon: Calendar, to: "/planning" as const, enabled: true }]
      : []),
    { label: "Voir le planning", icon: CalendarCheck, to: "/planning-view" as const, enabled: true },
    ...(isManager
      ? [{ label: "Gestion d'equipe", icon: Users, to: "/dashboard" as const, enabled: false }]
      : []),
    ...(isAdmin
      ? [
          {
            label: "Gestion des utilisateurs",
            icon: Settings,
            to: "/users" as const,
            enabled: true,
          },
          { label: "Ajouter un utilisateur", icon: UserPlus, to: "/users" as const, enabled: true },
        ]
      : []),
  ];

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-300 lg:flex ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div
        className={`flex items-center justify-center border-b border-border py-5 ${
          isCollapsed ? "px-3" : "px-6"
        }`}
      >
        <button
          type="button"
          aria-label={isCollapsed ? "Développer la barre latérale" : "Réduire la barre latérale"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Développer la barre latérale" : "Réduire la barre latérale"}
          onClick={toggle}
          className={`flex h-12 items-center justify-center rounded-xl border border-border/80 bg-white py-2 shadow-card transition hover:shadow-glow ${
            isCollapsed ? "w-12 px-2" : "w-24 px-4"
          }`}
        >
          <img src={logoUrl} alt="CGI" className="max-h-6 w-full object-contain" />
        </button>
      </div>

      <nav className={`flex-1 space-y-1 overflow-y-auto py-4 ${isCollapsed ? "px-2" : "px-3"}`}>
        {menu.map((item) => {
          const active = pathname === item.to && item.enabled;
          const Icon = item.icon;
          const base =
            "group flex items-center rounded-xl py-2.5 text-sm font-medium transition-all";
          const layout = isCollapsed ? "justify-center px-2" : "gap-3 px-3";
          const cls = active
            ? `${base} ${layout} bg-cgi-gradient text-white shadow-glow`
            : item.enabled
              ? `${base} ${layout} text-sidebar-foreground hover:bg-sidebar-accent`
              : `${base} ${layout} cursor-not-allowed text-muted-foreground/60`;

          if (!item.enabled) {
            return (
              <div key={item.label} className={cls} title={isCollapsed ? item.label : undefined}>
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>
            );
          }
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cls}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        <button
          onClick={() => {
            void logout();
          }}
          title={isCollapsed ? "Déconnexion" : undefined}
          className={`mt-4 flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground transition-all hover:bg-sidebar-accent ${
            isCollapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && "Déconnexion"}
        </button>
      </nav>
    </aside>
  );
}
