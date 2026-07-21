import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Link2,
  LoaderCircle,
  Save,
  ToggleLeft,
  ToggleRight,
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
  EmployeeField,
  LoadingState,
  StatusBadge,
  TextField,
  availabilityOptions,
  bannetteOptions,
  cleanEmployeePayload,
  formatDate,
  formatStatus,
  formatValue,
  toEmployeeForm,
} from "@/components/employees/employee-ui";
import {
  ApiError,
  assignEmployeeManager,
  fetchEmployee,
  linkEmployeeUser,
  updateEmployee,
  updateEmployeeAvailabilityStatus,
  updateEmployeeBannette,
  updateEmployeeDepartment,
  updateEmployeeStatus,
  type AvailabilityStatus,
  type Employee,
  type EmployeePayload,
  type EmployeeStatus,
} from "@/lib/api/employees";
import { DepartmentApiError, fetchDepartments, type Department } from "@/lib/api/departments";
import { getBusinessRoleLabel, useAuth, type Role } from "@/lib/auth-store";

export const Route = createFileRoute("/employees/$id")({
  head: () => ({
    meta: [
      { title: "Détail employé - CGI-Intranet" },
      {
        name: "description",
        content: "Détail et administration d'un profil employé CGI-Intranet.",
      },
    ],
  }),
  component: EmployeeDetailPage,
});

interface AccountProfile {
  id: number;
  keycloakId: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  accountStatus: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

function EmployeeDetailPage() {
  const { id } = Route.useParams();
  const { hasRole, authenticatedFetch } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const isManager = hasRole("MANAGER");
  const canAccess = isAdmin || isManager;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [form, setForm] = useState<EmployeePayload | null>(null);
  const [bannette, setBannette] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("OFFLINE");
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
      const [loadedDepartments, loadedAccount] = await Promise.all([
        isAdmin ? fetchDepartments(authenticatedFetch, false) : Promise.resolve([]),
        isAdmin ? fetchRelatedAccount(authenticatedFetch, loaded) : Promise.resolve(null),
      ]);
      setEmployeeState(loaded, loadedDepartments);
      setAccountProfile(loadedAccount);
    } catch (caught) {
      setError(readDetailError(caught, "Impossible de charger ce profil employé."));
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, canAccess, id, isAdmin]);

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
      setNotice("Profil employé mis à jour.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise à jour du profil a échoué."));
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
      setNotice("Bannette mise à jour.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise à jour de la bannette a échoué."));
    } finally {
      setSaving(false);
    }
  }

  async function saveAvailability() {
    if (!employee) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateEmployeeAvailabilityStatus(
        authenticatedFetch,
        employee.id,
        availabilityStatus,
      );
      applyEmployee(updated);
      setNotice("Disponibilité mise à jour.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise à jour de la disponibilité a échoué."));
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
      setAccountProfile(isAdmin ? await fetchRelatedAccount(authenticatedFetch, updated) : null);
      setNotice("Lien compte mis à jour.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise à jour du lien compte a échoué."));
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
      setAccountProfile(null);
      setNotice("Profil dissocié du compte Keycloak.");
    } catch (caught) {
      setError(readDetailError(caught, "La dissociation du compte a échoué."));
    } finally {
      setSaving(false);
    }
  }

  async function changeRelatedAccountStatus(nextActive: boolean) {
    if (!employee || !accountProfile) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updatedAccount = await updateAuthUserStatus(
        authenticatedFetch,
        accountProfile.id,
        nextActive,
      );
      const updatedEmployee = await updateEmployeeStatus(
        authenticatedFetch,
        employee.id,
        nextActive ? "ACTIVE" : "INACTIVE",
      );
      setAccountProfile(updatedAccount);
      applyEmployee(updatedEmployee);
      setNotice(
        nextActive
          ? "Compte lié activé dans Keycloak et synchronisé."
          : "Compte lié désactivé dans Keycloak et synchronisé.",
      );
    } catch (caught) {
      setError(readDetailError(caught, "La mise à jour du compte lié a échoué."));
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
      setNotice("Superviseur assigné.");
    } catch (caught) {
      setError(readDetailError(caught, "La mise à jour du superviseur a échoué."));
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

  function setEmployeeState(loaded: Employee, loadedDepartments: Department[]) {
    setEmployee(loaded);
    setForm(toEmployeeForm(loaded));
    setBannette(loaded.bannette ?? "");
    setAvailabilityStatus(toVisibleAvailabilityValue(loaded.availabilityStatus));
    setLinkUserKeycloakId(loaded.userKeycloakId ?? "");
    setLinkEmail(loaded.email ?? "");
    setManagerKeycloakId(loaded.managerKeycloakId ?? "");
    setDepartments(loadedDepartments);
    const matchingDepartment = loadedDepartments.find((item) => item.name === loaded.department);
    setDepartmentId(matchingDepartment ? String(matchingDepartment.id) : "");
  }

  function applyEmployee(updated: Employee) {
    setEmployee(updated);
    setForm(toEmployeeForm(updated));
    setBannette(updated.bannette ?? "");
    setAvailabilityStatus(toVisibleAvailabilityValue(updated.availabilityStatus));
    setLinkUserKeycloakId(updated.userKeycloakId ?? "");
    setLinkEmail(updated.email ?? "");
    setManagerKeycloakId(updated.managerKeycloakId ?? "");
    const matchingDepartment = departments.find((item) => item.name === updated.department);
    setDepartmentId(matchingDepartment ? String(matchingDepartment.id) : "");
  }

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER"]}
        message="Les Agents ne consultent pas les profils globaux. Utilisez Mon profil pour voir vos informations."
      >
        <div className="mx-auto w-full max-w-[1200px] space-y-5 overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <UserRoundCog className="h-5 w-5 shrink-0 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Détail employé</h1>
              </div>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {employee ? employee.fullName : "Chargement du profil"}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/employees">Retour aux employés</Link>
            </Button>
          </div>

          {error && <AlertMessage tone="error" message={error} />}
          {notice && <AlertMessage tone="success" message={notice} />}

          {loading ? (
            <div className="rounded-2xl border border-border/60 bg-white shadow-card">
              <LoadingState />
            </div>
          ) : employee && form ? (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card lg:col-span-2">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold">Profil opérationnel</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Données persistées par employee-service.
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
                        label="Département"
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
                      <EmployeeField label="Bannette">
                        <Select
                          value={String(form.bannette ?? "") || undefined}
                          onValueChange={(value) => setForm({ ...form, bannette: value })}
                        >
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
                      <TextField
                        label="Poste"
                        value={String(form.jobTitle ?? "")}
                        onChange={(jobTitle) => setForm({ ...form, jobTitle })}
                      />
                      <TextField
                        label="Statut opérationnel"
                        value={String(form.operationalStatus ?? "")}
                        onChange={(operationalStatus) => setForm({ ...form, operationalStatus })}
                      />
                      <TextField
                        label="Statut activité"
                        value={String(form.activityStatus ?? "")}
                        onChange={(activityStatus) => setForm({ ...form, activityStatus })}
                      />
                      <TextField
                        label="Adresse"
                        value={String(form.address ?? "")}
                        onChange={(address) => setForm({ ...form, address })}
                      />
                      <div className="flex items-end justify-end md:col-span-2">
                        <Button type="submit" disabled={saving}>
                          {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
                          Enregistrer
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      <Info label="Nom" value={employee.fullName} />
                      <Info label="Département" value={employee.department} />
                      <Info label="Email" value={employee.email} />
                      <Info label="Bannette" value={employee.bannette} />
                      <Info label="Statut opérationnel" value={employee.operationalStatus} />
                      <Info label="Statut activité" value={employee.activityStatus} />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                  <h2 className="text-sm font-semibold">Synthèse</h2>
                  <div className="mt-4 grid gap-3 text-sm">
                    <Info label="ID employé" value={employee.id} />
                    <Info label="Compte Keycloak" value={employee.userKeycloakId} />
                    <Info label="Rôle compte" value={accountProfile ? getBusinessRoleLabel(accountProfile.role) : null} />
                    <Info label="Superviseur" value={employee.managerKeycloakId} />
                    <Info label="Créé le" value={formatDate(employee.createdAt)} />
                    <Info label="Mis à jour le" value={formatDate(employee.updatedAt)} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                  <h2 className="text-sm font-semibold">Affectation bannette</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Le backend valide les bannettes autorisées et le périmètre Superviseur.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <EmployeeField label="Bannette">
                      <Select value={bannette || undefined} onValueChange={setBannette}>
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
                      Mettre à jour
                    </Button>
                  </div>
                </div>

                {isAdmin && (
                  <>
                    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                      <h2 className="text-sm font-semibold">Disponibilité</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Action ADMIN sur employee-service.
                      </p>
                      <div className="mt-4 grid gap-3">
                        <EmployeeField label="Disponibilité">
                          <Select
                            value={availabilityStatus}
                            onValueChange={(value) => setAvailabilityStatus(value as AvailabilityStatus)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir une disponibilité" />
                            </SelectTrigger>
                            <SelectContent>
                              {availabilityOptions.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </EmployeeField>
                        <Button disabled={saving} onClick={() => void saveAvailability()}>
                          {saving && <LoaderCircle className="animate-spin" />}
                          Mettre à jour
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                      <h2 className="text-sm font-semibold">Département</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Affectation vers un département actif.
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
                      <h2 className="text-sm font-semibold">Compte lié</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Activation et désactivation via auth-user et Keycloak.
                      </p>
                      <div className="mt-4 grid gap-3">
                        <TextField
                          label="Keycloak ID utilisateur"
                          value={linkUserKeycloakId}
                          onChange={setLinkUserKeycloakId}
                        />
                        <TextField label="Email lié" type="email" value={linkEmail} onChange={setLinkEmail} />
                        <div className="flex flex-wrap gap-2">
                          <Button disabled={saving} onClick={() => void saveLink()}>
                            <Link2 />
                            Lier
                          </Button>
                          <Button disabled={saving} variant="outline" onClick={() => void unlinkUser()}>
                            <Unlink />
                            Dissocier
                          </Button>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background px-3 py-2 text-sm">
                          <div className="text-xs text-muted-foreground">État du compte auth-user</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant={accountProfile?.accountStatus === "INACTIVE" ? "destructive" : "outline"}>
                              {accountProfile
                                ? formatStatus(accountProfile.accountStatus as EmployeeStatus)
                                : "Compte non trouvé"}
                            </Badge>
                            {accountProfile?.role && (
                              <Badge variant="secondary">{getBusinessRoleLabel(accountProfile.role)}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={saving || !accountProfile || accountProfile.active}
                            onClick={() => void changeRelatedAccountStatus(true)}
                          >
                            <ToggleRight />
                            Activer
                          </Button>
                          <Button
                            disabled={saving || !accountProfile || !accountProfile.active}
                            variant="outline"
                            onClick={() => void changeRelatedAccountStatus(false)}
                          >
                            <ToggleLeft />
                            Désactiver
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
                      <h2 className="text-sm font-semibold">Superviseur</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Affectation par identifiant Keycloak.
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
                  Superviseur: les contrôles de lien compte, activation, disponibilité globale et assignation
                  département sont réservés aux Pilotes.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-md border border-border bg-card p-8 text-center shadow-card">
              <Badge variant="outline">Introuvable</Badge>
              <p className="mt-3 text-sm text-muted-foreground">Aucun profil employé chargé.</p>
            </div>
          )}
        </div>
      </RoleGuard>
    </AppShell>
  );
}

function AlertMessage({ tone, message }: { tone: "error" | "success"; message: string }) {
  const success = tone === "success";
  return (
    <div
      className={
        success
          ? "flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          : "flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      }
    >
      {success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {message}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium">{formatValue(value)}</div>
    </div>
  );
}

async function fetchRelatedAccount(authenticatedFetch: Fetcher, employee: Employee) {
  const response = await authenticatedFetch("/api/auth/users");
  if (!response.ok) throw new ApiError(response.status);
  const accounts = (await response.json()) as AccountProfile[];
  return (
    accounts.find((account) => employee.userKeycloakId && account.keycloakId === employee.userKeycloakId) ??
    accounts.find(
      (account) => employee.email && account.email.toLowerCase() === employee.email.toLowerCase(),
    ) ??
    null
  );
}

async function updateAuthUserStatus(authenticatedFetch: Fetcher, accountId: number, active: boolean) {
  const response = await authenticatedFetch(`/api/auth/users/${accountId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<AccountProfile>;
}

function toVisibleAvailabilityValue(status: AvailabilityStatus | null | undefined): AvailabilityStatus {
  if (status === "AVAILABLE" || status === "IN_COMMUNICATION" || status === "LEAVE") {
    return status;
  }
  return "OFFLINE";
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function readDetailError(caught: unknown, fallback: string) {
  if (caught instanceof ApiError && caught.status === 400) {
    return "Données invalides: vérifiez la bannette, le département et les champs obligatoires.";
  }
  if (caught instanceof ApiError && caught.status === 401) {
    return "Authentification requise.";
  }
  if (caught instanceof ApiError && caught.status === 403) {
    return "Accès refusé par le backend pour cette opération.";
  }
  if (caught instanceof DepartmentApiError && caught.status === 403) {
    return "Accès refusé par le backend pour cette opération.";
  }
  if (caught instanceof ApiError && caught.status === 404) {
    return "Profil employé introuvable.";
  }
  if (caught instanceof DepartmentApiError && caught.status === 404) {
    return "Département introuvable.";
  }
  if (caught instanceof ApiError && caught.status === 409) {
    return "Un profil employé existe déjà pour ce compte ou cet email.";
  }
  return fallback;
}
