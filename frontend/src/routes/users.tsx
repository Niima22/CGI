import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
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
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader, SectionSurface, StatCard } from "@/components/ui/page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBusinessRoleLabel, useAuth, type Role } from "@/lib/auth-store";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Gestion des utilisateurs - CGI Intranet" },
      {
        name: "description",
        content: "Administration des profils utilisateurs de l'application CGI Intranet.",
      },
    ],
  }),
  component: UsersPage,
});

interface UserProfile {
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

interface CreateUserForm {
  fullName: string;
  email: string;
  role: Role;
  temporaryPassword: string;
  active: boolean;
}

interface ResetPasswordForm {
  temporaryPassword: string;
}

const emptyForm: CreateUserForm = {
  fullName: "",
  email: "",
  role: "EMPLOYEE",
  temporaryPassword: "",
  active: true,
};

const emptyResetForm: ResetPasswordForm = {
  temporaryPassword: "",
};

function UsersPage() {
  const { hasRole, authenticatedFetch } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateUserForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserProfile | null>(null);
  const [resetForm, setResetForm] = useState<ResetPasswordForm>(emptyResetForm);
  const [resettingPassword, setResettingPassword] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch("/api/auth/users");
      if (!response.ok) {
        throw new Error(
          await readApiError(response, getUsersError(response.status)),
        );
      }
      setUsers((await response.json()) as UserProfile[]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Impossible de charger les profils utilisateurs.",
      );
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, isAdmin]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await authenticatedFetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, createUserError(response.status)));
      }
      setCreateOpen(false);
      setForm(emptyForm);
      setNotice("Compte Keycloak et profil applicatif crees avec succes.");
      await loadUsers();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "La creation de l'utilisateur a echoue.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateRole(user: UserProfile, role: Role) {
    setPendingUserId(user.id);
    setError(null);
    setNotice(null);
    try {
      const response = await authenticatedFetch(`/api/auth/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "La mise a jour du role metier a echoue."));
      await loadUsers();
      setNotice(`Role metier de ${user.fullName} mis a jour.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "La mise a jour du role metier a echoue.",
      );
    } finally {
      setPendingUserId(null);
    }
  }

  async function toggleStatus(user: UserProfile) {
    setPendingUserId(user.id);
    setError(null);
    setNotice(null);
    try {
      const active = !user.active;
      const response = await authenticatedFetch(`/api/auth/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "La mise a jour du statut a echoue."));
      await loadUsers();
      setNotice(`${user.fullName} est maintenant ${active ? "actif" : "inactif"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La mise a jour du statut a echoue.");
    } finally {
      setPendingUserId(null);
    }
  }

  function openResetPassword(user: UserProfile) {
    setResetTargetUser(user);
    setResetForm(emptyResetForm);
    setResetOpen(true);
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTargetUser) return;

    setResettingPassword(true);
    setError(null);
    setNotice(null);
    try {
      const response = await authenticatedFetch(`/api/auth/users/${resetTargetUser.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetForm),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "La reinitialisation du mot de passe a echoue."),
        );
      }
      setResetOpen(false);
      setResetTargetUser(null);
      setResetForm(emptyResetForm);
      await loadUsers();
      setNotice(
        `Mot de passe temporaire reinitialise pour ${resetTargetUser.fullName}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "La reinitialisation du mot de passe a echoue.",
      );
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["ADMIN"]}
        message="La gestion des utilisateurs est réservée aux Pilotes."
      >
      <PageContainer>
        <PageHeader
          icon={<UserCog className="h-5 w-5" />}
          title="Gestion des utilisateurs"
          description="Profils applicatifs, roles et statut d'acces local."
          actions={
            <>
              <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
                <RefreshCw className={loading ? "animate-spin" : ""} />
                Actualiser
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                Ajouter un utilisateur
              </Button>
            </>
          }
        />

        <div className="rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Depuis cette page, un Pilote cree le compte Keycloak, assigne son role technique et
          synchronise le profil applicatif.
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Profils total" value={String(users.length)} />
          <StatCard
            label="Comptes actifs"
            value={String(users.filter((user) => user.active).length)}
          />
          <StatCard
            label="Comptes inactifs"
            value={String(users.filter((user) => !user.active).length)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {notice && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}

        <SectionSurface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Profils</span>
            </div>
            <span className="text-xs text-muted-foreground">{users.length} utilisateur(s)</span>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
              Aucun profil applicatif.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="w-44">Role metier</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Cree le</TableHead>
                  <TableHead>Mis a jour</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const pending = pendingUserId === user.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="text-xs text-muted-foreground">
                            ID #{user.id} • Keycloak {formatKeycloakId(user.keycloakId)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          disabled={pending}
                          onValueChange={(value) => void updateRole(user, value as Role)}
                        >
                          <SelectTrigger aria-label={`Role metier de ${user.fullName}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EMPLOYEE">{getBusinessRoleLabel("EMPLOYEE")}</SelectItem>
                            <SelectItem value="MANAGER">{getBusinessRoleLabel("MANAGER")}</SelectItem>
                            <SelectItem value="ADMIN">{getBusinessRoleLabel("ADMIN")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={user.active ? "secondary" : "outline"}>
                            {getAccountStatusLabel(user)}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {user.accountStatus}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>{formatDate(user.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => openResetPassword(user)}
                          >
                            <KeyRound />
                            Reinit. mot de passe
                          </Button>
                          <Button
                            size="sm"
                            variant={user.active ? "outline" : "secondary"}
                            disabled={pending}
                            onClick={() => void toggleStatus(user)}
                          >
                            {pending && <LoaderCircle className="animate-spin" />}
                            {user.active ? "Desactiver" : "Activer"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </SectionSurface>
      </PageContainer>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={createUser}>
            <DialogHeader>
              <DialogTitle>Creer un utilisateur</DialogTitle>
              <DialogDescription>
                Le compte Keycloak et le profil applicatif seront crees dans une seule operation.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5 md:grid-cols-2">
              <Field label="Nom complet">
                <Input
                  required
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </Field>
              <Field label="Mot de passe temporaire">
                <Input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={form.temporaryPassword}
                  onChange={(event) =>
                    setForm({ ...form, temporaryPassword: event.target.value })
                  }
                />
                <span className="text-xs text-muted-foreground">
                  Minimum 8 caracteres. L'utilisateur devra le changer a la premiere connexion.
                </span>
              </Field>
              <div className="grid gap-2">
                <Label>Role metier</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as Role })}
                >
                  <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">{getBusinessRoleLabel("EMPLOYEE")}</SelectItem>
                <SelectItem value="MANAGER">{getBusinessRoleLabel("MANAGER")}</SelectItem>
                <SelectItem value="ADMIN">{getBusinessRoleLabel("ADMIN")}</SelectItem>
              </SelectContent>
            </Select>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/30 px-4 py-3 md:col-span-2">
                <div>
                  <Label htmlFor="new-user-active">Compte actif</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Autorise la connexion des la creation.
                  </p>
                </div>
                <Switch
                  id="new-user-active"
                  checked={form.active}
                  onCheckedChange={(active) => setForm({ ...form, active })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <LoaderCircle className="animate-spin" />}
                Creer l'utilisateur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) {
            setResetTargetUser(null);
            setResetForm(emptyResetForm);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <form onSubmit={resetPassword}>
            <DialogHeader>
              <DialogTitle>Reinitialiser le mot de passe</DialogTitle>
              <DialogDescription>
                {resetTargetUser
                  ? `Definissez un mot de passe temporaire pour ${resetTargetUser.fullName}.`
                  : "Definissez un mot de passe temporaire."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5">
              <Field label="Mot de passe temporaire">
                <Input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={resetForm.temporaryPassword}
                  onChange={(event) =>
                    setResetForm({ temporaryPassword: event.target.value })
                  }
                />
                <span className="text-xs text-muted-foreground">
                  L&apos;utilisateur devra le modifier lors de sa prochaine connexion.
                </span>
              </Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetOpen(false);
                  setResetTargetUser(null);
                  setResetForm(emptyResetForm);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={resettingPassword}>
                {resettingPassword && <LoaderCircle className="animate-spin" />}
                Reinitialiser
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </RoleGuard>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatKeycloakId(value: string) {
  if (!value) {
    return "non lie";
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getAccountStatusLabel(user: UserProfile) {
  if (user.accountStatus === "INACTIVE" || !user.active) {
    return "Inactif";
  }
  return "Actif";
}

function getUsersError(status: number) {
  if (status === 401) {
    return "Votre session a expire. Reconnectez-vous.";
  }
  if (status === 403) {
    return "Votre session ne permet pas d'acceder a la gestion des utilisateurs.";
  }
  return "Impossible de charger les profils utilisateurs.";
}

function createUserError(status: number) {
  if (status === 400) {
    return "Les informations saisies sont invalides. Verifiez les champs du formulaire.";
  }
  if (status === 401 || status === 403) {
    return "Votre session ne permet pas de creer des utilisateurs.";
  }
  if (status === 409) {
    return "Un utilisateur utilise deja cette adresse email.";
  }
  if (status === 404) {
    return "Le profil cible n'existe plus.";
  }
  if (status === 502) {
    return "La synchronisation avec Keycloak a echoue.";
  }
  return "La creation Keycloak ou la synchronisation du profil a echoue.";
}

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      return payload.message;
    }
  } catch {
  }
  return fallback;
}
