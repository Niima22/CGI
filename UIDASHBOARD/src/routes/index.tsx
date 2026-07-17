import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutGrid, Ticket, CalendarDays, GaugeCircle, FileBarChart2, Users,
  UserCog, Building2, Shield, Sparkles, Bell, MessageSquare, Settings,
  HelpCircle, LogOut, Search, ArrowUpRight, Plus, Download, ExternalLink,
  AlertTriangle, ChevronRight, Activity, Eye,
} from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import cgiLogo from "@/assets/cgi-logo.png";

export const Route = createFileRoute("/")({
  component: PiloteDashboard,
});

/* ---------- Sample data (UI mockup) ---------- */
const activityData = [
  { day: "L", value: 42 },
  { day: "M", value: 58 },
  { day: "M", value: 74, highlight: true },
  { day: "J", value: 61 },
  { day: "V", value: 48 },
  { day: "S", value: 22 },
  { day: "D", value: 18 },
];
const priorityTickets = [
  { id: "INC-1042", title: "Accès VPN impossible", meta: "Critique · SLA en risque", tone: "red" },
  { id: "INC-1039", title: "Erreur de synchronisation AD", meta: "Haute · Sara El Amrani", tone: "purple" },
  { id: "INC-1036", title: "Imprimante étage 3 hors ligne", meta: "Moyenne · Non affecté", tone: "lavender" },
  { id: "INC-1031", title: "Lenteur ERP module RH", meta: "Haute · Youssef Karim", tone: "burgundy" },
  { id: "INC-1028", title: "Boîte mail saturée — direction", meta: "Moyenne · Amine Zeroual", tone: "pink" },
];
const team = [
  { name: "Sara El Amrani", dept: "Support N1", tickets: 8, status: "Chargée", tone: "orange", initials: "SE" },
  { name: "Youssef Karim", dept: "Infrastructure", tickets: 3, status: "Disponible", tone: "green", initials: "YK" },
  { name: "Amine Zeroual", dept: "Réseaux", tickets: 11, status: "Surchargée", tone: "red", initials: "AZ" },
  { name: "Nadia Bensalem", dept: "Support N2", tickets: 5, status: "Équilibrée", tone: "purple", initials: "NB" },
];
const slaGauge = [{ name: "sla", value: 87, fill: "url(#slaGrad)" }];

/* ---------- Sidebar nav ---------- */
const NAV = [
  {
    label: "PILOTAGE",
    items: [
      { icon: LayoutGrid, label: "Centre de contrôle", active: true },
      { icon: Ticket, label: "Tickets", badge: "24" },
      { icon: CalendarDays, label: "Planning" },
      { icon: GaugeCircle, label: "SLA" },
      { icon: FileBarChart2, label: "Rapports" },
      { icon: Users, label: "Équipe" },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { icon: UserCog, label: "Utilisateurs" },
      { icon: Users, label: "Employés" },
      { icon: Building2, label: "Départements" },
      { icon: Shield, label: "Politiques SLA" },
    ],
  },
  {
    label: "OUTILS",
    items: [
      { icon: Sparkles, label: "Quality Lab IA" },
      { icon: Bell, label: "Notifications" },
      { icon: MessageSquare, label: "Messagerie" },
    ],
  },
  {
    label: "GÉNÉRAL",
    items: [
      { icon: Settings, label: "Paramètres" },
      { icon: HelpCircle, label: "Aide" },
      { icon: LogOut, label: "Déconnexion" },
    ],
  },
];

function PiloteDashboard() {
  return (
    <div className="min-h-screen w-full bg-background p-3 md:p-6">
      <div
        className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1500px] overflow-hidden rounded-3xl bg-white"
        style={{ boxShadow: "var(--cgi-shadow-shell)" }}
      >
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader />
          <main className="flex-1 px-4 pb-6 md:px-8 md:pb-8">
            <PageTitle />
            <KpiRow />
            <MiddleRow />
            <BottomRow />
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sidebar ---------- */
function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border/60 bg-white px-4 py-5 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <img src={cgiLogo} alt="CGI" className="h-9 w-9 rounded-lg object-contain" />
        <span className="text-lg font-semibold tracking-tight">CGI-Intranet</span>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
        {NAV.map((section) => (
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
                  <button
                    className={
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors " +
                      (it.active
                        ? "text-white"
                        : "text-foreground/75 hover:bg-muted hover:text-foreground")
                    }
                    style={it.active ? { background: "var(--cgi-gradient)" } : undefined}
                  >
                    <it.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1 truncate text-left">{it.label}</span>
                    {it.badge && (
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: it.active ? "rgba(255,255,255,0.22)" : "rgba(82,54,152,0.1)",
                          color: it.active ? "#fff" : "var(--cgi-purple)",
                        }}
                      >
                        {it.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className="mt-4 overflow-hidden rounded-2xl p-4 text-white"
        style={{ background: "var(--cgi-gradient-dark)" }}
      >
        <div className="flex items-center gap-2 text-xs opacity-90">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-white/15">
            <Activity className="h-3.5 w-3.5" />
          </span>
          État de la plateforme
        </div>
        <div className="mt-3 text-sm font-semibold">Plateforme opérationnelle</div>
        <div className="mt-0.5 text-[11px] opacity-80">Services essentiels disponibles</div>
        <button className="mt-3 w-full rounded-lg bg-white/95 py-1.5 text-xs font-semibold text-[color:var(--cgi-purple)]">
          Voir l’état
        </button>
      </div>
    </aside>
  );
}

/* ---------- Top header ---------- */
function TopHeader() {
  return (
    <header className="flex items-center gap-3 px-4 py-4 md:px-8 md:py-5">
      <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border/60 bg-white px-4 py-2.5 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Rechercher un ticket, un utilisateur…"
        />
      </div>
      <button className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-white text-foreground/70 shadow-sm">
        <MessageSquare className="h-4 w-4" />
      </button>
      <button className="relative grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-white text-foreground/70 shadow-sm">
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[color:var(--cgi-red)]" />
      </button>
      <div className="flex items-center gap-3 pl-1">
        <div
          className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white"
          style={{ background: "var(--cgi-gradient)" }}
        >
          MP
        </div>
        <div className="hidden text-right leading-tight md:block">
          <div className="text-sm font-semibold">Mehdi Pilote</div>
          <div className="text-[11px] text-muted-foreground">mehdi.pilote@cgi.com</div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Page title ---------- */
function PageTitle() {
  return (
    <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">Centre de contrôle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supervisez les incidents, les engagements SLA et l’activité des équipes.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          style={{ background: "var(--cgi-gradient)" }}
        >
          <Plus className="h-4 w-4" /> Créer un utilisateur
        </button>
        <button className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-4 py-2.5 text-sm font-semibold text-foreground/80">
          <Download className="h-4 w-4" /> Exporter
        </button>
      </div>
    </div>
  );
}

/* ---------- KPI row ---------- */
function KpiRow() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        highlight
        title="Tickets ouverts"
        value="24"
        delta="+5 vs semaine passée"
      />
      <KpiCard title="Tickets résolus" value="18" delta="+6 cette semaine" />
      <KpiCard title="SLA en risque" value="4" delta="+2 en 24 h" />
      <KpiCard title="Employés disponibles" value="14 / 18" delta="Effectif nominal" />
    </div>
  );
}

function KpiCard({
  title, value, delta, highlight,
}: { title: string; value: string; delta: string; highlight?: boolean }) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border p-5 " +
        (highlight ? "border-transparent text-white" : "border-border/60 bg-white")
      }
      style={{
        background: highlight ? "var(--cgi-gradient)" : undefined,
        boxShadow: highlight ? "0 12px 30px -14px rgba(226,21,67,0.45)" : "var(--cgi-shadow-card)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium opacity-90">{title}</div>
        <span
          className="grid h-7 w-7 place-items-center rounded-full"
          style={{
            background: highlight ? "rgba(255,255,255,0.18)" : "rgba(82,54,152,0.08)",
            color: highlight ? "#fff" : "var(--cgi-purple)",
          }}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-4 text-4xl font-bold tracking-tight">{value}</div>
      <div
        className={"mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium " +
          (highlight ? "bg-white/15" : "")}
        style={!highlight ? { background: "rgba(82,54,152,0.08)", color: "var(--cgi-purple)" } : undefined}
      >
        {delta}
      </div>
    </div>
  );
}

/* ---------- Middle row (chart + actions + priorities) ---------- */
function MiddleRow() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="rounded-2xl border border-border/60 bg-white p-5 lg:col-span-6" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">Activité des tickets</div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <Legend color="var(--cgi-purple)" label="Créés" />
            <Legend color="var(--cgi-red)" label="Résolus" />
            <Legend color="var(--cgi-lavender)" label="En attente" />
          </div>
        </div>
        <div className="mt-4 h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} barCategoryGap={18}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8a83a3" }} />
              <Tooltip cursor={{ fill: "rgba(82,54,152,0.05)" }} contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} />
              <Bar dataKey="value" radius={[999, 999, 999, 999]}>
                {activityData.map((d, i) => (
                  <Cell key={i} fill={d.highlight ? "var(--cgi-purple)" : i === 1 ? "var(--cgi-red)" : "var(--cgi-lavender)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-5 lg:col-span-3" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="text-[15px] font-semibold">Actions requises</div>
        <div className="mt-3 flex items-start gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{ background: "rgba(226,21,67,0.1)", color: "var(--cgi-red)" }}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-snug">2 tickets critiques non affectés</div>
            <div className="mt-1 text-xs text-muted-foreground">Une intervention est requise.</div>
          </div>
        </div>
        <button
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold text-white"
          style={{ background: "var(--cgi-gradient)" }}
        >
          Consulter <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-5 lg:col-span-3" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">Tickets prioritaires</div>
          <button className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-foreground/70">
            Voir tout
          </button>
        </div>
        <ul className="mt-3 space-y-3">
          {priorityTickets.map((t) => (
            <li key={t.id} className="flex items-start gap-3">
              <TicketBadge tone={t.tone} />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight">{t.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/70">{t.id}</span> · {t.meta}
                </div>
              </div>
            </li>
          ))}
        </ul>
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

const TONE_BG: Record<string, string> = {
  red: "rgba(226,21,67,0.12)",
  purple: "rgba(82,54,152,0.12)",
  lavender: "rgba(164,140,197,0.22)",
  burgundy: "rgba(114,27,76,0.15)",
  pink: "rgba(169,78,137,0.15)",
};
const TONE_FG: Record<string, string> = {
  red: "#E21543",
  purple: "#523698",
  lavender: "#523698",
  burgundy: "#721B4C",
  pink: "#A94E89",
};
function TicketBadge({ tone }: { tone: string }) {
  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
      style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}
    >
      <Ticket className="h-4 w-4" />
    </span>
  );
}

/* ---------- Bottom row ---------- */
function BottomRow() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Team */}
      <div className="rounded-2xl border border-border/60 bg-white p-5 lg:col-span-6" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">Charge des équipes</div>
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-3 py-1 text-[11px] font-semibold text-foreground/80"
          >
            <Plus className="h-3.5 w-3.5" /> Voir l’équipe
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {team.map((m) => (
            <li key={m.name} className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                style={{ background: "var(--cgi-gradient)" }}
              >
                {m.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{m.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {m.dept} · {m.tickets} tickets actifs
                </div>
              </div>
              <WorkloadBadge status={m.status} tone={m.tone} />
            </li>
          ))}
        </ul>
      </div>

      {/* SLA gauge */}
      <div className="rounded-2xl border border-border/60 bg-white p-5 lg:col-span-3" style={{ boxShadow: "var(--cgi-shadow-card)" }}>
        <div className="text-[15px] font-semibold">Respect des SLA</div>
        <div className="relative mx-auto mt-2 h-[170px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%" cy="85%"
              innerRadius={70} outerRadius={100}
              startAngle={180} endAngle={0}
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
          <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center">
            <div className="text-3xl font-bold tracking-tight">87 %</div>
            <div className="text-[11px] text-muted-foreground">SLA respectés</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <Legend color="var(--cgi-purple)" label="Respectés" />
          <Legend color="var(--cgi-lavender)" label="En risque" />
          <Legend color="var(--cgi-red)" label="Dépassés" />
        </div>
      </div>

      {/* SLA countdown dark card */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white lg:col-span-3"
        style={{ background: "var(--cgi-gradient-dark)" }}
      >
        <div className="text-sm font-semibold opacity-90">Prochaine échéance SLA</div>
        <div className="mt-4 text-4xl font-bold tracking-tight tabular-nums">00:42:18</div>
        <div className="mt-1 text-[11px] opacity-80">INC-1042 · Priorité critique</div>
        <div className="mt-4 flex gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[color:var(--cgi-purple)]">
            <Eye className="h-3.5 w-3.5" /> Voir le ticket
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-1.5 text-[11px] font-semibold text-white">
            <ExternalLink className="h-3.5 w-3.5" /> Voir les SLA
          </button>
        </div>
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #E21543 0%, transparent 70%)" }}
        />
      </div>
    </div>
  );
}

const WORKLOAD_STYLES: Record<string, { bg: string; fg: string }> = {
  green: { bg: "rgba(34,197,94,0.12)", fg: "#16a34a" },
  orange: { bg: "rgba(234,150,32,0.15)", fg: "#c2740c" },
  red: { bg: "rgba(226,21,67,0.12)", fg: "#E21543" },
  purple: { bg: "rgba(82,54,152,0.12)", fg: "#523698" },
};
function WorkloadBadge({ status, tone }: { status: string; tone: string }) {
  const s = WORKLOAD_STYLES[tone] ?? WORKLOAD_STYLES.purple;
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {status}
    </span>
  );
}
