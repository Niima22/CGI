import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import cgiLogo from "../../Images/logo.png";
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  ChevronDown,
  ClipboardList,
  Download,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
  ChevronRight,
  Building2,
  UserCog,
  UserRound,
  ListChecks,
  CalendarClock,
  BellRing,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Centre de contrôle - CGI-FLOW" },
      {
        name: "description",
        content:
          "Vue opérationnelle CGI-FLOW : incidents, SLA, planning et disponibilité des équipes.",
      },
    ],
  }),
  component: DashboardPage,
});

// --- Presentation-only role (replace with real auth role when available) ---
type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";
const CURRENT_ROLE: Role = "MANAGER";
const CURRENT_USER = {
  name: "Camille Laurent",
  initials: "CL",
  role: "Manager opérations",
  department: "Support N2",
  availability: "available" as "available" | "busy" | "away",
};

const availabilityMap = {
  available: { label: "Disponible", dot: "bg-emerald-500" },
  busy: { label: "Occupé", dot: "bg-amber-500" },
  away: { label: "Indisponible", dot: "bg-rose-500" },
};

type NavItem = { label: string; icon: React.ElementType; to?: string; roles?: Role[] };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Pilotage",
    items: [{ label: "Centre de contrôle", icon: LayoutDashboard, to: "/dashboard" }],
  },
  {
    title: "Opérations",
    items: [
      { label: "Incidents", icon: LifeBuoy },
      { label: "SLA", icon: Gauge },
      { label: "Planning", icon: Calendar },
      { label: "Disponibilité équipe", icon: Users },
    ],
  },
  {
    title: "Collaboration",
    items: [
      { label: "Notifications", icon: Bell },
      { label: "Messagerie", icon: Mail },
      { label: "Quality Lab IA", icon: Sparkles },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Utilisateurs", icon: UserCog, roles: ["ADMIN"] },
      { label: "Employés", icon: UserRound, roles: ["ADMIN", "MANAGER"] },
      { label: "Départements", icon: Building2, roles: ["ADMIN"] },
      { label: "Politiques SLA", icon: ShieldCheck, roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    title: "Compte",
    items: [
      { label: "Mon profil", icon: Settings },
      { label: "Déconnexion", icon: LogOut, to: "/" },
    ],
  },
];

function DashboardPage() {
  const [availability, setAvailability] = useState<keyof typeof availabilityMap>(
    CURRENT_USER.availability,
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [slaError] = useState(true); // demo: SLA card in error state

  const quickActions = [
    { label: "Nouveau ticket", icon: Plus, primary: true },
    { label: "Mes tickets", icon: ClipboardList },
    { label: "Planning", icon: Calendar },
    { label: "SLA", icon: Gauge },
    { label: "Quality Lab IA", icon: Sparkles },
    { label: "Équipe", icon: Users, roles: ["MANAGER", "ADMIN"] as Role[] },
    { label: "Notifications", icon: Bell },
    { label: "Rapports", icon: FileBarChart, roles: ["MANAGER", "ADMIN"] as Role[] },
  ].filter((a) => !a.roles || a.roles.includes(CURRENT_ROLE));

  return (
    <div className="min-h-dvh bg-[oklch(0.985_0.003_260)] text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-[1600px]">
        {/* SIDEBAR */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border/60 bg-white lg:flex">
          <div className="flex h-16 items-center justify-center border-b border-border/60 px-5">
            <img
              src={cgiLogo}
              alt="CGI"
              className="h-18 w-auto object-contain"
            />
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {NAV.map((group) => {
              const items = group.items.filter((i) => !i.roles || i.roles.includes(CURRENT_ROLE));
              if (items.length === 0) return null;
              return (
                <div key={group.title} className="mb-5">
                  <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const active = item.to === "/dashboard";
                      const Icon = item.icon;
                      const cls = `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-gradient-cgi-soft text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`;
                      const content = (
                        <>
                          <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[oklch(0.5_0.22_300)]" : ""}`} />
                          <span className="truncate">{item.label}</span>
                          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-cgi" />}
                        </>
                      );
                      return (
                        <li key={item.label}>
                          {item.to ? (
                            <Link to={item.to} className={cls}>
                              {content}
                            </Link>
                          ) : (
                            <button type="button" className={cls + " w-full text-left"}>
                              {content}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* MAIN */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* TOP BAR */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-white/90 px-4 backdrop-blur sm:px-6">
            <div className="relative flex-1 max-w-2xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Rechercher un ticket, un employé, un département..."
                className="h-10 w-full rounded-xl border border-border/70 bg-muted/40 pl-9 pr-3 text-sm outline-none transition focus:border-[oklch(0.6_0.2_300)] focus:bg-white focus:ring-2 focus:ring-[oklch(0.6_0.2_300)]/20"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-border/70 bg-white px-2.5 py-1.5 text-xs sm:flex">
                <span className={`h-2 w-2 rounded-full ${availabilityMap[availability].dot}`} />
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as keyof typeof availabilityMap)}
                  className="bg-transparent text-xs font-medium outline-none"
                  aria-label="Statut de disponibilité"
                >
                  {(Object.keys(availabilityMap) as (keyof typeof availabilityMap)[]).map((k) => (
                    <option key={k} value={k}>{availabilityMap[k].label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                aria-label="Notifications"
                className="relative grid h-10 w-10 place-items-center rounded-lg border border-border/70 bg-white text-muted-foreground transition hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[oklch(0.65_0.24_22)]" />
              </button>
              <button
                type="button"
                aria-label="Menu utilisateur"
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-white px-1.5 py-1 pr-2.5 text-sm transition hover:bg-muted/50"
              >
                <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-cgi text-[11px] font-semibold text-white">
                  {CURRENT_USER.initials}
                </span>
                <span className="hidden text-xs font-medium sm:inline">{CURRENT_USER.name.split(" ")[0]}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:inline" />
              </button>
            </div>
          </header>

          <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Page header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Pilotage</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>Centre de contrôle</span>
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Centre de contrôle</h1>
                <p className="mt-1 text-sm text-muted-foreground">Vue opérationnelle de la plateforme CGI-FLOW.</p>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((v) => !v)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-white px-3.5 text-sm font-medium shadow-sm transition hover:bg-muted/50"
                >
                  <Download className="h-4 w-4" />
                  Exporter
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {exportOpen && (
                  <div className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-lg border border-border/70 bg-white shadow-lg">
                    {["Exporter les incidents (CSV)", "Exporter les SLA (CSV)", "Rapport mensuel (PDF)"].map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setExportOpen(false)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/60"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick launcher */}
            <section aria-labelledby="quick-access">
              <h2 id="quick-access" className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Accès rapide
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {quickActions.map(({ label, icon: Icon, primary }) => (
                  <button
                    key={label}
                    type="button"
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                      primary
                        ? "border-transparent bg-gradient-cgi text-white shadow-soft hover:brightness-110"
                        : "border-border/70 bg-white text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* KPI strip */}
            <section aria-labelledby="kpis">
              <h2 id="kpis" className="sr-only">Indicateurs</h2>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-white p-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { icon: ShieldCheck, label: "Respect SLA", value: "-" },
                  { icon: AlertTriangle, label: "En risque", value: "-" },
                  { icon: Timer, label: "Dépassés", value: "-" },
                  { icon: AlertTriangle, label: "Critiques dépassés", value: "-" },
                  { icon: Gauge, label: "Temps moyen résolution", value: "-" },
                  { icon: Activity, label: "Temps moyen prise en charge", value: "-" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-xl p-2.5 hover:bg-muted/40">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[11px] text-muted-foreground">{label}</div>
                      <div className="truncate text-base font-semibold tabular-nums">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Main grid */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* Central operational card */}
              <div className="space-y-6">
                <article className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-gradient-cgi-soft/40 px-5 py-3.5">
                    <div>
                      <h2 className="text-base font-semibold tracking-tight">Situation opérationnelle du jour</h2>
                      <p className="text-xs text-muted-foreground">Aperçu en temps réel des tickets et incidents.</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2 py-0.5 text-[11px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Mise à jour continue
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {/* Emphasized */}
                      <div className="col-span-1 rounded-xl border border-border/60 bg-gradient-cgi p-4 text-white sm:col-span-2">
                        <div className="flex items-center gap-2 text-xs opacity-90">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Incidents ouverts
                        </div>
                        <div className="mt-1 text-4xl font-semibold tabular-nums">-</div>
                        <p className="mt-1 text-xs opacity-80">Nécessitent une prise en charge coordonnée.</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-[oklch(0.98_0.02_300)] p-4">
                        <div className="text-xs text-muted-foreground">Résolus aujourd'hui</div>
                        <div className="mt-1 text-3xl font-semibold text-[oklch(0.45_0.2_300)] tabular-nums">-</div>
                        <p className="mt-1 text-xs text-muted-foreground">Clôturés par l'équipe.</p>
                      </div>
                    </div>

                    {/* Distribution */}
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-medium text-muted-foreground">Répartition par statut</div>
                        <div className="text-[11px] text-muted-foreground">Total: -</div>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-1/4 bg-[oklch(0.7_0.2_22)]" />
                        <div className="h-full w-1/4 bg-[oklch(0.65_0.22_350)]" />
                        <div className="h-full w-1/4 bg-[oklch(0.6_0.22_300)]" />
                        <div className="h-full w-1/4 bg-[oklch(0.55_0.2_285)]" />
                      </div>
                      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { c: "bg-[oklch(0.7_0.2_22)]", l: "À faire", v: "-" },
                          { c: "bg-[oklch(0.65_0.22_350)]", l: "En cours", v: "-" },
                          { c: "bg-[oklch(0.6_0.22_300)]", l: "En attente", v: "-" },
                          { c: "bg-[oklch(0.55_0.2_285)]", l: "Assignés", v: "-" },
                        ].map((s) => (
                          <li key={s.l} className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2">
                            <span className={`h-2 w-2 rounded-full ${s.c}`} />
                            <span className="flex-1 truncate text-xs text-muted-foreground">{s.l}</span>
                            <span className="text-sm font-semibold tabular-nums">{s.v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Temps moyen de traitement</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">-</span>
                    </div>
                  </div>
                </article>

                {/* Lower modules */}
                <section aria-labelledby="modules">
                  <div className="mb-3 flex items-end justify-between">
                    <h2 id="modules" className="text-base font-semibold tracking-tight">Mes modules opérationnels</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      { icon: LifeBuoy, title: "Incidents", desc: "Suivi et traitement des incidents actifs.", value: "-", sub: "ouverts" },
                      { icon: Gauge, title: "SLA", desc: "Conformité et échéances contractuelles.", value: "-", sub: "en risque" },
                      { icon: Calendar, title: "Planning", desc: "Prochaines interventions programmées.", value: "-", sub: "cette semaine" },
                      { icon: Sparkles, title: "Quality Lab IA", desc: "Suggestions et cas similaires.", value: "-", sub: "recommandations" },
                      { icon: Users, title: "Disponibilité équipe", desc: "État des équipiers en poste.", value: "-", sub: "disponibles" },
                      { icon: Bell, title: "Notifications", desc: "Alertes et messages récents.", value: "-", sub: "non lues" },
                    ].map((m) => (
                      <article key={m.title} className="group rounded-2xl border border-border/60 bg-white p-4 transition hover:border-[oklch(0.7_0.15_300)]/40 hover:shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
                            <m.icon className="h-4 w-4" />
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-semibold tabular-nums">{m.value}</div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.sub}</div>
                          </div>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold">{m.title}</h3>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.desc}</p>
                        <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.5_0.22_300)] transition group-hover:gap-1.5">
                          Ouvrir <ArrowRight className="h-3 w-3" />
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN */}
              <aside className="space-y-5">
                {/* Priorité du jour */}
                <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[oklch(0.96_0.06_22)] text-[oklch(0.55_0.22_22)]">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold">Priorité du jour</h3>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Aucune priorité critique détectée pour le moment. Les tickets proches de leur échéance apparaîtront ici.
                  </p>
                  <button className="mt-3 text-xs font-medium text-[oklch(0.5_0.22_300)]">Voir les tickets en risque →</button>
                </div>

                {/* Team availability */}
                <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Disponibilité de l'équipe</h3>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex -space-x-2">
                    {["AL","BM","CT","DR","EM","+"].map((i, idx) => (
                      <span
                        key={idx}
                        className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-semibold ${
                          idx === 5
                            ? "bg-muted text-muted-foreground"
                            : idx % 3 === 0
                            ? "bg-emerald-100 text-emerald-700"
                            : idx % 3 === 1
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      { l: "Dispo.", c: "text-emerald-600" },
                      { l: "Occupés", c: "text-amber-600" },
                      { l: "Indispo.", c: "text-rose-600" },
                    ].map((s) => (
                      <div key={s.l} className="rounded-lg border border-border/60 py-2">
                        <dt className={`text-xs ${s.c}`}>{s.l}</dt>
                        <dd className="text-base font-semibold tabular-nums">-</dd>
                      </div>
                    ))}
                  </dl>
                  <button className="mt-3 w-full rounded-lg border border-border/70 bg-white px-3 py-1.5 text-xs font-medium hover:bg-muted/50">
                    Voir toute l'équipe
                  </button>
                </div>

                {/* Actions */}
                <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold">Actions</h3>
                  <button className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-cgi px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:brightness-110">
                    <Plus className="h-4 w-4" /> Créer un ticket
                  </button>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { l: "Quality Lab IA", i: Sparkles },
                      { l: "Planning", i: Calendar },
                      { l: "SLA", i: Gauge },
                    ].map((a) => (
                      <button
                        key={a.l}
                        className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-white px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        <a.i className="h-4 w-4 text-muted-foreground" />
                        {a.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SLA error (localized) */}
                {slaError && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-amber-900">Indicateurs SLA</div>
                        <p className="mt-0.5 text-xs text-amber-800">Indicateurs temporairement indisponibles.</p>
                        <button className="mt-2 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100">
                          Réessayer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prochaines activités */}
                <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Prochaines activités</h3>
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <ul className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <li key={i} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-cgi-soft text-[oklch(0.45_0.22_300)]">
                          <span className="text-[10px] font-semibold">--:--</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">Activité à planifier</div>
                          <div className="truncate text-[11px] text-muted-foreground">Aucune donnée disponible</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button className="mt-3 w-full rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium hover:bg-muted/50">
                    Voir le planning complet
                  </button>
                </div>

                {/* Platform info - shown only when info available */}
                <div className="rounded-2xl border border-border/60 bg-white p-4 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Plateforme opérationnelle
                    </div>
                    <span>Actualisation en direct</span>
                  </div>
                </div>
              </aside>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
