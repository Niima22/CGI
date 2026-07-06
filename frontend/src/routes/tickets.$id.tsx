import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  FileText,
  LoaderCircle,
  MessageSquareMore,
  RefreshCw,
  ShieldAlert,
  Ticket as TicketIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState, formatDate, formatValue } from "@/components/employees/employee-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, SectionSurface } from "@/components/ui/page";
import { Progress } from "@/components/ui/progress";
import {
  getTicketSla,
  recalculateTicketSla,
  SlaApiError,
  type TicketSlaResponse,
} from "@/lib/api/sla";
import {
  fetchTicket,
  fetchTicketHistory,
  TicketApiError,
  type Ticket,
  type TicketCriticality,
  type TicketHistoryActionType,
  type TicketHistoryEntry,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/api/tickets";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/tickets/$id")({
  head: () => ({
    meta: [
      { title: "Détail du ticket - CGI-FLOW" },
      { name: "description", content: "Détail, historique et suivi SLA d'un ticket." },
    ],
  }),
  component: TicketDetailPage,
});

function TicketDetailPage() {
  const { id } = Route.useParams();
  const { authenticatedFetch, isAuthenticated, isReady } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [sla, setSla] = useState<TicketSlaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [slaLoading, setSlaLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slaError, setSlaError] = useState<string | null>(null);

  const loadSla = useCallback(async () => {
    if (!isReady || !isAuthenticated) {
      setSla(null);
      setSlaLoading(false);
      return;
    }
    setSlaLoading(true);
    try {
      const response = await getTicketSla(authenticatedFetch, id);
      setSla(response);
      setSlaError(null);
    } catch (caught) {
      if (caught instanceof SlaApiError && caught.status === 404) {
        setSla(null);
        setSlaError(null);
        return;
      }
      setSla(null);
      setSlaError(readSlaError(caught));
    } finally {
      setSlaLoading(false);
    }
  }, [authenticatedFetch, id, isAuthenticated, isReady]);

  const loadDetail = useCallback(async () => {
    if (!isReady) {
      return;
    }
    if (!isAuthenticated) {
      setTicket(null);
      setHistory([]);
      setLoading(false);
      setError("Votre session ne permet pas d'accéder à ce ticket.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ticketResponse, historyResponse] = await Promise.all([
        fetchTicket(authenticatedFetch, id),
        fetchTicketHistory(authenticatedFetch, id),
      ]);
      setTicket(ticketResponse);
      setHistory(historyResponse);
      await loadSla();
    } catch (caught) {
      setError(readTicketError(caught, "Impossible de charger le détail du ticket."));
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, id, isAuthenticated, isReady, loadSla]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  async function handleRecalculateSla() {
    setRecalculating(true);
    try {
      await recalculateTicketSla(authenticatedFetch, id);
      toast.success("Le SLA a été recalculé.");
      await loadDetail();
    } catch (caught) {
      setSlaError(readSlaError(caught));
      toast.error("Impossible de recalculer le SLA.");
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          icon={<TicketIcon className="h-5 w-5" />}
          title="Détail du ticket"
          description="Vue complète du ticket, de son historique et du suivi SLA."
          actions={
            <>
              <Button asChild variant="outline" size="sm">
                <Link to="/tickets">
                  <ArrowLeft />
                  Retour aux tickets
                </Link>
              </Button>
              {ticket ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/messages"
                    search={{
                      ticketId: ticket.id,
                      ticketReference: ticket.reference,
                    }}
                  >
                    <MessageSquareMore />
                    Discussion
                  </Link>
                </Button>
              ) : null}
            </>
          }
        />

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <SectionSurface className="flex min-h-64 items-center justify-center p-6">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </SectionSurface>
        ) : ticket ? (
          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.95fr]">
            <SectionSurface className="p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {ticket.reference}
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{ticket.title}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TicketBadge tone={statusTone(ticket.status)}>{ticket.statusLabel || ticket.status}</TicketBadge>
                  <TicketBadge tone={priorityTone(ticket.priority)}>
                    {ticket.priorityLabel || ticket.priority}
                  </TicketBadge>
                  <TicketBadge tone={criticalityTone(ticket.criticality)}>
                    {ticket.criticalityLabel || ticket.criticality}
                  </TicketBadge>
                </div>
              </div>

              <div className="space-y-5">
                <DetailBlock icon={<FileText className="h-4 w-4" />} label="Description">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{ticket.description}</p>
                </DetailBlock>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <DetailItem label="Type" value={ticket.typeLabel || ticket.type} />
                  <DetailItem label="Catégorie" value={formatValue(ticket.category)} />
                  <DetailItem label="Sous-catégorie" value={formatValue(ticket.subCategory)} />
                  <DetailItem label="Demandeur" value={formatValue(ticket.requesterId)} />
                  <DetailItem label="Utilisateur assigné" value={formatValue(ticket.assignedUserId)} />
                  <DetailItem label="Équipe assignée" value={formatValue(ticket.assignedTeamId)} />
                  <DetailItem label="Département" value={formatValue(ticket.departmentId)} />
                  <DetailItem label="Créé le" value={formatDate(ticket.createdAt)} />
                  <DetailItem label="Mis à jour le" value={formatDate(ticket.updatedAt)} />
                  <DetailItem label="Assigné le" value={formatNullableDate(ticket.assignedAt)} />
                  <DetailItem label="Pris en charge le" value={formatNullableDate(ticket.startedAt)} />
                  <DetailItem label="Résolu le" value={formatNullableDate(ticket.resolvedAt)} />
                  <DetailItem label="Fermé le" value={formatNullableDate(ticket.closedAt)} />
                </div>
              </div>
            </SectionSurface>

            <div className="space-y-5">
              <SectionSurface className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Suivi SLA</h3>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void handleRecalculateSla()} disabled={recalculating}>
                    {recalculating ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                    Recalculer le SLA
                  </Button>
                </div>

                {slaLoading ? (
                  <div className="text-sm text-muted-foreground">Chargement du suivi SLA...</div>
                ) : slaError ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    Impossible de charger le suivi SLA.
                  </div>
                ) : sla ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/70 px-4 py-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Statut SLA</div>
                        <div className="mt-1">
                          <TicketBadge tone={slaTone(sla.globalStatus)}>{sla.globalStatusLabel}</TicketBadge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Règle appliquée</div>
                        <div className="mt-1 text-sm font-medium text-foreground">
                          {sla.policyName || "Non applicable"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailItem label="Deadline de prise en charge" value={formatNullableDate(sla.responseDeadline)} />
                      <DetailItem label="Deadline de résolution" value={formatNullableDate(sla.resolutionDeadline)} />
                      <DetailItem label="Temps écoulé" value={formatMinutes(sla.elapsedMinutes)} />
                      <DetailItem label="Temps restant" value={formatMinutes(sla.remainingMinutes)} />
                      <DetailItem label="Statut de prise en charge" value={sla.responseStatusLabel} />
                      <DetailItem label="Statut de résolution" value={sla.resolutionStatusLabel} />
                      <DetailItem label="Premier traitement" value={formatNullableDate(sla.firstResponseAt)} />
                      <DetailItem label="Dernier calcul" value={formatNullableDate(sla.lastCalculatedAt)} />
                    </div>

                    <div className="space-y-2 rounded-md border border-border bg-background/70 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">Progression SLA</span>
                        <span className="text-sm font-semibold text-foreground">{formatPercentage(sla.consumedPercentage)}</span>
                      </div>
                      <Progress
                        value={normalizeProgressValue(sla.consumedPercentage)}
                        className={progressToneClass(sla.globalStatus)}
                      />
                    </div>

                    {sla.breachReason && (
                      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span className="font-medium">Raison de dépassement :</span> {sla.breachReason}
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState label="Aucun suivi SLA disponible pour ce ticket." />
                )}
              </SectionSurface>

              <SectionSurface className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">Historique</h3>
                </div>

                {history.length === 0 ? (
                  <EmptyState label="Aucun historique pour ce ticket." />
                ) : (
                  <div className="space-y-4">
                    {history.map((entry, index) => (
                      <div key={entry.id} className="relative pl-6">
                        {index < history.length - 1 && (
                          <div className="absolute left-[7px] top-7 h-[calc(100%+0.75rem)] w-px bg-border" />
                        )}
                        <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border border-border bg-cgi-gradient" />
                        <div className="rounded-md border border-border bg-background/70 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <TicketBadge tone={historyTone(entry.actionType)}>
                              {formatHistoryAction(entry)}
                            </TicketBadge>
                            <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                          </div>
                          <div className="mt-2 space-y-2 text-sm">
                            <TimelineItem label="Effectué par" value={String(entry.performedBy)} />
                            <TimelineItem label="Commentaire" value={formatValue(entry.comment)} />
                            <TimelineItem label="Ancienne valeur" value={formatValue(entry.oldValue)} />
                            <TimelineItem label="Nouvelle valeur" value={formatValue(entry.newValue)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionSurface>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AppShell>
  );
}

function DetailBlock({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 px-3 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="break-words text-foreground">{value}</div>
    </div>
  );
}

function TicketBadge({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <Badge variant="outline" className={tone}>
      {children}
    </Badge>
  );
}

function formatNullableDate(value: string | null) {
  return value ? formatDate(value) : "-";
}

function formatMinutes(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return `${value} min`;
}

function formatPercentage(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return `${Math.round(value)} %`;
}

function normalizeProgressValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

function readTicketError(caught: unknown, fallback: string) {
  if (caught instanceof TicketApiError && caught.status === 404) {
    return "Ticket introuvable.";
  }
  if (caught instanceof TicketApiError && (caught.status === 401 || caught.status === 403)) {
    return "Votre session ne permet pas d'accéder à ce ticket.";
  }
  return caught instanceof Error ? caught.message : fallback;
}

function readSlaError(caught: unknown) {
  if (caught instanceof SlaApiError && (caught.status === 401 || caught.status === 403)) {
    return "Impossible de charger le suivi SLA.";
  }
  if (caught instanceof Error) {
    return caught.message;
  }
  return "Impossible de charger le suivi SLA.";
}

function formatHistoryAction(entry: TicketHistoryEntry) {
  if (entry.actionTypeLabel) {
    return entry.actionTypeLabel;
  }

  const labels: Record<TicketHistoryActionType, string> = {
    CREATED: "Création",
    UPDATED: "Mise à jour",
    STATUS_CHANGED: "Changement de statut",
    ASSIGNED: "Affectation",
    REASSIGNED: "Réaffectation",
    PRIORITY_CHANGED: "Priorité modifiée",
    CRITICALITY_CHANGED: "Criticité modifiée",
    RESOLVED: "Résolution",
    CLOSED: "Clôture",
    REOPENED: "Réouverture",
    CANCELLED: "Annulation",
    SLA_STARTED: "SLA démarré",
    SLA_AT_RISK: "Ticket en risque SLA",
    SLA_BREACHED: "SLA dépassé",
    SLA_RESPECTED: "SLA respecté",
    SLA_NOT_APPLICABLE: "SLA non applicable",
  };

  return labels[entry.actionType];
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

function historyTone(actionType: TicketHistoryActionType) {
  switch (actionType) {
    case "CREATED":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "UPDATED":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "ASSIGNED":
    case "REASSIGNED":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "PRIORITY_CHANGED":
    case "CRITICALITY_CHANGED":
    case "SLA_AT_RISK":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "RESOLVED":
    case "CLOSED":
    case "SLA_RESPECTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "SLA_BREACHED":
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-[color:var(--cgi-red)]";
    case "SLA_STARTED":
    case "SLA_NOT_APPLICABLE":
    case "REOPENED":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "STATUS_CHANGED":
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function slaTone(status: TicketSlaResponse["globalStatus"]) {
  switch (status) {
    case "RESPECTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "AT_RISK":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "BREACHED":
      return "border-red-200 bg-red-50 text-[color:var(--cgi-red)]";
    case "PAUSED":
    case "NOT_APPLICABLE":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function progressToneClass(status: TicketSlaResponse["globalStatus"]) {
  switch (status) {
    case "RESPECTED":
      return "[&>div]:bg-emerald-500";
    case "AT_RISK":
      return "[&>div]:bg-amber-500";
    case "BREACHED":
      return "[&>div]:bg-red-500";
    case "PAUSED":
    case "NOT_APPLICABLE":
    default:
      return "[&>div]:bg-slate-400";
  }
}
