import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Clock3,
  Eye,
  Filter,
  LoaderCircle,
  Plus,
  RefreshCw,
  Upload,
  Users,
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
  availabilityOptions,
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
  type EmployeeStatus,
} from "@/lib/api/employees";
import { getBusinessRoleLabel, useAuth, type Role } from "@/lib/auth-store";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Disponibilité des employés - CGI-Intranet" },
      {
        name: "description",
        content: "Vue globale des employés, de leur compte et de leur disponibilité.",
      },
    ],
  }),
  component: EmployeesPage,
});

type AvailabilityFilter = "all" | "AVAILABLE" | "IN_COMMUNICATION" | "OFFLINE" | "LEAVE";
type RoleFilter = "all" | Role | "UNKNOWN";
type AccountStatusFilter = "all" | EmployeeStatus | "UNKNOWN";

interface AccountProfile {
  id: number;
  keycloakId: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  accountStatus: "ACTIVE" | "INACTIVE";
}

const pageSize = 25;

function EmployeesPage() {
  const { hasRole, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole("ADMIN");
  const isManager = hasRole("MANAGER");
  const canAccess = isAdmin || isManager;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<AccountProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [bannette, setBannette] = useState("all");
  const [role, setRole] = useState<RoleFilter>("all");
  const [accountStatus, setAccountStatus] = useState<AccountStatusFilter>("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<EmployeePayload>(emptyEmployeeForm);
  const [submitting, setSubmitting] = useState(false);
  const [pendingBannetteId, setPendingBannetteId] = useState<number | null>(null);

  const accountByEmployeeKey = useMemo(() => buildAccountIndex(accounts), [accounts]);

  const loadEmployees = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loadedEmployees = await fetchEmployees(authenticatedFetch);
      setEmployees(loadedEmployees);
      if (isAdmin) {
        try {
          setAccounts(await fetchAccountProfiles(authenticatedFetch));
        } catch (caught) {
          setAccounts([]);
          setError(readEmployeeError(caught, "Employés chargés, mais les comptes sont indisponibles."));
        }
      } else {
        setAccounts([]);
      }
    } catch (caught) {
      setError(readEmployeeError(caught, "Impossible de charger les employés."));
      setEmployees([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, canAccess, isAdmin]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((item) => item.department).filter(Boolean))).sort(),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = normalize(query);
    return employees.filter((employee) => {
      const account = getAccountForEmployee(employee, accountByEmployeeKey);
      const employeeRole = account?.role ?? "UNKNOWN";
      const employeeAccountStatus = resolveAccountStatus(employee, account);
      const matchesQuery =
        !normalizedQuery ||
        normalize(employee.fullName).includes(normalizedQuery) ||
        normalize(employee.email ?? "").includes(normalizedQuery) ||
        normalize(employee.jobTitle ?? "").includes(normalizedQuery) ||
        normalize(employee.department).includes(normalizedQuery) ||
        normalize(employee.bannette ?? "").includes(normalizedQuery) ||
        normalize(account?.email ?? "").includes(normalizedQuery) ||
        normalize(account?.fullName ?? "").includes(normalizedQuery);
      const matchesDepartment = department === "all" || employee.department === department;
      const matchesBannette = bannette === "all" || employee.bannette === bannette;
      const matchesRole = role === "all" || employeeRole === role;
      const matchesAccountStatus =
        accountStatus === "all" || employeeAccountStatus === accountStatus;
      const matchesAvailability =
        availability === "all" || toAvailabilityFilter(employee.availabilityStatus) === availability;
      return (
        matchesQuery &&
        matchesDepartment &&
        matchesBannette &&
        matchesRole &&
        matchesAccountStatus &&
        matchesAvailability
      );
    }).sort((a, b) => a.id - b.id);
  }, [accountByEmployeeKey, accountStatus, availability, bannette, department, employees, query, role]);

  const summary = useMemo(() => {
    const counters = {
      total: filteredEmployees.length,
      AVAILABLE: 0,
      IN_COMMUNICATION: 0,
      OFFLINE: 0,
      LEAVE: 0,
    };
    for (const employee of filteredEmployees) {
      counters[toAvailabilityFilter(employee.availabilityStatus)] += 1;
    }
    return counters;
  }, [filteredEmployees]);

  useEffect(() => {
    setPage(1);
  }, [accountStatus, availability, bannette, department, query, role]);

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
      setNotice("Profil employé créé.");
      await loadEmployees();
    } catch (caught) {
      setError(readEmployeeError(caught, "La création du profil employé a échoué."));
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
      setNotice(`Bannette de ${employee.fullName} mise à jour.`);
    } catch (caught) {
      setError(readEmployeeError(caught, "La mise à jour de la bannette a échoué."));
    } finally {
      setPendingBannetteId(null);
    }
  }

  return (
    <AppShell lockScroll>
      <RoleGuard
        allowedRoles={["ADMIN", "MANAGER"]}
        message="La gestion globale des employés est réservée aux Pilotes et Superviseurs. Les Agents consultent leur profil depuis Mon profil."
      >
        <div className="mx-auto flex h-full w-full max-w-[1500px] min-h-0 flex-col space-y-4 overflow-hidden">
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 shrink-0 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Disponibilité des employés</h1>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Vue globale des employés, de leur compte et de leur disponibilité.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadEmployees()} disabled={loading}>
                <RefreshCw className={loading ? "animate-spin" : ""} />
                Actualiser
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => void navigate({ to: "/employees/import" })}
                  >
                    <Upload />
                    Import Excel
                  </Button>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus />
                    Créer un employé
                  </Button>
                </>
              )}
            </div>
          </div>

          {isManager && !isAdmin && (
            <div className="shrink-0 rounded-xl border border-cgi-violet/25 bg-gradient-cgi-soft px-4 py-3 text-sm text-cgi-purple">
              Superviseur: la visibilité backend dépend du rattachement `managerKeycloakId` des employés.
            </div>
          )}

          {error && <AlertMessage tone="error" message={error} />}
          {notice && <AlertMessage tone="success" message={notice} />}

          <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Total employés" value={summary.total} icon={Users} />
            <SummaryCard label="Disponibles" value={summary.AVAILABLE} icon={BadgeCheck} />
            <SummaryCard label="Occupés" value={summary.IN_COMMUNICATION} icon={Clock3} />
            <SummaryCard label="Indisponibles" value={summary.OFFLINE} icon={CircleSlash} />
            <SummaryCard label="En congé" value={summary.LEAVE} icon={BriefcaseBusiness} />
          </div>

          <div className="shrink-0 rounded-2xl border border-border/60 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filtres
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Input
                className="xl:col-span-2"
                placeholder="Rechercher nom, email, poste..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <FilterSelect value={department} onChange={setDepartment} placeholder="Département">
                <SelectItem value="all">Tous les départements</SelectItem>
                {departments.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </FilterSelect>
              <FilterSelect value={bannette} onChange={setBannette} placeholder="Bannette">
                <SelectItem value="all">Toutes les bannettes</SelectItem>
                {bannetteOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </FilterSelect>
              <FilterSelect
                value={role}
                onChange={(value) => setRole(value as RoleFilter)}
                placeholder="Rôle"
              >
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="ADMIN">Pilote</SelectItem>
                <SelectItem value="MANAGER">Superviseur</SelectItem>
                <SelectItem value="EMPLOYEE">Agent</SelectItem>
                <SelectItem value="UNKNOWN">Rôle non renseigné</SelectItem>
              </FilterSelect>
              <FilterSelect
                value={accountStatus}
                onChange={(value) => setAccountStatus(value as AccountStatusFilter)}
                placeholder="Compte"
              >
                <SelectItem value="all">Tous les statuts compte</SelectItem>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="INACTIVE">Inactif</SelectItem>
                <SelectItem value="ON_LEAVE">En congé</SelectItem>
                <SelectItem value="UNKNOWN">Non renseigné</SelectItem>
              </FilterSelect>
              <FilterSelect
                value={availability}
                onChange={(value) => setAvailability(value as AvailabilityFilter)}
                placeholder="Disponibilité"
              >
                <SelectItem value="all">Toutes les disponibilités</SelectItem>
                {availabilityOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </FilterSelect>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-semibold">Tableau de disponibilité</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {filteredEmployees.length} / {employees.length}
              </span>
            </div>

            {loading ? (
              <LoadingState />
            ) : filteredEmployees.length === 0 ? (
              <EmptyState label="Aucun employé ne correspond aux filtres." />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="hidden min-w-full lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Poste</TableHead>
                        <TableHead>Département</TableHead>
                        <TableHead>Bannette</TableHead>
                        <TableHead>Compte</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Disponibilité</TableHead>
                        <TableHead>Mise à jour</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleEmployees.map((employee) => (
                        <EmployeeTableRow
                          key={employee.id}
                          employee={employee}
                          account={getAccountForEmployee(employee, accountByEmployeeKey)}
                          pending={pendingBannetteId === employee.id}
                          canPatchBannette={isAdmin || isManager}
                          onPatchBannette={patchBannette}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 p-3 lg:hidden">
                  {visibleEmployees.map((employee) => (
                    <EmployeeMobileCard
                      key={employee.id}
                      employee={employee}
                      account={getAccountForEmployee(employee, accountByEmployeeKey)}
                      pending={pendingBannetteId === employee.id}
                      canPatchBannette={isAdmin || isManager}
                      onPatchBannette={patchBannette}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && filteredEmployees.length > pageSize && (
              <div className="flex shrink-0 flex-col gap-3 border-t border-border/70 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span>
                  Affichage {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, filteredEmployees.length)} sur{" "}
                  {filteredEmployees.length}
                </span>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    <ChevronLeft />
                    Précédent
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
          <DialogContent className="max-h-[min(92dvh,760px)] max-w-2xl overflow-y-auto">
            <form onSubmit={submitCreate}>
              <DialogHeader>
                <DialogTitle>Créer un profil employé</DialogTitle>
                <DialogDescription>
                  Création manuelle du profil opérationnel. Aucun compte Keycloak n'est créé ici.
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
                  label="Département"
                  required
                  value={createForm.department}
                  onChange={(department) => setCreateForm({ ...createForm, department })}
                />
                <EmployeeSelectField
                  label="Bannette"
                  value={String(createForm.bannette ?? "")}
                  onChange={(value) => setCreateForm({ ...createForm, bannette: value })}
                />
                <TextField
                  label="Poste"
                  value={String(createForm.jobTitle ?? "")}
                  onChange={(jobTitle) => setCreateForm({ ...createForm, jobTitle })}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={String(createForm.email ?? "")}
                  onChange={(email) => setCreateForm({ ...createForm, email })}
                />
                <TextField
                  label="Statut opérationnel"
                  value={String(createForm.operationalStatus ?? "")}
                  onChange={(operationalStatus) =>
                    setCreateForm({ ...createForm, operationalStatus })
                  }
                />
                <TextField
                  label="Statut activité"
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
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <LoaderCircle className="animate-spin" />}
                  Créer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </RoleGuard>
    </AppShell>
  );
}

function EmployeeTableRow({
  employee,
  account,
  pending,
  canPatchBannette,
  onPatchBannette,
}: {
  employee: Employee;
  account: AccountProfile | undefined;
  pending: boolean;
  canPatchBannette: boolean;
  onPatchBannette: (employee: Employee, bannette: string) => Promise<void>;
}) {
  return (
    <TableRow>
      <TableCell className="text-xs text-muted-foreground">{employee.id}</TableCell>
      <TableCell className="min-w-56">
        <div className="flex items-center gap-3">
          <ProfileAvatar
            fullName={employee.fullName}
            email={employee.email}
            profilePhotoUrl={employee.profilePhotoUrl}
            size="sm"
          />
          <div className="min-w-0">
            <div className="break-words font-medium">{employee.fullName}</div>
            <div className="break-all text-xs text-muted-foreground">
              {formatValue(employee.email)}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>{formatValue(employee.jobTitle)}</TableCell>
      <TableCell>{employee.department}</TableCell>
      <TableCell className="min-w-44">
        {canPatchBannette ? (
          <Select
            value={employee.bannette ?? undefined}
            disabled={pending}
            onValueChange={(value) => void onPatchBannette(employee, value)}
          >
            <SelectTrigger aria-label={`Bannette de ${employee.fullName}`}>
              <SelectValue placeholder="Affecter" />
            </SelectTrigger>
            <SelectContent>
              {bannetteOptions.map((item) => (
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
        <AccountBadges employee={employee} account={account} />
      </TableCell>
      <TableCell>{account ? getBusinessRoleLabel(account.role) : "Non renseigné"}</TableCell>
      <TableCell>
        <div className="font-medium">
          {formatAvailabilityStatus(employee.availabilityStatus ?? "OFFLINE")}
        </div>
        <div className="text-xs text-muted-foreground">{formatValue(employee.operationalStatus)}</div>
      </TableCell>
      <TableCell>{formatDate(employee.updatedAt)}</TableCell>
      <TableCell className="text-right">
        <Button asChild size="sm" variant="outline">
          <Link to="/employees/$id" params={{ id: String(employee.id) }}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Eye />}
            Détails
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function EmployeeMobileCard({
  employee,
  account,
  pending,
  canPatchBannette,
  onPatchBannette,
}: {
  employee: Employee;
  account: AccountProfile | undefined;
  pending: boolean;
  canPatchBannette: boolean;
  onPatchBannette: (employee: Employee, bannette: string) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-4">
      <div className="flex items-start gap-3">
        <ProfileAvatar
          fullName={employee.fullName}
          email={employee.email}
          profilePhotoUrl={employee.profilePhotoUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="break-words font-semibold">{employee.fullName}</div>
          <div className="break-all text-xs text-muted-foreground">{formatValue(employee.email)}</div>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/employees/$id" params={{ id: String(employee.id) }}>
            <Eye />
            Détails
          </Link>
        </Button>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <InfoLine label="Poste" value={formatValue(employee.jobTitle)} />
        <InfoLine label="Département" value={employee.department} />
        <InfoLine label="Rôle" value={account ? getBusinessRoleLabel(account.role) : "Non renseigné"} />
        <InfoLine
          label="Disponibilité"
          value={formatAvailabilityStatus(employee.availabilityStatus ?? "OFFLINE")}
        />
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Compte</span>
          <AccountBadges employee={employee} account={account} />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Bannette</span>
          {canPatchBannette ? (
            <Select
              value={employee.bannette ?? undefined}
              disabled={pending}
              onValueChange={(value) => void onPatchBannette(employee, value)}
            >
              <SelectTrigger aria-label={`Bannette de ${employee.fullName}`}>
                <SelectValue placeholder="Affecter" />
              </SelectTrigger>
              <SelectContent>
                {bannetteOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="font-medium">{formatValue(employee.bannette)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountBadges({
  employee,
  account,
}: {
  employee: Employee;
  account: AccountProfile | undefined;
}) {
  const linked = Boolean(employee.userKeycloakId || account);
  const status = resolveAccountStatus(employee, account);
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={linked ? "secondary" : "outline"}>{linked ? "Compte lié" : "Non lié"}</Badge>
      <Badge variant={status === "INACTIVE" ? "destructive" : "outline"}>
        {status === "UNKNOWN" ? "Compte inconnu" : formatStatus(status)}
      </Badge>
    </div>
  );
}

function AlertMessage({ tone, message }: { tone: "error" | "success"; message: string }) {
  const success = tone === "success";
  return (
    <div
      className={
        success
          ? "flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          : "flex shrink-0 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      }
    >
      {success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {message}
    </div>
  );
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function EmployeeSelectField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value || undefined} onValueChange={onChange}>
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
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value}</span>
    </div>
  );
}

async function fetchAccountProfiles(authenticatedFetch: Fetcher) {
  const response = await authenticatedFetch("/api/auth/users");
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<AccountProfile[]>;
}

function buildAccountIndex(accounts: AccountProfile[]) {
  const index = new Map<string, AccountProfile>();
  for (const account of accounts) {
    index.set(`keycloak:${account.keycloakId}`, account);
    index.set(`email:${normalize(account.email)}`, account);
  }
  return index;
}

function getAccountForEmployee(employee: Employee, index: Map<string, AccountProfile>) {
  if (employee.userKeycloakId) {
    const byKeycloak = index.get(`keycloak:${employee.userKeycloakId}`);
    if (byKeycloak) return byKeycloak;
  }
  if (employee.email) {
    return index.get(`email:${normalize(employee.email)}`);
  }
  return undefined;
}

function resolveAccountStatus(employee: Employee, account: AccountProfile | undefined) {
  if (account) return account.accountStatus;
  return employee.status ?? "UNKNOWN";
}

function toAvailabilityFilter(status: AvailabilityStatus | null | undefined): Exclude<AvailabilityFilter, "all"> {
  if (status === "AVAILABLE" || status === "IN_COMMUNICATION" || status === "LEAVE") {
    return status;
  }
  return "OFFLINE";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function readEmployeeError(caught: unknown, fallback: string) {
  if (caught instanceof ApiError && caught.status === 400) {
    return "Données invalides: vérifiez la bannette, le département et les champs obligatoires.";
  }
  if (caught instanceof ApiError && caught.status === 401) {
    return "Authentification requise.";
  }
  if (caught instanceof ApiError && caught.status === 403) {
    return "Accès refusé par le backend pour cette opération.";
  }
  if (caught instanceof ApiError && caught.status === 404) {
    return "Profil employé introuvable.";
  }
  if (caught instanceof ApiError && caught.status === 409) {
    return "Un profil employé existe déjà pour ce compte ou cet email.";
  }
  return fallback;
}
