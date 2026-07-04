import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth, type Role } from "@/lib/auth-store";

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

const emptyForm: CreateUserForm = {
  fullName: "",
  email: "",
  role: "EMPLOYEE",
  temporaryPassword: "",
  active: true,
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

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch("/api/auth/users");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setUsers((await response.json()) as UserProfile[]);
    } catch {
      setError("Impossible de charger les profils utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, isAdmin]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-lg border border-border bg-card p-8 text-center shadow-card">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Acces refuse</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              La gestion des utilisateurs est reservee aux administrateurs.
            </p>
            <Button asChild className="mt-6">
              <Link to="/dashboard">Retour au dashboard</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passwordError = validateTemporaryPassword(form.temporaryPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
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
        throw new Error(await createUserError(response));
      }
      setCreateOpen(false);
      setForm(emptyForm);
      setNotice("Compte Keycloak et profil applicatif crees avec succes.");
      await loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La creation de l'utilisateur a echoue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateRole(user: UserProfile, role: Role) {
    setPendingUserId(user.id);
    setError(null);
    try {
      const response = await authenticatedFetch(`/api/auth/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, role } : item)),
      );
      setNotice(`Role de ${user.fullName} mis a jour.`);
    } catch {
      setError("La mise a jour du role a echoue.");
    } finally {
      setPendingUserId(null);
    }
  }

  async function toggleStatus(user: UserProfile) {
    setPendingUserId(user.id);
    setError(null);
    try {
      const active = !user.active;
      const response = await authenticatedFetch(`/api/auth/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, active } : item)),
      );
      setNotice(`${user.fullName} est maintenant ${active ? "actif" : "inactif"}.`);
    } catch {
      setError("La mise a jour du statut a echoue.");
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Gestion des utilisateurs</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Profils applicatifs, roles et statut d'acces local.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Actualiser
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              Ajouter un utilisateur
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Depuis cette page, un ADMIN cree le compte Keycloak, assigne son role et synchronise le
          profil applicatif.
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

        <div className="overflow-hidden rounded-md border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
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
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-44">Role</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Cree le</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const pending = pendingUserId === user.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          disabled={pending}
                          onValueChange={(value) => void updateRole(user, value as Role)}
                        >
                          <SelectTrigger aria-label={`Role de ${user.fullName}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                            <SelectItem value="MANAGER">MANAGER</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "secondary" : "outline"}>
                          {user.active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={user.active ? "outline" : "secondary"}
                          disabled={pending}
                          onClick={() => void toggleStatus(user)}
                        >
                          {pending && <LoaderCircle className="animate-spin" />}
                          {user.active ? "Desactiver" : "Activer"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={createUser}>
            <DialogHeader>
              <DialogTitle>Creer un utilisateur</DialogTitle>
              <DialogDescription>
                Le compte Keycloak et le profil applicatif seront crees dans une seule operation.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5">
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
                  minLength={12}
                  type="password"
                  autoComplete="new-password"
                  value={form.temporaryPassword}
                  onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })}
                />
                <span className="text-xs text-muted-foreground">
                  12 caracteres minimum, avec majuscule, minuscule, chiffre et caractere special.
                </span>
              </Field>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as Role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                    <SelectItem value="MANAGER">MANAGER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3">
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

function validateTemporaryPassword(password: string) {
  if (password.length < 12) {
    return "Le mot de passe doit contenir au moins 12 caracteres.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir une majuscule et une minuscule.";
  }
  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Le mot de passe doit contenir un chiffre et un caractere special.";
  }
  return null;
}

async function createUserError(response: Response) {
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) return body.message;
  } catch {
    // Fall back to the status-specific message below.
  }

  if (response.status === 400) {
    return "Les informations saisies sont invalides. Verifiez les champs du formulaire.";
  }
  if (response.status === 401 || response.status === 403) {
    return "Votre session ne permet pas de creer des utilisateurs.";
  }
  if (response.status === 409) {
    return "Un utilisateur utilise deja cette adresse email.";
  }
  return "La creation Keycloak ou la synchronisation du profil a echoue.";
}
