import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Eye,
  Filter,
  LoaderCircle,
  PhoneCall,
  Plus,
  RefreshCw,
  Upload,
  Users,
  WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ProfileAvatar } from "@/components/app/ProfileAvatar";
import { RoleGuard } from "@/components/app/RoleGuard";
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
  EmptyState,
  LoadingState,
  TextField,
  bannetteOptions,
  cleanEmployeePayload,
  emptyEmployeeForm,
  formatAvailabilityStatus,
  formatDate,
  formatStatus,
  formatValue,
} from "@/components/employees/employee-ui";
import {
  ApiError,
  type AvailabilityStatus,
  createEmployee,
  fetchEmployees,
  updateEmployeeBannette,
  type Employee,
  type EmployeePayload,
} from "@/lib/api/employees";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Gestion des employes - CGI-Intranet" },
      {
        name: "description",
        content: "Gestion des profils employes, bannettes et rattachements CGI-Intranet.",
      },
    ],
  }),
  component: EmployeesPage,
});

type LinkedFilter = "all" | "linked" | "unlinked";
type AvailabilityFilter = "all" | AvailabilityStatus;
const pageSize = 25;

function EmployeesPage() {
  const { hasRole, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole("ADMIN");
  const isManager = hasRole("MANAGER");
  const canAccess = isAdmin || isManager;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [bannette, setBannette] = useState("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [linked, setLinked] = useState<LinkedFilter>("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<EmployeePayload>(emptyEmployeeForm);
  const [submitting, setSubmitting] = useState(false);
  const [pendingBannetteId, setPendingBannetteId] = useState<number | null>(null);

  const loadEmployees = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setEmployees(await fetchEmployees(authenticatedFetch));
    } catch (caught) {
      setError(readEmployeeError(caught, "Impossible de charger les employes."));
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, canAccess]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((item) => item.department).filter(Boolean))).sort(),
    [employees],
  );
  const bannettes = useMemo(
    () =>
      Array.from(
        new Set([...bannetteOptions, ...employees.map((item) => item.bannette ?? "").filter(Boolean)]),
      ).sort(),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = normalize(query);
    return employees.filter((employee) => {
      const matchesQuery =
        !normalizedQuery ||
        normalize(employee.fullName).includes(normalizedQuery) ||
        normalize(employee.email ?? "").includes(normalizedQuery) ||
        normalize(employee.jobTitle ?? "").includes(normalizedQuery) ||
        normalize(employee.department).includes(normalizedQuery) ||
        normalize(employee.bannette ?? "").includes(normalizedQuery);
      const matchesDepartment = department === "all" || employee.department === department;
      const matchesBannette = bannette === "all" || employee.bannette === bannette;
      const matchesAvailability =
        availability === "all" || employee.availabilityStatus === availability;
      const matchesLinked =
        linked === "all" ||
        (linked === "linked" && Boolean(employee.userKeycloakId)) ||
        (linked === "unlinked" && !employee.userKeycloakId);
      return (
        matchesQuery &&
        matchesDepartment &&
        matchesBannette &&
        matchesAvailability &&
        matchesLinked
      );
    });
  }, [availability, bannette, department, employees, linked, query]);

  const summary = useMemo(() => {
    const counters = {
      total: filteredEmployees.length,
      AVAILABLE: 0,
      BREAK: 0,
      IN_COMMUNICATION: 0,
      LEAVE: 0,
      OFFLINE: 0,
    };
    for (const employee of filteredEmployees) {
      const status = employee.availabilityStatus ?? "OFFLINE";
      counters[status] += 1;
    }
    return counters;
  }, [filteredEmployees]);

  useEffect(() => {
    setPage(1);
  }, [availability, bannette, department, linked, query]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [currentPage, filteredEmployees]);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await createEmployee(authenticatedFetch, cleanEmployeePayload(createForm));
      setCreateOpen(false);
      setCreateForm(emptyEmployeeForm);
      setNotice("Profil employe cree.");
      await loadEmployees();
    } catch (caught) {
      setError(readEmployeeError(caught, "La creation du profil employe a echoue."));
    } finally {
      setSubmitting(false);
    }
  }

  async function patchBannette(employee: Employee, nextBannette: string) {
    setPendingBannetteId(employee.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateEmployeeBannette(authenticatedFetch, employee.id, nextBannette);
      setEmployees((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(`Bannette de ${employee.fullName} mise a jour.`);
    } catch (caught) {
      setError(readEmployeeError(caught, "La mise a jour de la bannette a echoue."));
    } finally {
      setPendingBannetteId(null);
    }
  }

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER"]}
        message="La gestion globale des employés est réservée aux Pilotes et Superviseurs. Les Agents consultent leur profil depuis Mon profil."
      >
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Disponibilite equipe</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? "Vue globale des employes, de leur statut de compte et de leur disponibilite."
                : "Vue des employes retournes par votre perimetre actuel. Le filtrage d'equipe reste limite au modele manager existant."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadEmployees()} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Actualiser
            </Button>
            {isAdmin && (
              <>
                <Button variant="outline" onClick={() => void navigate({ to: "/employees/import" })}>
                  <Upload />
                  Import Excel
                </Button>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus />
                  Creer un employe
                </Button>
              </>
            )}
          </div>
        </div>

        {isManager && !isAdmin && (
          <div className="rounded-xl border border-cgi-violet/25 bg-gradient-cgi-soft px-4 py-3 text-sm text-cgi-purple">
            Superviseur: la visibilite depend du rattachement `managerKeycloakId` des employes.
            Si toute l'equipe n'est pas encore rattachee, la liste peut etre partielle.
          </div>
        )}

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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label="Total employes" value={summary.total} icon={Users} />
          <SummaryCard label="Disponibles" value={summary.AVAILABLE} icon={BadgeCheck} />
          <SummaryCard label="En pause" value={summary.BREAK} icon={Coffee} />
          <SummaryCard
            label="En communication"
            value={summary.IN_COMMUNICATION}
            icon={PhoneCall}
          />
          <SummaryCard label="En conge" value={summary.LEAVE} icon={BriefcaseBusiness} />
          <SummaryCard label="Hors ligne" value={summary.OFFLINE} icon={WifiOff} />
        </div>

        <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filtres
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <Input
              placeholder="Rechercher nom, email, poste..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Departement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les departements</SelectItem>
                {departments.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bannette} onValueChange={setBannette}>
              <SelectTrigger>
                <SelectValue placeholder="Bannette" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les bannettes</SelectItem>
                {bannettes.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availability} onValueChange={(value) => setAvailability(value as AvailabilityFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Disponibilite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les disponibilites</SelectItem>
                <SelectItem value="AVAILABLE">Disponible</SelectItem>
                <SelectItem value="BREAK">Pause</SelectItem>
                <SelectItem value="IN_COMMUNICATION">En communication</SelectItem>
                <SelectItem value="LEAVE">Conge</SelectItem>
                <SelectItem value="OFFLINE">Hors ligne</SelectItem>
              </SelectContent>
            </Select>
            <Select value={linked} onValueChange={(value) => setLinked(value as LinkedFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Lien compte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les liens compte</SelectItem>
                <SelectItem value="linked">Comptes lies</SelectItem>
                <SelectItem value="unlinked">Sans compte lie</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Tableau de disponibilite</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredEmployees.length} / {employees.length}
            </span>
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredEmployees.length === 0 ? (
            <EmptyState label="Aucun employe ne correspond aux filtres." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Departement</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Disponibilite</TableHead>
                  <TableHead>Mise a jour</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEmployees.map((employee) => {
                  const pending = pendingBannetteId === employee.id;
                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="text-xs text-muted-foreground">{employee.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ProfileAvatar
                            fullName={employee.fullName}
                            email={employee.email}
                            profilePhotoUrl={employee.profilePhotoUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-medium">{employee.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatValue(employee.email)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatValue(employee.jobTitle)}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell className="min-w-44">
                        {isAdmin || isManager ? (
                          <Select
                            value={employee.bannette ?? ""}
                            disabled={pending}
                            onValueChange={(value) => void patchBannette(employee, value)}
                          >
                            <SelectTrigger aria-label={`Bannette de ${employee.fullName}`}>
                              <SelectValue placeholder="Affecter" />
                            </SelectTrigger>
                            <SelectContent>
                              {bannettes.map((item) => (
                                <SelectItem key={item} value={item}>
                                  {item}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          formatValue(employee.bannette)
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={employee.userKeycloakId ? "secondary" : "outline"}>
                            {employee.userKeycloakId ? "Compte lie" : "Non lie"}
                          </Badge>
                          <Badge variant="outline">
                            {employee.status ? formatStatus(employee.status) : "Compte inconnu"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatAvailabilityStatus(employee.availabilityStatus ?? "OFFLINE")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatValue(employee.operationalStatus)}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(employee.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/employees/$id" params={{ id: String(employee.id) }}>
                            {pending ? <LoaderCircle className="animate-spin" /> : <Eye />}
                            Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!loading && filteredEmployees.length > pageSize && (
            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span>
                Affichage {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredEmployees.length)} sur{" "}
                {filteredEmployees.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft />
                  Precedent
                </Button>
                <span className="min-w-20 text-center text-xs">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  Suivant
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={submitCreate}>
            <DialogHeader>
              <DialogTitle>Creer un profil employe</DialogTitle>
              <DialogDescription>
                Creation manuelle du profil operationnel. Aucun compte Keycloak n'est cree ici.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5 md:grid-cols-2">
              <TextField
                label="Nom complet"
                required
                value={createForm.fullName}
                onChange={(fullName) => setCreateForm({ ...createForm, fullName })}
              />
              <TextField
                label="Departement"
                required
                value={createForm.department}
                onChange={(department) => setCreateForm({ ...createForm, department })}
              />
              <TextField
                label="Bannette"
                value={String(createForm.bannette ?? "")}
                onChange={(value) => setCreateForm({ ...createForm, bannette: value })}
              />
              <TextField
                label="Email"
                type="email"
                value={String(createForm.email ?? "")}
                onChange={(email) => setCreateForm({ ...createForm, email })}
              />
              <TextField
                label="Statut operationnel"
                value={String(createForm.operationalStatus ?? "")}
                onChange={(operationalStatus) =>
                  setCreateForm({ ...createForm, operationalStatus })
                }
              />
              <TextField
                label="Statut activite"
                value={String(createForm.activityStatus ?? "")}
                onChange={(activityStatus) => setCreateForm({ ...createForm, activityStatus })}
              />
              <TextField
                label="Keycloak ID utilisateur"
                value={String(createForm.userKeycloakId ?? "")}
                onChange={(userKeycloakId) => setCreateForm({ ...createForm, userKeycloakId })}
              />
              <TextField
                label="Keycloak ID superviseur"
                value={String(createForm.managerKeycloakId ?? "")}
                onChange={(managerKeycloakId) =>
                  setCreateForm({ ...createForm, managerKeycloakId })
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <LoaderCircle className="animate-spin" />}
                Creer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </RoleGuard>
    </AppShell>
  );
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function readEmployeeError(caught: unknown, fallback: string) {
  if (caught instanceof ApiError && caught.status === 403) {
    return "Acces refuse par le backend pour cette operation.";
  }
  if (caught instanceof ApiError && caught.status === 404) {
    return "Profil employe introuvable.";
  }
  return fallback;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
        </div>
        <div className="rounded-md border border-border bg-muted/40 p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
