import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { RoleGuard } from "@/components/app/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AccessDenied,
  EmptyState,
  bannetteOptions,
  formatValue,
} from "@/components/employees/employee-ui";
import {
  ApiError,
  confirmEmployeeImport,
  fetchEmployees,
  previewEmployeeImport,
  type Employee,
  type ImportEmployee,
} from "@/lib/api/employees";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/employees/import")({
  head: () => ({
    meta: [
      { title: "Import employes - CGI-FLOW" },
      {
        name: "description",
        content: "Preview et confirmation d'import Excel des profils employes CGI-FLOW.",
      },
    ],
  }),
  component: EmployeeImportPage,
});

function EmployeeImportPage() {
  const { hasRole, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole("ADMIN");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportEmployee[]>([]);
  const [existing, setExisting] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const warningsByIndex = useMemo(() => buildWarnings(preview, existing), [existing, preview]);
  const warningCount = warningsByIndex.reduce((sum, warnings) => sum + warnings.length, 0);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const [employeePreview, existingEmployees] = await Promise.all([
        previewEmployeeImport(authenticatedFetch, file),
        fetchEmployees(authenticatedFetch),
      ]);
      setPreview(employeePreview.employees);
      setExisting(existingEmployees);
      setNotice(`${employeePreview.count} profil(s) detecte(s) dans le fichier.`);
    } catch (caught) {
      setPreview([]);
      setError(readImportError(caught, "Impossible de lire le fichier Excel."));
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    setConfirming(true);
    setError(null);
    setNotice(null);
    try {
      await confirmEmployeeImport(authenticatedFetch, preview);
      await navigate({ to: "/employees" });
    } catch (caught) {
      setError(readImportError(caught, "La confirmation d'import a echoue."));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <AppShell>
      <RoleGuard
        allowedRoles={["ADMIN"]}
        message="L’import Excel des employés est réservé aux Pilotes."
      >
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Import employes</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview des profils issus du fichier Excel avant confirmation.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/employees">Retour aux employes</Link>
          </Button>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Les donnees KPI, QS, NPS, appels, pourcentages, totaux et calculs sont ignorees. Le
          fichier sert uniquement a extraire les informations employes.
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

        <div className="rounded-md border border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Fichier Excel</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Selectionnez le fichier DS Magasin pour generer un apercu.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
              <Button asChild variant="outline">
                <label>
                  <Upload />
                  Choisir un fichier
                  <Input
                    className="hidden"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => void onFileChange(event)}
                  />
                </label>
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-sm font-semibold">Apercu import</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{preview.length} profil(s)</span>
              {warningCount > 0 && <Badge variant="outline">{warningCount} alerte(s)</Badge>}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : preview.length === 0 ? (
            <EmptyState label="Aucun apercu disponible." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Departement</TableHead>
                  <TableHead>Bannette</TableHead>
                  <TableHead>Operationnel</TableHead>
                  <TableHead>Activite</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Lien compte</TableHead>
                  <TableHead>Alertes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((employee, index) => (
                  <TableRow key={`${employee.fullName}-${index}`}>
                    <TableCell className="font-medium">{employee.fullName}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{formatValue(employee.bannette)}</TableCell>
                    <TableCell>{formatValue(employee.operationalStatus)}</TableCell>
                    <TableCell>{formatValue(employee.activityStatus)}</TableCell>
                    <TableCell>{formatValue(employee.email)}</TableCell>
                    <TableCell>
                      <Badge variant={employee.userKeycloakId ? "secondary" : "outline"}>
                        {employee.userKeycloakId ? "Lie" : "Non lie"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {warningsByIndex[index]?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {warningsByIndex[index].map((warning) => (
                            <Badge key={warning} variant="outline">
                              {warning}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link to="/employees">Annuler</Link>
          </Button>
          <Button disabled={preview.length === 0 || confirming || loading} onClick={() => void confirmImport()}>
            {confirming ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />}
            Confirmer import
          </Button>
        </div>
      </div>
      </RoleGuard>
    </AppShell>
  );
}

function buildWarnings(preview: ImportEmployee[], existing: Employee[]) {
  const seen = new Map<string, number>();
  preview.forEach((employee) => {
    const key = normalizeName(employee.fullName);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  });

  const existingNames = new Set(existing.map((employee) => normalizeName(employee.fullName)));
  const existingEmails = new Set(
    existing.map((employee) => employee.email?.trim().toLowerCase()).filter(Boolean),
  );
  const knownBannettes = new Set(bannetteOptions.map((item) => normalizeName(item)));

  return preview.map((employee) => {
    const warnings: string[] = [];
    if ((seen.get(normalizeName(employee.fullName)) ?? 0) > 1) warnings.push("doublon nom");
    if (!employee.email) warnings.push("email manquant");
    if (!employee.bannette || !knownBannettes.has(normalizeName(employee.bannette))) {
      warnings.push("bannette inconnue");
    }
    if (
      existingNames.has(normalizeName(employee.fullName)) ||
      (employee.email && existingEmails.has(employee.email.trim().toLowerCase()))
    ) {
      warnings.push("deja existant");
    }
    return warnings;
  });
}

function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function readImportError(caught: unknown, fallback: string) {
  if (caught instanceof ApiError && caught.status === 403) {
    return "Acces refuse par le backend pour cette operation.";
  }
  if (caught instanceof ApiError && caught.status === 400) {
    return "Le fichier ou les donnees d'import sont invalides.";
  }
  return fallback;
}
