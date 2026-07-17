import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CirclePlus,
  Eye,
  Flame,
  Inbox,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Timer,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  createTicket,
  fetchTickets,
  TicketApiError,
  type Ticket,
  type TicketCreatePayload,
  type TicketCriticality,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from "@/lib/api/tickets";
import { getSlaUrgentTickets, type SlaUrgentTicketResponse } from "@/lib/api/sla";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "Gestion des incidents - CGI-Intranet" },
      {
        name: "description",
        content: "Supervision, affectation et traitement des tickets ITSM de CGI-Intranet.",
      },
    ],
  }),
  component: TicketsPage,
});

type FiltersState = {
  q: string;
  status: string;
  priority: string;
  criticality: string;
  assignment: string;
  sla: string;
};

type TicketSlaView = {
  status: "Respecté" | "En risque" | "Dépassé" | "Non applicable";
  remaining?: string;
};

const ticketTheme = {
  "--cgi-red": "#E21543",
  "--cgi-pink": "#A94E89",
  "--cgi-purple": "#523698",
  "--cgi-burgundy": "#721B4C",
  "--cgi-lavender": "#A48CC5",
  "--gradient-cgi": "linear-gradient(135deg, #E21543 0%, #A94E89 45%, #523698 100%)",
  "--gradient-cgi-soft":
    "linear-gradient(135deg, color-mix(in oklab, #E21543 12%, transparent) 0%, color-mix(in oklab, #523698 12%, transparent) 100%)",
  "--shadow-cgi": "0 20px 40px -20px color-mix(in oklab, #523698 45%, transparent)",
} as CSSProperties;

const defaultFilters: FiltersState = {
  q: "",
  status: "all",
  priority: "all",
  criticality: "all",
  assignment: "all",
  sla: "all",
};

const emptyTicketForm: TicketCreatePayload = {
  title: "",
  description: "",
  type: "INCIDENT",
  category: "",
  subCategory: "",
  priority: "MEDIUM",
  criticality: "MEDIUM",
  departmentId: null,
};

const statusOptions: Array<{ value: TicketStatus; label: string }> = [
  { value: "NEW", label: "Nouveau" },
  { value: "TODO", label: "À faire" },
  { value: "ASSIGNED", label: "Assigné" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "WAITING_REQUESTER", label: "En attente demandeur" },
  { value: "WAITING_PROVIDER", label: "En attente prestataire" },
  { value: "WAITING_MANAGER_VALIDATION", label: "En attente validation" },
  { value: "RESOLVED", label: "Résolu" },
  { value: "CLOSED", label: "Fermé" },
  { value: "REOPENED", label: "Réouvert" },
  { value: "CANCELLED", label: "Annulé" },
];

const priorityOptions: Array<{ value: TicketPriority; label: string }> = [
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Haute" },
  { value: "URGENT", label: "Urgente" },
];

const criticalityOptions: Array<{ value: TicketCriticality; label: string }> = [
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Haute" },
  { value: "CRITICAL", label: "Critique" },
];

const typeOptions: Array<{ value: TicketType; label: string }> = [
  { value: "INCIDENT", label: "Incident" },
  { value: "REQUEST", label: "Demande" },
  { value: "PROBLEM", label: "Problème" },
  { value: "CHANGE", label: "Changement" },
];

const sortableCols = ["Référence", "Priorité", "Criticité", "SLA", "Mise à jour"];

function TicketsPage() {
  const { authenticatedFetch, hasRole, isAuthenticated, isReady } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [urgentSlaTickets, setUrgentSlaTickets] = useState<SlaUrgentTicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [openNew, setOpenNew] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [form, setForm] = useState<TicketCreatePayload>(emptyTicketForm);

  const canCreateTicket = hasRole("ADMIN") || hasRole("MANAGER") || hasRole("EMPLOYEE");
  const canReadSla = hasRole("ADMIN") || hasRole("MANAGER");

  const loadTickets = useCallback(async () => {
    if (!isReady) {
      return;
    }
    if (!isAuthenticated) {
      setTickets([]);
      setUrgentSlaTickets([]);
      setLoading(false);
      setError("Votre session ne permet pas d'accéder aux tickets.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ticketsResponse, slaResponse] = await Promise.all([
        fetchTickets(authenticatedFetch),
        canReadSla
          ? getSlaUrgentTickets(authenticatedFetch, 100).catch(() => [] as SlaUrgentTicketResponse[])
          : Promise.resolve([] as SlaUrgentTicketResponse[]),
      ]);
      setTickets(ticketsResponse);
      setUrgentSlaTickets(slaResponse);
    } catch (caught) {
      setError(readTicketError(caught, "Impossible de charger les tickets."));
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, canReadSla, isAuthenticated, isReady]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const slaByTicketId = useMemo(() => {
    const map = new Map<number, SlaUrgentTicketResponse>();
    urgentSlaTickets.forEach((ticket) => map.set(ticket.ticketId, ticket));
    return map;
  }, [urgentSlaTickets]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const sla = getTicketSlaView(ticket, slaByTicketId);
      if (q) {
        const haystack = [
          ticket.reference,
          ticket.title,
          ticket.description,
          ticket.category ?? "",
          ticket.subCategory ?? "",
          formatTicketStatus(ticket),
          formatTicketPriority(ticket),
          formatTicketCriticality(ticket),
          formatTicketType(ticket),
          ticket.assignedUserId ? `Utilisateur ${ticket.assignedUserId}` : "Non affecté",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.status !== "all" && formatTicketStatus(ticket) !== filters.status) return false;
      if (filters.priority !== "all" && formatTicketPriority(ticket) !== filters.priority) return false;
      if (filters.criticality !== "all" && formatTicketCriticality(ticket) !== filters.criticality) return false;
      if (filters.assignment === "Non affectés" && ticket.assignedUserId) return false;
      if (filters.assignment === "Affectés" && !ticket.assignedUserId) return false;
      if (filters.sla !== "all" && sla.status !== filters.sla) return false;
      return true;
    });
  }, [filters, slaByTicketId, tickets]);

  const kpis = useMemo(
    () => [
      {
        label: "Tickets actifs",
        value: String(tickets.filter((ticket) => !isClosedTicket(ticket.status)).length),
        hint: "Tickets actuellement en traitement",
        icon: "inbox" as const,
        accent: "gradient" as const,
      },
      {
        label: "Non affectés",
        value: String(tickets.filter((ticket) => !ticket.assignedUserId && !isClosedTicket(ticket.status)).length),
        hint: "Nécessitent une affectation",
        icon: "alert" as const,
      },
      {
        label: "SLA en risque",
        value: String(urgentSlaTickets.filter((ticket) => ticket.globalStatus === "AT_RISK").length),
        hint: "Échéance proche",
        icon: "timer" as const,
      },
      {
        label: "Tickets critiques",
        value: String(tickets.filter((ticket) => ticket.criticality === "CRITICAL").length),
        hint: "Impact opérationnel élevé",
        icon: "flame" as const,
      },
    ],
    [tickets, urgentSlaTickets],
  );

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createTicket(authenticatedFetch, cleanTicketPayload(form));
      setOpenNew(false);
      setForm(emptyTicketForm);
      toast.success("Ticket créé avec succès.");
      await loadTickets();
    } catch (caught) {
      setError(readTicketError(caught, "La création du ticket a échoué."));
    } finally {
      setSubmitting(false);
    }
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  if (pathname !== "/tickets") {
    return <Outlet />;
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6" style={ticketTheme}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Gestion des incidents
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Suivi, affectation et traitement des tickets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void loadTickets()} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              className="text-white shadow-sm"
              style={{ background: "var(--gradient-cgi)" }}
              onClick={() => setOpenNew(true)}
              disabled={!canCreateTicket}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nouveau ticket
            </Button>
          </div>
        </div>

        {loading ? (
          <TicketTableSkeleton />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi) => (
                <TicketKpiCard key={kpi.label} item={kpi} />
              ))}
            </div>

            <TicketFilters value={filters} onChange={setFilters} onReset={resetFilters} />
            <ActiveFilterChips value={filters} onChange={setFilters} onClearAll={resetFilters} />

            {error ? (
              <TicketErrorState message={error} onRetry={() => void loadTickets()} />
            ) : filtered.length === 0 ? (
              <TicketEmptyState onReset={resetFilters} onCreate={() => setOpenNew(true)} />
            ) : (
              <TicketTable
                tickets={filtered}
                slaByTicketId={slaByTicketId}
                onOpen={(ticket) => {
                  setSelected(ticket);
                  setOpenDetail(true);
                }}
              />
            )}
          </>
        )}

        <NewTicketModal
          open={openNew}
          onOpenChange={(open) => {
            setOpenNew(open);
            if (!open) setForm(emptyTicketForm);
          }}
          form={form}
          setForm={setForm}
          submitting={submitting}
          onSubmit={submitTicket}
        />
        <TicketDetailDrawer
          ticket={selected}
          sla={selected ? getTicketSlaView(selected, slaByTicketId) : null}
          open={openDetail}
          onOpenChange={setOpenDetail}
        />
      </div>
    </AppShell>
  );
}

function TicketKpiCard({
  item,
}: {
  item: {
    label: string;
    value: string;
    hint: string;
    icon: "inbox" | "alert" | "timer" | "flame";
    accent?: "gradient";
  };
}) {
  const iconMap = { inbox: Inbox, alert: AlertTriangle, timer: Timer, flame: Flame };
  const Icon = iconMap[item.icon];
  const isGradient = item.accent === "gradient";
  return (
    <button
      type="button"
      className={
        "group relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg " +
        (isGradient
          ? "border-transparent text-white"
          : "border-border bg-white hover:border-[color-mix(in_oklab,var(--cgi-purple)_30%,transparent)]")
      }
      style={isGradient ? { background: "var(--gradient-cgi)", boxShadow: "var(--shadow-cgi)" } : undefined}
    >
      <div className="flex items-start justify-between">
        <div
          className={
            "grid h-10 w-10 place-items-center rounded-xl " +
            (isGradient ? "bg-white/15 text-white" : "text-[color:var(--cgi-purple)]")
          }
          style={!isGradient ? { background: "color-mix(in oklab, var(--cgi-purple) 10%, white)" } : undefined}
        >
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight
          className={
            "h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100 " +
            (isGradient ? "text-white" : "text-muted-foreground")
          }
        />
      </div>
      <div className="mt-6">
        <div className={"text-xs font-medium " + (isGradient ? "text-white/80" : "text-muted-foreground")}>
          {item.label}
        </div>
        <div className="mt-1 text-3xl font-semibold tracking-tight">{item.value}</div>
        <div className={"mt-1 text-xs " + (isGradient ? "text-white/70" : "text-muted-foreground")}>
          {item.hint}
        </div>
      </div>
    </button>
  );
}

function TicketFilters({
  value,
  onChange,
  onReset,
}: {
  value: FiltersState;
  onChange: (value: FiltersState) => void;
  onReset: () => void;
}) {
  const set = <K extends keyof FiltersState>(key: K, next: FiltersState[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-2">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.q}
            onChange={(event) => set("q", event.target.value)}
            placeholder="Rechercher un ticket..."
            className="h-10 rounded-full bg-white pl-9 shadow-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterSelect value={value.status} onChange={(next) => set("status", next)} placeholder="Statut" options={statusOptions.map((option) => option.label)} />
          <FilterSelect value={value.priority} onChange={(next) => set("priority", next)} placeholder="Priorité" options={priorityOptions.map((option) => option.label)} />
          <FilterSelect value={value.criticality} onChange={(next) => set("criticality", next)} placeholder="Criticité" options={criticalityOptions.map((option) => option.label)} />
          <FilterSelect value={value.assignment} onChange={(next) => set("assignment", next)} placeholder="Affectation" options={["Affectés", "Non affectés"]} />
          <FilterSelect value={value.sla} onChange={(next) => set("sla", next)} placeholder="SLA" options={["Respecté", "En risque", "Dépassé", "Non applicable"]} />
          <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-2 text-xs text-muted-foreground">
            <X className="mr-1 h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[112px] rounded-full bg-white px-3 text-xs shadow-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActiveFilterChips({
  value,
  onChange,
  onClearAll,
}: {
  value: FiltersState;
  onChange: (value: FiltersState) => void;
  onClearAll: () => void;
}) {
  const chips: { key: keyof FiltersState; label: string }[] = [];
  if (value.status !== "all") chips.push({ key: "status", label: `Statut : ${value.status}` });
  if (value.priority !== "all") chips.push({ key: "priority", label: `Priorité : ${value.priority}` });
  if (value.criticality !== "all") chips.push({ key: "criticality", label: `Criticité : ${value.criticality}` });
  if (value.assignment !== "all") chips.push({ key: "assignment", label: `Affectation : ${value.assignment}` });
  if (value.sla !== "all") chips.push({ key: "sla", label: `SLA : ${value.sla}` });
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs text-foreground shadow-sm"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onChange({ ...value, [chip.key]: "all" })}
            className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-[color:var(--cgi-purple)] hover:underline"
      >
        Effacer tous les filtres
      </button>
    </div>
  );
}

function TicketTable({
  tickets,
  slaByTicketId,
  onOpen,
}: {
  tickets: Ticket[];
  slaByTicketId: Map<number, SlaUrgentTicketResponse>;
  onOpen: (ticket: Ticket) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const total = tickets.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const rows = tickets.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  useEffect(() => {
    setPage(1);
  }, [tickets.length, pageSize]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              {["Référence", "Ticket", "Statut", "Priorité", "Criticité", "Type", "Catégorie", "Assigné à", "SLA", "Mise à jour", ""].map((heading) => (
                <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">
                  <span className="inline-flex items-center gap-1">
                    {heading}
                    {sortableCols.includes(heading) ? <ChevronsUpDown className="h-3 w-3 opacity-50" /> : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((ticket) => {
              const sla = getTicketSlaView(ticket, slaByTicketId);
              return (
                <tr key={ticket.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{ticket.reference}</td>
                  <td className="max-w-[260px] px-4 py-3">
                    <div className="truncate font-medium text-foreground">{ticket.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{ticket.description}</div>
                  </td>
                  <td className="px-4 py-3"><TicketStatusBadge value={formatTicketStatus(ticket)} /></td>
                  <td className="px-4 py-3"><TicketPriorityBadge value={formatTicketPriority(ticket)} /></td>
                  <td className="px-4 py-3"><TicketCriticalityBadge value={formatTicketCriticality(ticket)} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatTicketType(ticket)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{ticket.category ?? "Aucune donnée"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {ticket.assignedUserId ? (
                      <div className="flex items-center gap-2">
                        <Initials name={`Utilisateur ${ticket.assignedUserId}`} />
                        <span className="text-sm">Utilisateur #{ticket.assignedUserId}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                        Non affecté
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3"><TicketSlaBadge value={sla.status} remaining={sla.remaining} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(ticket.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => onOpen(ticket)}>
                        <Eye className="h-3.5 w-3.5" />
                        Voir détail
                      </Button>
                      <RowMenu ticket={ticket} onOpen={onOpen} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border lg:hidden">
        {rows.map((ticket) => {
          const sla = getTicketSlaView(ticket, slaByTicketId);
          return (
            <div key={ticket.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
                <TicketSlaBadge value={sla.status} remaining={sla.remaining} />
              </div>
              <div className="mt-1 font-medium">{ticket.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.description}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <TicketStatusBadge value={formatTicketStatus(ticket)} />
                <TicketPriorityBadge value={formatTicketPriority(ticket)} />
                <TicketCriticalityBadge value={formatTicketCriticality(ticket)} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {ticket.assignedUserId ? (
                    <>
                      <Initials name={`Utilisateur ${ticket.assignedUserId}`} />
                      <span>Utilisateur #{ticket.assignedUserId}</span>
                    </>
                  ) : (
                    <span className="font-medium text-red-600">Non affecté</span>
                  )}
                </div>
                <span>{formatDateTime(ticket.updatedAt)}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpen(ticket)}>
                  Voir détail
                </Button>
                <RowMenu ticket={ticket} onOpen={onOpen} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row">
        <div className="text-muted-foreground">{total} résultats</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Par page</span>
            <Select value={String(pageSize)} onValueChange={(next) => setPageSize(Number(next))}>
              <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-muted-foreground">Page {page} sur {pages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowMenu({ ticket, onOpen }: { ticket: Ticket; onOpen: (ticket: Ticket) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onOpen(ticket)}>Voir détail</DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link reloadDocument to="/tickets/$id" params={{ id: String(ticket.id) }}>
            Ouvrir la page backend
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Affectation indisponible ici</DropdownMenuItem>
        <DropdownMenuItem disabled>Changement de statut indisponible ici</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NewTicketModal({
  open,
  onOpenChange,
  form,
  setForm,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  form: TicketCreatePayload;
  setForm: (updater: (current: TicketCreatePayload) => TicketCreatePayload) => void;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Créer un nouveau ticket</DialogTitle>
            <DialogDescription>
              Renseignez les informations nécessaires à la prise en charge de l'incident.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <Field label="Titre" required>
              <Input
                required
                maxLength={180}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Résumez brièvement l'incident"
              />
            </Field>

            <Field label="Description" required>
              <Textarea
                required
                rows={4}
                maxLength={5000}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Décrivez le problème rencontré, son contexte et son impact..."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldSelect label="Type" value={form.type ?? "INCIDENT"} onChange={(next) => setForm((current) => ({ ...current, type: next as TicketType }))} options={typeOptions} />
              <Field label="Catégorie">
                <Input value={form.category ?? ""} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
              </Field>
              <FieldSelect label="Priorité" value={form.priority ?? "MEDIUM"} onChange={(next) => setForm((current) => ({ ...current, priority: next as TicketPriority }))} options={priorityOptions} />
              <FieldSelect label="Criticité" value={form.criticality ?? "MEDIUM"} onChange={(next) => setForm((current) => ({ ...current, criticality: next as TicketCriticality }))} options={criticalityOptions} />
              <Field label="Sous-catégorie">
                <Input value={form.subCategory ?? ""} onChange={(event) => setForm((current) => ({ ...current, subCategory: event.target.value }))} />
              </Field>
              <Field label="Identifiant du département">
                <Input
                  type="number"
                  min={1}
                  value={form.departmentId ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departmentId: event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                />
              </Field>
            </div>

            <div className="grid gap-1.5">
              <Label>Pièces jointes</Label>
              <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm font-medium">Pièces jointes non supportées par l'API actuelle</div>
                <div className="text-xs text-muted-foreground">La création garde le contrat backend existant.</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="text-white" style={{ background: "var(--gradient-cgi)" }} disabled={submitting}>
              {submitting ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" /> : <CirclePlus className="mr-1.5 h-4 w-4" />}
              Créer le ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TicketDetailDrawer({
  ticket,
  sla,
  open,
  onOpenChange,
}: {
  ticket: Ticket | null;
  sla: TicketSlaView | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  if (!ticket || !sla) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <div className="p-6 text-white" style={{ background: "var(--gradient-cgi)" }}>
          <SheetHeader className="text-left">
            <div className="font-mono text-xs text-white/80">{ticket.reference}</div>
            <SheetTitle className="text-white">{ticket.title}</SheetTitle>
            <SheetDescription className="text-white/80">{ticket.description}</SheetDescription>
          </SheetHeader>
          <div className="mt-3 flex flex-wrap gap-2">
            <TicketStatusBadge value={formatTicketStatus(ticket)} />
            <TicketPriorityBadge value={formatTicketPriority(ticket)} />
            <TicketCriticalityBadge value={formatTicketCriticality(ticket)} />
            <TicketSlaBadge value={sla.status} remaining={sla.remaining} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link reloadDocument to="/tickets/$id" params={{ id: String(ticket.id) }}>
                Ouvrir la fiche complète
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <InfoCard title="Informations principales">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Demandeur" value={`Utilisateur #${ticket.requesterId}`} />
              <Info label="Assigné à" value={ticket.assignedUserId ? `Utilisateur #${ticket.assignedUserId}` : "Non affecté"} />
              <Info label="Département" value={ticket.departmentId ? `Département #${ticket.departmentId}` : "Aucune donnée"} />
              <Info label="Type" value={formatTicketType(ticket)} />
              <Info label="Catégorie" value={ticket.category ?? "Aucune donnée"} />
              <Info label="Sous-catégorie" value={ticket.subCategory ?? "Aucune donnée"} />
              <Info label="Créé le" value={formatDateTime(ticket.createdAt)} />
              <Info label="Dernière mise à jour" value={formatDateTime(ticket.updatedAt)} />
            </dl>
          </InfoCard>
          <InfoCard title="SLA">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Statut SLA" value={sla.status} />
              <Info label="Temps restant" value={sla.remaining ?? "Aucune donnée"} />
              <Info label="Pris en charge le" value={formatDateTime(ticket.startedAt)} />
              <Info label="Résolu le" value={formatDateTime(ticket.resolvedAt)} />
            </dl>
          </InfoCard>
          <InfoCard title="Description">
            <p className="text-sm text-muted-foreground">{ticket.description}</p>
          </InfoCard>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TicketEmptyState({ onReset, onCreate }: { onReset: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
      <div
        className="grid h-14 w-14 place-items-center rounded-full text-[color:var(--cgi-purple)]"
        style={{ background: "color-mix(in oklab, var(--cgi-purple) 10%, white)" }}
      >
        <Inbox className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold">Aucun ticket trouvé</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Aucun ticket ne correspond aux critères sélectionnés.
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={onReset}>Réinitialiser les filtres</Button>
        <Button className="text-white" style={{ background: "var(--gradient-cgi)" }} onClick={onCreate}>
          Créer un ticket
        </Button>
      </div>
    </div>
  );
}

function TicketErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-red-800">Impossible de charger les tickets</h3>
      <p className="text-sm text-red-700/80">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-4 w-4" />
        Réessayer
      </Button>
    </div>
  );
}

function TicketTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-2xl" />
      <div className="space-y-2 rounded-2xl border border-border bg-white p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap";

function TicketStatusBadge({ value }: { value: string }) {
  const cls =
    value === "Nouveau" || value === "Réouvert"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : value === "Assigné"
        ? "bg-violet-50 text-violet-700 ring-violet-200"
        : value === "En cours"
          ? "bg-[color-mix(in_oklab,#523698_10%,white)] text-[#523698] ring-[color-mix(in_oklab,#523698_25%,white)]"
          : value.startsWith("En attente") || value === "À faire"
            ? "bg-orange-50 text-orange-700 ring-orange-200"
            : value === "Résolu"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-gray-100 text-gray-600 ring-gray-200";
  return <span className={`${badgeBase} ${cls}`}>{value}</span>;
}

function TicketPriorityBadge({ value }: { value: string }) {
  const cls =
    value === "Urgente"
      ? "bg-red-50 text-red-700 ring-red-200"
      : value === "Haute"
        ? "bg-orange-50 text-orange-700 ring-orange-200"
        : value === "Moyenne"
          ? "bg-blue-50 text-blue-700 ring-blue-200"
          : "bg-gray-100 text-gray-700 ring-gray-200";
  return <span className={`${badgeBase} ${cls}`}>{value}</span>;
}

function TicketCriticalityBadge({ value }: { value: string }) {
  const cls =
    value === "Critique"
      ? "bg-red-50 text-red-700 ring-red-200"
      : value === "Haute"
        ? "bg-orange-50 text-orange-700 ring-orange-200"
        : value === "Moyenne"
          ? "bg-blue-50 text-blue-700 ring-blue-200"
          : "bg-gray-100 text-gray-700 ring-gray-200";
  return <span className={`${badgeBase} ${cls}`}>{value}</span>;
}

function TicketSlaBadge({ value, remaining }: TicketSlaView) {
  const cls =
    value === "Respecté"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : value === "En risque"
        ? "bg-orange-50 text-orange-700 ring-orange-200"
        : value === "Dépassé"
          ? "bg-red-50 text-red-700 ring-red-200"
          : "bg-gray-100 text-gray-600 ring-gray-200";
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`${badgeBase} ${cls}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        {value}
      </span>
      {remaining ? <span className="text-[11px] text-muted-foreground">{remaining}</span> : null}
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold text-white"
      style={{ background: "var(--gradient-cgi)" }}
    >
      {initials}
    </span>
  );
}

function getTicketSlaView(ticket: Ticket, slaByTicketId: Map<number, SlaUrgentTicketResponse>): TicketSlaView {
  const urgent = slaByTicketId.get(ticket.id);
  if (!urgent) {
    return { status: "Non applicable" };
  }
  if (urgent.globalStatus === "BREACHED") {
    return { status: "Dépassé", remaining: formatRemainingTime(urgent.remainingMinutes) };
  }
  if (urgent.globalStatus === "AT_RISK") {
    return { status: "En risque", remaining: formatRemainingTime(urgent.remainingMinutes) };
  }
  if (urgent.globalStatus === "RESPECTED") {
    return { status: "Respecté", remaining: formatRemainingTime(urgent.remainingMinutes) };
  }
  return { status: "Non applicable" };
}

function cleanTicketPayload(form: TicketCreatePayload): TicketCreatePayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type ?? "INCIDENT",
    category: cleanString(form.category),
    subCategory: cleanString(form.subCategory),
    priority: form.priority ?? "MEDIUM",
    criticality: form.criticality ?? "MEDIUM",
    departmentId: form.departmentId ?? null,
  };
}

function cleanString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readTicketError(caught: unknown, fallback: string) {
  if (caught instanceof TicketApiError && caught.status === 400) {
    return caught.message || "La requête ticket est invalide.";
  }
  if (caught instanceof TicketApiError && (caught.status === 401 || caught.status === 403)) {
    return "Votre session ne permet pas d'accéder aux tickets.";
  }
  return caught instanceof Error ? caught.message : fallback;
}

function formatTicketStatus(ticket: Ticket) {
  return ticket.statusLabel || statusOptions.find((option) => option.value === ticket.status)?.label || ticket.status;
}

function formatTicketPriority(ticket: Ticket) {
  return ticket.priorityLabel || priorityOptions.find((option) => option.value === ticket.priority)?.label || ticket.priority;
}

function formatTicketCriticality(ticket: Ticket) {
  return ticket.criticalityLabel || criticalityOptions.find((option) => option.value === ticket.criticality)?.label || ticket.criticality;
}

function formatTicketType(ticket: Ticket) {
  return ticket.typeLabel || typeOptions.find((option) => option.value === ticket.type)?.label || ticket.type;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Aucune donnée";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRemainingTime(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return undefined;
  }
  const absolute = Math.abs(Math.round(value));
  if (absolute < 60) {
    return value < 0 ? `Dépassé de ${absolute} min` : `Reste ${absolute} min`;
  }
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const formatted = minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
  return value < 0 ? `Dépassé de ${formatted}` : `Reste ${formatted}`;
}

function isClosedTicket(status: TicketStatus) {
  return ["RESOLVED", "CLOSED", "CANCELLED"].includes(status);
}
