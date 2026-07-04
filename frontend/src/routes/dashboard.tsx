import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ticket,
  Clock,
  Sparkles,
  BookOpen,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Timer,
  ShieldCheck,
  ArrowRight,
  Plus,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CGI Intranet" },
      {
        name: "description",
        content:
          "Centre de contrôle CGI : snapshot opérationnel des incidents, SLA, Quality Lab IA et ressources.",
      },
    ],
  }),
  component: DashboardPage,
});

type Kpi = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
};

const kpis: Kpi[] = [
  {
    label: "Tickets ouverts",
    value: "24",
    hint: "+3 depuis hier",
    icon: Ticket,
    tone: "text-cgi-pink bg-pink-50",
  },
  {
    label: "SLA à risque",
    value: "6",
    hint: "à surveiller",
    icon: AlertTriangle,
    tone: "text-amber-600 bg-amber-50",
  },
  {
    label: "SLA dépassés",
    value: "2",
    hint: "action requise",
    icon: ShieldCheck,
    tone: "text-[color:var(--cgi-red)] bg-red-50",
  },
  {
    label: "Trames IA générées",
    value: "18",
    hint: "aujourd'hui",
    icon: Sparkles,
    tone: "text-[color:var(--cgi-purple)] bg-purple-50",
  },
  {
    label: "Employés disponibles",
    value: "12",
    hint: "sur 17 actifs",
    icon: Users,
    tone: "text-emerald-600 bg-emerald-50",
  },
  {
    label: "Temps moyen résolution",
    value: "34 min",
    hint: "−4 min vs semaine",
    icon: Timer,
    tone: "text-sky-600 bg-sky-50",
  },
];

function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Centre de contrôle</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Snapshot opérationnel en temps réel de la plateforme CGI Intranet.
          </p>
        </div>

        {/* Dashboard overview */}
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_320px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div
                  key={k.label}
                  className="bg-card border border-border rounded-2xl p-4 shadow-card hover:shadow-glow transition-all"
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${k.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground leading-tight">
                    {k.value}
                  </div>
                  <div className="text-xs font-medium text-foreground/80 mt-1">{k.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{k.hint}</div>
                </div>
              );
            })}
          </div>

          <QuickActionsCard />
        </div>

        {/* Row 1: Incidents + SLA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IncidentsCard />
          <SLACard />
        </div>

        {/* Row 2: Quality Lab */}
        <div className="grid grid-cols-1 gap-4">
          <QualityLabCard />
        </div>

        {/* Row 3: Employees + Knowledge */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EmployeesCard />
          <KnowledgeCard />
        </div>
      </div>
    </AppShell>
  );
}

/* ---------- Section Card primitives ---------- */
function SectionCard({
  title,
  icon: Icon,
  children,
  badge,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-cgi-gradient flex items-center justify-center shadow-glow">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {badge && (
          <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
      <div className={`text-lg font-bold ${tone ?? "text-foreground"}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

/* ---------- Incidents ---------- */
function IncidentsCard() {
  const segments = [
    { label: "Ouverts", value: 24, color: "var(--cgi-pink)" },
    { label: "En cours", value: 12, color: "var(--cgi-purple)" },
    { label: "Résolus", value: 8, color: "#10b981" },
    { label: "En attente", value: 4, color: "var(--cgi-red)" },
  ];
  const total = segments.reduce((a, s) => a + s.value, 0);

  return (
    <SectionCard title="Incidents" icon={Ticket} badge="Aujourd'hui">
      <div className="grid grid-cols-4 gap-2">
        <MiniStat label="Ouverts" value="24" tone="text-cgi-pink" />
        <MiniStat label="En cours" value="12" tone="text-[color:var(--cgi-purple)]" />
        <MiniStat label="Résolus" value="8" tone="text-emerald-600" />
        <MiniStat label="En attente" value="4" tone="text-[color:var(--cgi-red)]" />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Distribution</span>
          <span>{total} tickets</span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {segments.map((s) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {segments.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

/* ---------- SLA ---------- */
function SLACard() {
  const urgent = [
    {
      id: "INC-1024",
      level: "Haute",
      time: "18 min",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      id: "INC-1027",
      level: "Critique",
      time: "6 min",
      tone: "bg-red-50 text-[color:var(--cgi-red)] border-red-200",
    },
    {
      id: "INC-1031",
      level: "Moyenne",
      time: "42 min",
      tone: "bg-sky-50 text-sky-700 border-sky-200",
    },
  ];
  return (
    <SectionCard title="SLA" icon={Clock} badge="Live">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 sm:col-span-1 rounded-xl bg-cgi-gradient text-white p-4 shadow-glow">
          <div className="text-2xl font-bold">87%</div>
          <div className="text-xs opacity-90 mt-1">SLA respectés</div>
        </div>
        <MiniStat label="À risque" value="6" tone="text-amber-600" />
        <MiniStat label="Dépassés" value="2" tone="text-[color:var(--cgi-red)]" />
        <div className="col-span-3 sm:col-span-3 rounded-xl bg-muted/60 px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Temps moyen de résolution</span>
          <span className="text-sm font-semibold text-foreground">34 min</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-muted-foreground mb-2">Tickets urgents</div>
        <div className="space-y-1.5">
          {urgent.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2"
            >
              <span className="text-xs font-mono font-semibold text-foreground">{u.id}</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${u.tone}`}
              >
                {u.level}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{u.time}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

/* ---------- Quality Lab ---------- */
function QualityLabCard() {
  return (
    <SectionCard title="Quality Lab IA" icon={Sparkles} badge="Actif">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Trames générées" value="18" tone="text-[color:var(--cgi-purple)]" />
        <MiniStat label="Score qualité" value="91%" tone="text-emerald-600" />
        <MiniStat label="Score confiance" value="84%" tone="text-sky-600" />
        <MiniStat label="Cas similaires" value="46" tone="text-cgi-pink" />
      </div>

      <div className="mt-4 space-y-2">
        <ProgressBar label="Qualité moyenne" value={91} />
        <ProgressBar label="Confiance moyenne" value={84} />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-muted-foreground max-w-sm">
          Génération et évaluation intelligente des trames de résolution.
        </p>
        <Link
          to="/quality-lab"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cgi-gradient text-white text-sm font-medium shadow-glow hover:opacity-95 transition"
        >
          Ouvrir Quality Lab <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </SectionCard>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-cgi-gradient" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* ---------- Employees ---------- */
function EmployeesCard() {
  return (
    <SectionCard title="Employés & Planning" icon={Users} badge="Jour">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Disponibles" value="12" tone="text-emerald-600" />
        <MiniStat label="En pause" value="3" tone="text-amber-600" />
        <MiniStat label="En congé" value="2" tone="text-muted-foreground" />
      </div>
      <div className="mt-4">
        <ProgressBar label="Charge moyenne" value={76} />
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
        <span className="text-[11px] text-muted-foreground">Planning du jour</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Stable
        </span>
      </div>
    </SectionCard>
  );
}

/* ---------- Knowledge ---------- */
function KnowledgeCard() {
  return (
    <SectionCard title="Base de connaissances" icon={BookOpen} badge="Sync">
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Solutions validées" value="320" tone="text-[color:var(--cgi-purple)]" />
        <MiniStat label="Articles mis à jour" value="12" tone="text-sky-600" />
        <MiniStat label="Feedbacks reçus" value="28" tone="text-cgi-pink" />
        <div className="rounded-xl bg-muted/60 px-3 py-2.5 flex flex-col justify-center">
          <div className="text-[11px] text-muted-foreground">Recherche hybride</div>
          <div className="text-xs font-semibold text-foreground mt-0.5">Prévue</div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ---------- Quick actions ---------- */
function QuickActionsCard() {
  const actions: {
    label: string;
    icon: LucideIcon;
    active: boolean;
    to?: "/quality-lab" | "/planning-view";
  }[] = [
    { label: "Créer un ticket", icon: Plus, active: false },
    { label: "Ouvrir Quality Lab", icon: Sparkles, active: true, to: "/quality-lab" },
    { label: "Voir SLA à risque", icon: Activity, active: false },
    { label: "Consulter planning", icon: Calendar, active: true, to: "/planning-view" },
  ];

  return (
    <SectionCard title="Actions rapides" icon={TrendingUp}>
      <div className="space-y-2">
        {actions.map((a) => {
          const Icon = a.icon;
          if (a.active && a.to) {
            return (
              <Link
                key={a.label}
                to={a.to}
                className="w-full flex items-center gap-3 rounded-xl bg-cgi-gradient text-white px-3 py-2.5 text-sm font-medium shadow-glow hover:opacity-95 transition"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{a.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            );
          }
          return (
            <button
              key={a.label}
              disabled
              className="w-full flex items-center gap-3 rounded-xl bg-muted text-muted-foreground px-3 py-2.5 text-sm font-medium cursor-not-allowed"
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{a.label}</span>
              <span className="text-[10px] uppercase tracking-wide">Bientôt</span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
