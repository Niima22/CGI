import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Clock, LoaderCircle, Pencil, Plus, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { RoleGuard } from "@/components/app/RoleGuard";
import { formatDate } from "@/components/employees/employee-ui";
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
import {
  createSlaPolicy,
  getSlaPolicies,
  SlaApiError,
  updateSlaPolicy,
  updateSlaPolicyStatus,
  type SlaPolicyPayload,
  type SlaPolicyResponse,
} from "@/lib/api/sla";
import { type TicketCriticality, type TicketPriority, type TicketType } from "@/lib/api/tickets";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/sla/policies")({
  head: () => ({
    meta: [
      { title: "Règles SLA - CGI-Intranet" },
      {
        name: "description",
        content: "Gestion des règles SLA appliquées aux tickets.",
      },
    ],
  }),
  component: SlaPoliciesPage,
});

const incidentTypeOptions: Array<{ value: TicketType; label: string }> = [
  { value: "INCIDENT", label: "Incident" },
  { value: "REQUEST", label: "Demande" },
  { value: "PROBLEM", label: "Problème" },
  { value: "CHANGE", label: "Changement" },
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

const emptyPolicyForm: SlaPolicyPayload = {
  name: "",
  incidentType: "INCIDENT",
  priority: "MEDIUM",
  criticality: "MEDIUM",
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 240,
  warningThresholdPercent: 80,
};

function SlaPoliciesPage() {
  const { authenticatedFetch, hasRole, isAuthenticated, isReady } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const [policies, setPolicies] = useState<SlaPolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingPolicyId, setPendingPolicyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicyResponse | null>(null);
  const [form, setForm] = useState<SlaPolicyPayload>(emptyPolicyForm);

  const dialogTitle = editingPolicy ? "Modifier une règle SLA" : "Créer une règle SLA";
  const dialogDescription = editingPolicy
    ? "Mettez à jour les paramètres de la règle sélectionnée."
    : "Définissez une nouvelle règle SLA appliquée aux tickets.";

  const sortedPolicies = useMemo(
    () =>
      [...policies].sort((a, b) => {
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }
        return a.name.localeCompare(b.name, "fr");
      }),
    [policies],
  );

  const loadPolicies = useCallback(async () => {
    if (!isReady) {
      return;
    }
    if (!isAuthenticated) {
      setPolicies([]);
      setLoading(false);
      setError("Votre session ne permet pas d'accéder aux règles SLA.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPolicies(await getSlaPolicies(authenticatedFetch));
    } catch (caught) {
      setError(readSlaPolicyError(caught, "Impossible de charger les règles SLA."));
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, isAuthenticated, isReady]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  function openCreateDialog() {
    setEditingPolicy(null);
    setForm(emptyPolicyForm);
    setDialogOpen(true);
  }

  function openEditDialog(policy: SlaPolicyResponse) {
    setEditingPolicy(policy);
    setForm({
      name: policy.name,
      incidentType: policy.incidentType,
      priority: policy.priority,
      criticality: policy.criticality,
      responseTimeMinutes: policy.responseTimeMinutes,
      resolutionTimeMinutes: policy.resolutionTimeMinutes,
      warningThresholdPercent: policy.warningThresholdPercent,
    });
    setDialogOpen(true);
  }

  async function submitPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      if (editingPolicy) {
        await updateSlaPolicy(authenticatedFetch, editingPolicy.id, cleanPolicyPayload(form));
        setNotice("Règle SLA mise à jour.");
      } else {
        await createSlaPolicy(authenticatedFetch, cleanPolicyPayload(form));
        setNotice("Règle SLA créée.");
      }
      setDialogOpen(false);
      setEditingPolicy(null);
      setForm(emptyPolicyForm);
      await loadPolicies();
    } catch (caught) {
      setError(readSlaPolicyError(caught, "Impossible d'enregistrer la règle SLA."));
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePolicyStatus(policy: SlaPolicyResponse) {
    setPendingPolicyId(policy.id);
    setError(null);
    setNotice(null);
    try {
      await updateSlaPolicyStatus(authenticatedFetch, policy.id, !policy.active);
      setNotice(`Règle SLA ${!policy.active ? "activée" : "désactivée"}.`);
      await loadPolicies();
    } catch (caught) {
      setError(
        readSlaPolicyError(caught, "Impossible de mettre à jour le statut de la règle SLA."),
      );
    } finally {
      setPendingPolicyId(null);
    }
  }

  return (
    <AppShell lockScroll>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER"]}
        message="Le suivi des SLA est réservé aux Pilotes et aux Superviseurs."
      >
        <div className="mx-auto flex h-full w-full max-w-[1500px] min-h-0 flex-col space-y-4">
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Règles SLA</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Paramétrez les temps de prise en charge, de résolution et les seuils d&apos;alerte.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadPolicies()} disabled={loading}>
                <RefreshCw className={loading ? "animate-spin" : ""} />
                Actualiser
              </Button>
              {isAdmin && (
                <Button onClick={openCreateDialog}>
                  <Plus />
                  Créer une règle SLA
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {notice && (
            <div className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </div>
          )}

          <div className="grid shrink-0 gap-3 md:grid-cols-4">
            <SummaryCard label="Règles total" value={String(policies.length)} />
            <SummaryCard
              label="Actives"
              value={String(policies.filter((policy) => policy.active).length)}
            />
            <SummaryCard
              label="Inactives"
              value={String(policies.filter((policy) => !policy.active).length)}
            />
            <SummaryCard
              label="Seuil moyen"
              value={
                policies.length === 0
                  ? "0 %"
                  : `${Math.round(
                      policies.reduce((sum, policy) => sum + policy.warningThresholdPercent, 0) /
                        policies.length,
                    )} %`
              }
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card">
            <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-3.5 sm:px-5">
              <span className="text-sm font-semibold">Liste des règles</span>
              <span className="text-xs text-muted-foreground">
                {sortedPolicies.length} élément(s)
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-52 items-center justify-center">
                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedPolicies.length === 0 ? (
              <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
                Aucune règle SLA définie.
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type d&apos;incident</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Criticité</TableHead>
                      <TableHead>Prise en charge</TableHead>
                      <TableHead>Résolution</TableHead>
                      <TableHead>Seuil d&apos;alerte</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPolicies.map((policy) => {
                      const pending = pendingPolicyId === policy.id;
                      return (
                        <TableRow key={policy.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">{policy.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Créée le {formatDate(policy.createdAt)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{policy.incidentTypeLabel}</TableCell>
                          <TableCell>{policy.priorityLabel}</TableCell>
                          <TableCell>{policy.criticalityLabel}</TableCell>
                          <TableCell>{policy.responseTimeMinutes} min</TableCell>
                          <TableCell>{policy.resolutionTimeMinutes} min</TableCell>
                          <TableCell>{policy.warningThresholdPercent} %</TableCell>
                          <TableCell>
                            <Badge variant={policy.active ? "secondary" : "outline"}>
                              {policy.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {isAdmin && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditDialog(policy)}
                                  >
                                    <Pencil />
                                    Modifier
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={policy.active ? "outline" : "secondary"}
                                    disabled={pending}
                                    onClick={() => void togglePolicyStatus(policy)}
                                  >
                                    {pending && <LoaderCircle className="animate-spin" />}
                                    {policy.active ? "Désactiver" : "Activer"}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingPolicy(null);
              setForm(emptyPolicyForm);
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <form onSubmit={submitPolicy}>
              <DialogHeader>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogDescription>{dialogDescription}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-5 md:grid-cols-2">
                <Field label="Nom">
                  <Input
                    required
                    maxLength={180}
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </Field>

                <SelectField
                  label="Type d’incident"
                  value={form.incidentType}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, incidentType: value as TicketType }))
                  }
                  options={incidentTypeOptions}
                />

                <SelectField
                  label="Priorité"
                  value={form.priority}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, priority: value as TicketPriority }))
                  }
                  options={priorityOptions}
                />

                <SelectField
                  label="Criticité"
                  value={form.criticality}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, criticality: value as TicketCriticality }))
                  }
                  options={criticalityOptions}
                />

                <Field label="Temps de prise en charge en minutes">
                  <Input
                    required
                    min={1}
                    type="number"
                    value={form.responseTimeMinutes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        responseTimeMinutes: Number(event.target.value),
                      }))
                    }
                  />
                </Field>

                <Field label="Temps de résolution en minutes">
                  <Input
                    required
                    min={1}
                    type="number"
                    value={form.resolutionTimeMinutes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        resolutionTimeMinutes: Number(event.target.value),
                      }))
                    }
                  />
                </Field>

                <Field label="Seuil d’alerte en %">
                  <Input
                    required
                    min={1}
                    max={100}
                    type="number"
                    value={form.warningThresholdPercent}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        warningThresholdPercent: Number(event.target.value),
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
                  {editingPolicy ? "Enregistrer" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </RoleGuard>
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

function SelectField({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white px-4 py-3 shadow-card">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function cleanPolicyPayload(form: SlaPolicyPayload): SlaPolicyPayload {
  return {
    ...form,
    name: form.name.trim(),
    responseTimeMinutes: Number(form.responseTimeMinutes),
    resolutionTimeMinutes: Number(form.resolutionTimeMinutes),
    warningThresholdPercent: Number(form.warningThresholdPercent),
  };
}

function readSlaPolicyError(caught: unknown, fallback: string) {
  if (caught instanceof SlaApiError && (caught.status === 401 || caught.status === 403)) {
    return "Votre session ne permet pas d'accéder aux règles SLA.";
  }
  if (caught instanceof Error) {
    return caught.message;
  }
  return fallback;
}
