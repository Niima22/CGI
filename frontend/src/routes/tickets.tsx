import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  CirclePlus,
  LoaderCircle,
  RefreshCw,
  Search,
  Ticket as TicketIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState, LoadingState, formatDate, formatValue } from "@/components/employees/employee-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader, SectionSurface, StatCard } from "@/components/ui/page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "Gestion des incidents - CGI-FLOW" },
      {
        name: "description",
        content: "Suivi, affectation et traitement des tickets.",
      },
    ],
  }),
  component: TicketsPage,
});

const statusOptions: Array<{ value: TicketStatus; label: string }> = [
  { value: "NEW", label: "Nouveau" },
  { value: "TODO", label: "À faire" },
  { value: "ASSIGNED", label: "Assigné" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "WAITING_REQUESTER", label: "En attente demandeur" },
  { value: "WAITING_PROVIDER", label: "En attente prestataire" },
  { value: "WAITING_MANAGER_VALIDATION", label: "En attente validation manager" },
  { value: "RESOLVED", label: "Résolu" },
  { value: "CLOSED", label: "Fermé" },
  { value: "REOPENED", label: "Rouvert" },
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
  { value: "HIGH", label: "Élevée" },
  { value: "CRITICAL", label: "Critique" },
];

const typeOptions: Array<{ value: TicketType; label: string }> = [
  { value: "INCIDENT", label: "Incident" },
  { value: "REQUEST", label: "Demande" },
  { value: "PROBLEM", label: "Problème" },
  { value: "CHANGE", label: "Changement" },
];

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

function TicketsPage() {
  const { authenticatedFetch, hasRole, isAuthenticated, isReady } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [criticalityFilter, setCriticalityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [form, setForm] = useState<TicketCreatePayload>(emptyTicketForm);

  const canCreateTicket = hasRole("ADMIN") || hasRole("MANAGER") || hasRole("EMPLOYEE");

  const loadTickets = useCallback(async () => {
    if (!isReady) {
      return;
    }
    if (!isAuthenticated) {
      setTickets([]);
      setLoading(false);
      setError("Votre session ne permet pas d'accéder aux tickets.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTickets(await fetchTickets(authenticatedFetch));
    } catch (caught) {
      setError(readTicketError(caught, "Impossible de charger les tickets."));
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, isAuthenticated, isReady]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  if (pathname !== "/tickets") {
    return <Outlet />;
  }

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (statusFilter !== "ALL" && ticket.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== "ALL" && ticket.priority !== priorityFilter) {
        return false;
      }
      if (criticalityFilter !== "ALL" && ticket.criticality !== criticalityFilter) {
        return false;
      }
      if (typeFilter !== "ALL" && ticket.type !== typeFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      return [
        ticket.reference,
        ticket.title,
        ticket.category ?? "",
        ticket.subCategory ?? "",
        formatTicketStatus(ticket),
        formatTicketPriority(ticket),
        formatTicketCriticality(ticket),
        formatTicketType(ticket),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [criticalityFilter, priorityFilter, search, statusFilter, tickets, typeFilter]);

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createTicket(authenticatedFetch, cleanTicketPayload(form));
      setDialogOpen(false);
      setForm(emptyTicketForm);
      toast.success("Ticket créé avec succès.");
      await loadTickets();
    } catch (caught) {
      setError(readTicketError(caught, "La création du ticket a échoué."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          icon={<TicketIcon className="h-5 w-5" />}
          title="Gestion des incidents"
          description="Suivi, affectation et traitement des tickets."
          actions={
            <>
              <Button variant="outline" onClick={() => void loadTickets()} disabled={loading}>
                <RefreshCw className={loading ? "animate-spin" : ""} />
                Actualiser
              </Button>
              <Button onClick={() => setDialogOpen(true)} disabled={!canCreateTicket}>
                <CirclePlus />
                Nouveau ticket
              </Button>
            </>
          }
        />

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <SectionSurface className="p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Rechercher par référence, titre, catégorie ou statut"
              />
            </div>
            <FilterSelect label="Statut" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            <FilterSelect label="Priorité" value={priorityFilter} onChange={setPriorityFilter} options={priorityOptions} />
            <FilterSelect
              label="Criticité"
              value={criticalityFilter}
              onChange={setCriticalityFilter}
              options={criticalityOptions}
            />
            <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
          </div>
        </SectionSurface>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Tickets visibles" value={filteredTickets.length} />
          <StatCard label="Nouveaux" value={tickets.filter((ticket) => ticket.status === "NEW").length} />
          <StatCard
            label="Haute priorité"
            value={tickets.filter((ticket) => ticket.priority === "HIGH" || ticket.priority === "URGENT").length}
          />
          <StatCard label="Critiques" value={tickets.filter((ticket) => ticket.criticality === "CRITICAL").length} />
        </div>

        <SectionSurface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5 sm:px-5">
            <span className="text-sm font-semibold">Liste des tickets</span>
            <span className="text-xs text-muted-foreground">{filteredTickets.length} élément(s)</span>
          </div>

          {loading ? (
            <LoadingState label="Chargement des tickets..." />
          ) : filteredTickets.length === 0 ? (
            <EmptyState label="Aucun ticket trouvé. Créez votre premier ticket." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Criticité</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Utilisateur assigné</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {ticket.reference}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{ticket.title}</div>
                        <div className="line-clamp-2 text-xs text-muted-foreground">{ticket.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TicketBadge tone={statusTone(ticket.status)}>{formatTicketStatus(ticket)}</TicketBadge>
                    </TableCell>
                    <TableCell>
                      <TicketBadge tone={priorityTone(ticket.priority)}>{formatTicketPriority(ticket)}</TicketBadge>
                    </TableCell>
                    <TableCell>
                      <TicketBadge tone={criticalityTone(ticket.criticality)}>{formatTicketCriticality(ticket)}</TicketBadge>
                    </TableCell>
                    <TableCell>{formatTicketType(ticket)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{formatValue(ticket.category)}</div>
                        <div className="text-xs text-muted-foreground">{formatValue(ticket.subCategory)}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatValue(ticket.assignedUserId)}</TableCell>
                    <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link reloadDocument to="/tickets/$id" params={{ id: String(ticket.id) }}>
                          Voir détail
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionSurface>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setForm(emptyTicketForm);
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <form onSubmit={submitTicket}>
              <DialogHeader>
                <DialogTitle>Nouveau ticket</DialogTitle>
                <DialogDescription>
                  Créez un ticket d&apos;incident ou de demande pour le suivi opérationnel.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-5 md:grid-cols-2">
                <Field label="Titre">
                  <Input
                    required
                    maxLength={180}
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </Field>

                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={form.type ?? "INCIDENT"}
                    onValueChange={(value) => setForm((current) => ({ ...current, type: value as TicketType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    required
                    rows={5}
                    maxLength={5000}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </div>

                <Field label="Catégorie">
                  <Input
                    value={form.category ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  />
                </Field>

                <Field label="Sous-catégorie">
                  <Input
                    value={form.subCategory ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, subCategory: event.target.value }))}
                  />
                </Field>

                <div className="grid gap-2">
                  <Label>Priorité</Label>
                  <Select
                    value={form.priority ?? "MEDIUM"}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, priority: value as TicketPriority }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Criticité</Label>
                  <Select
                    value={form.criticality ?? "MEDIUM"}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, criticality: value as TicketCriticality }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {criticalityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <LoaderCircle className="animate-spin" />}
                  Créer le ticket
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FilterSelect({
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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Tous</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TicketBadge({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <Badge variant="outline" className={tone}>
      {children}
    </Badge>
  );
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
  return (
    ticket.priorityLabel ||
    priorityOptions.find((option) => option.value === ticket.priority)?.label ||
    ticket.priority
  );
}

function formatTicketCriticality(ticket: Ticket) {
  return (
    ticket.criticalityLabel ||
    criticalityOptions.find((option) => option.value === ticket.criticality)?.label ||
    ticket.criticality
  );
}

function formatTicketType(ticket: Ticket) {
  return ticket.typeLabel || typeOptions.find((option) => option.value === ticket.type)?.label || ticket.type;
}

function statusTone(status: TicketStatus) {
  switch (status) {
    case "NEW":
    case "REOPENED":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "TODO":
    case "WAITING_REQUESTER":
    case "WAITING_PROVIDER":
    case "WAITING_MANAGER_VALIDATION":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ASSIGNED":
    case "IN_PROGRESS":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "RESOLVED":
    case "CLOSED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "CANCELLED":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function priorityTone(priority: TicketPriority) {
  switch (priority) {
    case "LOW":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "MEDIUM":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "HIGH":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "URGENT":
      return "border-red-200 bg-red-50 text-[color:var(--cgi-red)]";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function criticalityTone(criticality: TicketCriticality) {
  switch (criticality) {
    case "LOW":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "MEDIUM":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "HIGH":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "CRITICAL":
      return "border-red-200 bg-red-50 text-[color:var(--cgi-red)]";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}
