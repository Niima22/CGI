import { type ReactNode } from "react";
import {
  LayoutDashboard,
  Ticket,
  Calendar,
  Gauge,
  BarChart3,
  Users,
  UserCog,
  Building2,
  ShieldCheck,
  Sparkles,
  Bell,
  MessageSquare,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const groups = [
  {
    label: "Pilotage",
    items: [
      { icon: LayoutDashboard, label: "Centre de contrôle" },
      { icon: Ticket, label: "Tickets", active: true, count: 24 },
      { icon: Calendar, label: "Planning" },
      { icon: Gauge, label: "SLA" },
      { icon: BarChart3, label: "Rapports" },
      { icon: Users, label: "Équipe" },
    ],
  },
  {
    label: "Administration",
    items: [
      { icon: UserCog, label: "Utilisateurs" },
      { icon: Users, label: "Employés" },
      { icon: Building2, label: "Départements" },
      { icon: ShieldCheck, label: "Politiques SLA" },
    ],
  },
  {
    label: "Outils",
    items: [
      { icon: Sparkles, label: "Quality Lab IA" },
      { icon: Bell, label: "Notifications" },
      { icon: MessageSquare, label: "Messagerie" },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f5f9] text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white lg:flex">
          <div className="flex h-16 items-center gap-2 px-5">
            <div
              className="grid h-9 w-9 place-items-center rounded-lg text-white font-bold text-sm"
              style={{ background: "var(--gradient-cgi)" }}
            >
              CGI
            </div>
            <span className="text-sm font-semibold tracking-tight">CGI-Intranet</span>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-6">
            {groups.map((g) => (
              <div key={g.label} className="mt-4">
                <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {g.label}
                </div>
                <ul className="space-y-0.5">
                  {g.items.map((it) => {
                    const Icon = it.icon;
                    const active = "active" in it && it.active;
                    return (
                      <li key={it.label}>
                        <a
                          href="#"
                          className={
                            "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors " +
                            (active
                              ? "text-white shadow-sm"
                              : "text-foreground/70 hover:bg-muted hover:text-foreground")
                          }
                          style={
                            active
                              ? { background: "var(--gradient-cgi)" }
                              : undefined
                          }
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            {it.label}
                          </span>
                          {"count" in it && it.count ? (
                            <span
                              className={
                                "rounded-md px-1.5 py-0.5 text-[10px] font-semibold " +
                                (active
                                  ? "bg-white/20 text-white"
                                  : "bg-muted text-muted-foreground")
                              }
                            >
                              {it.count}
                            </span>
                          ) : null}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-white/80 px-4 backdrop-blur md:px-6">
            <div className="relative flex-1 max-w-2xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un ticket, un utilisateur…"
                className="h-10 rounded-full border-transparent bg-muted pl-9"
              />
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground">
              <MessageSquare className="h-4 w-4" />
            </button>
            <button className="relative grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: "var(--cgi-red)" }} />
            </button>
            <div className="hidden items-center gap-3 pl-2 md:flex">
              <div
                className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ background: "var(--gradient-cgi)" }}
              >
                MP
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Mehdi Pilote</div>
                <div className="text-xs text-muted-foreground">mehdi.pilote@cgi.com</div>
              </div>
              <Badge variant="secondary" className="ml-1">Pilote</Badge>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}