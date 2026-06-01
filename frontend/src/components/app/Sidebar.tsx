import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";

const menu = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" as const, enabled: true },
  { label: "Gestion des incidents", icon: Ticket, to: "/dashboard" as const, enabled: false },
  { label: "Suivi SLA", icon: Clock, to: "/dashboard" as const, enabled: false },
  { label: "Quality Lab IA", icon: Sparkles, to: "/quality-lab" as const, enabled: true },
  { label: "Base de connaissances", icon: BookOpen, to: "/dashboard" as const, enabled: false },
  { label: "Employés", icon: Users, to: "/dashboard" as const, enabled: false },
  { label: "Planning", icon: Calendar, to: "/dashboard" as const, enabled: false },
  { label: "Transport", icon: Bus, to: "/dashboard" as const, enabled: false },
  { label: "Notifications", icon: Bell, to: "/dashboard" as const, enabled: false },
  { label: "Messagerie", icon: MessageSquare, to: "/dashboard" as const, enabled: false },
  { label: "KPI / Reporting", icon: BarChart3, to: "/dashboard" as const, enabled: false },
  { label: "Paramètres", icon: Settings, to: "/dashboard" as const, enabled: false },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="h-10 w-10 rounded-xl bg-cgi-gradient flex items-center justify-center shadow-glow">
          <span className="text-white font-bold text-sm tracking-tight">CGI</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">CGI Intranet</div>
          <div className="text-xs text-muted-foreground">Enterprise Suite</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menu.map((item) => {
          const active = pathname === item.to && item.enabled;
          const Icon = item.icon;
          const base =
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all";
          const cls = active
            ? `${base} bg-cgi-gradient text-white shadow-glow`
            : item.enabled
            ? `${base} text-sidebar-foreground hover:bg-sidebar-accent`
            : `${base} text-muted-foreground/60 cursor-not-allowed`;

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
            </Link>
          );
        })}

        <button
          onClick={() => {
            logout();
            navigate({ to: "/" });
          }}
          className="mt-4 w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </nav>
    </aside>
  );
}
