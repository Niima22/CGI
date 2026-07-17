import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Link2,
  LoaderCircle,
  Save,
  Unlink,
  UserRoundCog,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { RoleGuard } from "@/components/app/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AccessDenied,
  EmployeeField,
  LoadingState,
  StatusBadge,
  TextField,
  bannetteOptions,
  cleanEmployeePayload,
  formatDate,
  formatValue,
  toEmployeeForm,
} from "@/components/employees/employee-ui";
import {
  ApiError,
  updateEmployeeDepartment,
  assignEmployeeManager,
  fetchEmployee,
  linkEmployeeUser,
  updateEmployee,
  updateEmployeeBannette,
  type Employee,
  type EmployeePayload,
} from "@/lib/api/employees";
import { DepartmentApiError, fetchDepartments, type Department } from "@/lib/api/departments";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/employees/$id")({
  head: () => ({
    meta: [
      { title: "Detail employe - CGI-Intranet" },
      {
        name: "description",
        content: "Detail et administration d'un profil employe CGI-Intranet.",
      },
    ],
  }),
  component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
  const { id } = Route.useParams();
  const { hasRole, authenticatedFetch } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const isManager = hasRole("MANAGER");
  const canAccess = isAdmin || isManager;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeePayload | null>(null);
  const [bannette, setBannette] = useState("");
  const [linkUserKeycloakId, setLinkUserKeycloakId] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [managerKeycloakId, setManagerKeycloakId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadEmployee = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loaded = await fetchEmployee(authenticatedFetch, id);
      const loadedDepartments = isAdmin
        ? await fetchDepartments(authenticatedFetch, false)
        : [];
      setEmployee(loaded);
      setForm(toEmployeeForm(loaded));
      setBannette(loaded.bannette ?? "");
      setLinkUserKeycloakId(loaded.userKeycloakId ?? "");
      setLinkEmail(loaded.email ?? "");
      setManagerKeycloakId(loaded.managerKeycloakId ?? "");
      setDepartments(loadedDepartments);
      const matchingDepartment = loadedDepartments.find((item) => item.name === loaded.department);
      setDepartmentId(matchingDepartment ? String(matchingDepartment.id) : "");
    } catch (caught) {
      setError(readDetailError(caught, "Impossible de charger ce profil employe."));
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, canAccess, id]);

  useEffect(() => {
    void loadEmployee();
  }, [loadEmployee]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !employee) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateEmployee(authenticatedFetch, employee.id, cleanEmployeePayload(form));
      applyEmployee(updated);
      setNotice("Profil employe mis a jour.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise a jour du profil a echoue."));
    } finally {
      setSaving(false);
    }
  }

  async function saveBannette() {
    if (!employee || !bannette.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateEmployeeBannette(authenticatedFetch, employee.id, bannette.trim());
      applyEmployee(updated);
      setNotice("Bannette mise a jour.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise a jour de la bannette a echoue."));
    } finally {
      setSaving(false);
    }
  }

  async function saveLink() {
    if (!employee) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await linkEmployeeUser(authenticatedFetch, employee.id, {
        userKeycloakId: linkUserKeycloakId.trim() || null,
        email: linkEmail.trim() || null,
      });
      applyEmployee(updated);
      setNotice("Lien compte mis a jour.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise a jour du lien compte a echoue."));
    } finally {
      setSaving(false);
    }
  }

  async function unlinkUser() {
    if (!employee) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await linkEmployeeUser(authenticatedFetch, employee.id, {
        userKeycloakId: null,
        email: employee.email,
      });
      applyEmployee(updated);
      setNotice("Profil dissocie du compte Keycloak.");
    } catch (caught) {
      setError(readDetailError(caught, "La dissociation du compte a echoue."));
    } finally {
      setSaving(false);
    }
  }

  async function saveManager() {
    if (!employee) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await assignEmployeeManager(
        authenticatedFetch,
        employee.id,
        managerKeycloakId.trim() || null,
      );
      applyEmployee(updated);
      setNotice("Superviseur assigne.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise a jour du superviseur a echoue."));
    } finally {
      setSaving(false);
    }
  }

  async function saveDepartment() {
    if (!employee || !departmentId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateEmployeeDepartment(authenticatedFetch, employee.id, Number(departmentId));
      applyEmployee(updated);
      setNotice("Département mis à jour.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise à jour du département a échoué."));
    } finally {
      setSaving(false);
    }
  }

  function applyEmployee(updated: Employee) {
    setEmployee(updated);
    setForm(toEmployeeForm(updated));
    setBannette(updated.bannette ?? "");
    setLinkUserKeycloakId(updated.userKeycloakId ?? "");
    setLinkEmail(updated.email ?? "");
    setManagerKeycloakId(updated.managerKeycloakId ?? "");
  }

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER"]}
        message="Les Agents ne consultent pas les profils globaux. Utilisez Mon profil pour voir vos informations."
      >
      <div className="mx-auto w-full max-w-[1200px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserRoundCog className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Detail employe</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {employee ? employee.fullName : "Chargement du profil"}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/employees">Retour aux employes</Link>
          </Button>
        </div>

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

        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-white shadow-card">
            <LoadingState />
          </div>
        ) : employee && form ? (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Profil operationnel</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Informations employee-service.
                    </p>
                  </div>
                  <StatusBadge employee={employee} />
                </div>

                {isAdmin ? (
                  <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
                    <TextField
                      label="Nom complet"
                      required
                      value={form.fullName}
                      onChange={(fullName) => setForm({ ...form, fullName })}
                    />
                    <TextField
                      label="Departement"
                      required
                      value={form.department}
                      onChange={(department) => setForm({ ...form, department })}
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={String(form.email ?? "")}
                      onChange={(email) => setForm({ ...form, email })}
                    />
                    <TextField
                      label="Bannette"
                      value={String(form.bannette ?? "")}
                      onChange={(value) => setForm({ ...form, bannette: value })}
                    />
                    <TextField
                      label="Statut operationnel"
                      value={String(form.operationalStatus ?? "")}
                      onChange={(operationalStatus) => setForm({ ...form, operationalStatus })}
                    />
                    <TextField
                      label="Statut activite"
                      value={String(form.activityStatus ?? "")}
                      onChange={(activityStatus) => setForm({ ...form, activityStatus })}
                    />
                    <TextField
                      label="Adresse"
                      value={String(form.address ?? "")}
                      onChange={(address) => setForm({ ...form, address })}
                    />
                    <div className="flex items-end justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
                        Enregistrer
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <Info label="Nom" value={employee.fullName} />
                    <Info label="Departement" value={employee.department} />
                    <Info label="Email" value={employee.email} />
                    <Info label="Bannette" value={employee.bannette} />
                    <Info label="Statut operationnel" value={employee.operationalStatus} />
                    <Info label="Statut activite" value={employee.activityStatus} />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                <h2 className="text-sm font-semibold">Synthese</h2>
                <div className="mt-4 grid gap-3 text-sm">
                  <Info label="ID employee" value={employee.id} />
                  <Info label="Compte Keycloak" value={employee.userKeycloakId} />
                  <Info label="Superviseur" value={employee.managerKeycloakId} />
                  <Info label="Cree le" value={formatDate(employee.createdAt)} />
                  <Info label="Mis a jour le" value={formatDate(employee.updatedAt)} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                <h2 className="text-sm font-semibold">Affectation bannette</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pilote et Superviseur peuvent demander une mise a jour. Le backend valide le
                  perimetre.
                </p>
                <div className="mt-4 grid gap-3">
                  <EmployeeField label="Bannette">
                    <Select value={bannette} onValueChange={setBannette}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une bannette" />
                      </SelectTrigger>
                      <SelectContent>
                        {bannetteOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </EmployeeField>
                  <Button disabled={saving || !bannette.trim()} onClick={() => void saveBannette()}>
                    {saving && <LoaderCircle className="animate-spin" />}
                    Mettre a jour
                  </Button>
                </div>
              </div>

              {isAdmin && (
                <>
                  <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                    <h2 className="text-sm font-semibold">Département</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Affectation administrative du profil employé.
                    </p>
                    <div className="mt-4 grid gap-3">
                      <EmployeeField label="Département">
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir un département" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </EmployeeField>
                      <Button disabled={saving || !departmentId} onClick={() => void saveDepartment()}>
                        {saving && <LoaderCircle className="animate-spin" />}
                        Assigner
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                    <h2 className="text-sm font-semibold">Lien compte</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Rattachement au compte Keycloak existant.
                    </p>
                    <div className="mt-4 grid gap-3">
                      <TextField
                        label="Keycloak ID utilisateur"
                        value={linkUserKeycloakId}
                        onChange={setLinkUserKeycloakId}
                      />
                      <TextField label="Email lie" type="email" value={linkEmail} onChange={setLinkEmail} />
                      <div className="flex gap-2">
                        <Button disabled={saving} onClick={() => void saveLink()}>
                          <Link2 />
                          Lier
                        </Button>
                        <Button disabled={saving} variant="outline" onClick={() => void unlinkUser()}>
                          <Unlink />
                          Dissocier
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                    <h2 className="text-sm font-semibold">Superviseur</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Affectation au Superviseur par identifiant Keycloak.
                    </p>
                    <div className="mt-4 grid gap-3">
                      <TextField
                        label="Keycloak ID superviseur"
                        value={managerKeycloakId}
                        onChange={setManagerKeycloakId}
                      />
                      <Button disabled={saving} onClick={() => void saveManager()}>
                        {saving && <LoaderCircle className="animate-spin" />}
                        Assigner
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {isManager && !isAdmin && (
              <div className="rounded-xl border border-cgi-violet/25 bg-gradient-cgi-soft px-4 py-3 text-sm text-cgi-purple">
                Superviseur: les controles de lien compte, creation utilisateur et assignation
                globale sont reserves aux Pilotes.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-border bg-card p-8 text-center shadow-card">
            <Badge variant="outline">Introuvable</Badge>
            <p className="mt-3 text-sm text-muted-foreground">Aucun profil employe charge.</p>
          </div>
        )}
      </div>
      </RoleGuard>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{formatValue(value)}</div>
    </div>
  );
}

function readDetailError(caught: unknown, fallback: string) {
  if (caught instanceof ApiError && caught.status === 403) {
    return "Acces refuse par le backend pour cette operation.";
  }
  if (caught instanceof DepartmentApiError && caught.status === 403) {
    return "Accès refusé par le backend pour cette opération.";
  }
  if (caught instanceof ApiError && caught.status === 404) {
    return "Profil employe introuvable.";
  }
  if (caught instanceof DepartmentApiError && caught.status === 404) {
    return "Département introuvable.";
  }
  return fallback;
}
