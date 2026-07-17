import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  LoaderCircle,
  PencilLine,
  Plus,
  Power,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { RoleGuard } from "@/components/app/RoleGuard";
import { EmptyState, LoadingState, formatDate, formatValue } from "@/components/employees/employee-ui";
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
import { PageContainer, PageHeader, SectionSurface, StatCard } from "@/components/ui/page";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DepartmentApiError,
  createDepartment,
  fetchDepartments,
  updateDepartment,
  updateDepartmentStatus,
  type Department,
  type DepartmentPayload,
} from "@/lib/api/departments";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Départements - CGI-Intranet" },
      { name: "description", content: "Gestion des départements." },
    ],
  }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { authenticatedFetch } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentPayload>({
    name: "",
    description: "",
    managerKeycloakId: "",
  });

  const activeCount = useMemo(() => departments.filter((item) => item.active).length, [departments]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDepartments(await fetchDepartments(authenticatedFetch, true));
    } catch (caught) {
      setError(readDepartmentError(caught, "Impossible de charger les départements."));
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  function openCreateDialog() {
    setEditingDepartment(null);
    setForm({ name: "", description: "", managerKeycloakId: "" });
    setDialogOpen(true);
  }

  function openEditDialog(department: Department) {
    setEditingDepartment(department);
    setForm({
      name: department.name,
      description: department.description ?? "",
      managerKeycloakId: department.managerKeycloakId ?? "",
    });
    setDialogOpen(true);
  }

  async function submitDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const payload = cleanDepartmentPayload(form);
      if (editingDepartment) {
        await updateDepartment(authenticatedFetch, editingDepartment.id, payload);
        setNotice("Département mis à jour.");
      } else {
        await createDepartment(authenticatedFetch, payload);
        setNotice("Département créé.");
      }
      setDialogOpen(false);
      await loadDepartments();
    } catch (caught) {
      setError(readDepartmentError(caught, "La sauvegarde du département a échoué."));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleDepartmentStatus(department: Department) {
    setError(null);
    setNotice(null);
    try {
      await updateDepartmentStatus(authenticatedFetch, department.id, !department.active);
      setNotice(department.active ? "Département désactivé." : "Département activé.");
      await loadDepartments();
    } catch (caught) {
      setError(readDepartmentError(caught, "La mise à jour du statut a échoué."));
    }
  }

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["ADMIN"]}
        message="La gestion des départements est réservée aux Pilotes."
      >
        <PageContainer maxWidth="6xl">
          <PageHeader
            icon={<Building2 className="h-5 w-5" />}
            title="Départements"
            description="Référentiel administratif des unités d'organisation."
            actions={
              <>
                <Button variant="outline" onClick={() => void loadDepartments()} disabled={loading}>
                  <RefreshCw className={loading ? "animate-spin" : ""} />
                  Actualiser
                </Button>
                <Button onClick={openCreateDialog}>
                  <Plus />
                  Créer un département
                </Button>
              </>
            }
          />

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {notice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              {notice}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total départements" value={departments.length} />
            <StatCard label="Actifs" value={activeCount} />
            <StatCard label="Inactifs" value={departments.length - activeCount} />
          </div>

          <SectionSurface className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5 sm:px-5">
              <span className="text-sm font-semibold">Liste des départements</span>
              <span className="text-xs text-muted-foreground">{departments.length} éléments</span>
            </div>

            {loading ? (
              <LoadingState />
            ) : departments.length === 0 ? (
              <EmptyState label="Aucun département n'est encore enregistré." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Mis à jour</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell className="max-w-[280px] text-muted-foreground">
                        {formatValue(department.description)}
                      </TableCell>
                      <TableCell>{formatValue(department.managerKeycloakId)}</TableCell>
                      <TableCell>{department.active ? "Actif" : "Inactif"}</TableCell>
                      <TableCell>{formatDate(department.createdAt)}</TableCell>
                      <TableCell>{formatDate(department.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(department)}>
                            <PencilLine />
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleDepartmentStatus(department)}
                          >
                            <Power />
                            {department.active ? "Désactiver" : "Activer"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionSurface>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-2xl">
              <form onSubmit={submitDepartment}>
                <DialogHeader>
                  <DialogTitle>
                    {editingDepartment ? "Modifier le département" : "Créer un département"}
                  </DialogTitle>
                  <DialogDescription>
                    Le nom du département sert de référence aux profils employés existants.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-5 md:grid-cols-2">
                  <Input
                    required
                    placeholder="Nom du département"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="md:col-span-2"
                  />
                  <Textarea
                    placeholder="Description"
                    rows={4}
                    value={form.description ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                    className="md:col-span-2"
                  />
                  <Input
                    placeholder="Manager Keycloak ID"
                    value={form.managerKeycloakId ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, managerKeycloakId: event.target.value }))
                    }
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <LoaderCircle className="animate-spin" />}
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </PageContainer>
      </RoleGuard>
    </AppShell>
  );
}

function cleanDepartmentPayload(form: DepartmentPayload): DepartmentPayload {
  return {
    name: form.name.trim(),
    description: cleanOptional(form.description),
    managerKeycloakId: cleanOptional(form.managerKeycloakId),
  };
}

function cleanOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readDepartmentError(caught: unknown, fallback: string) {
  if (caught instanceof DepartmentApiError && caught.status === 403) {
    return "Accès refusé par le backend pour cette opération.";
  }
  if (caught instanceof DepartmentApiError && caught.status === 404) {
    return "Département introuvable.";
  }
  if (caught instanceof DepartmentApiError && caught.status === 409) {
    return "Un département avec ce nom existe déjà.";
  }
  return fallback;
}
