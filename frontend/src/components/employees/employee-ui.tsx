import { Link } from "@tanstack/react-router";
import { ShieldAlert, UserRound } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type {
  AvailabilityStatus,
  Employee,
  EmployeePayload,
  EmployeeStatus,
} from "@/lib/api/employees";

export const bannetteOptions = [
  "FO",
  "BO",
  "SCO",
  "Supply",
  "Partenaire",
  "VUS",
  "Proxi & Promocash",
];

export const emptyEmployeeForm: EmployeePayload = {
  fullName: "",
  department: "DS Magasin",
  bannette: "",
  operationalStatus: "",
  activityStatus: "",
  email: "",
  userKeycloakId: "",
  managerKeycloakId: "",
  address: "",
  latitude: null,
  longitude: null,
  status: null,
};

export function toEmployeeForm(employee: Employee): EmployeePayload {
  return {
    fullName: employee.fullName,
    department: employee.department,
    bannette: employee.bannette ?? "",
    operationalStatus: employee.operationalStatus ?? "",
    activityStatus: employee.activityStatus ?? "",
    email: employee.email ?? "",
    jobTitle: employee.jobTitle ?? "",
    userKeycloakId: employee.userKeycloakId ?? "",
    managerKeycloakId: employee.managerKeycloakId ?? "",
    address: employee.address ?? "",
    latitude: employee.latitude,
    longitude: employee.longitude,
    status: employee.status,
  };
}

export function cleanEmployeePayload(form: EmployeePayload): EmployeePayload {
  return {
    ...form,
    fullName: form.fullName.trim(),
    department: form.department.trim(),
    bannette: cleanString(form.bannette),
    operationalStatus: cleanString(form.operationalStatus),
    activityStatus: cleanString(form.activityStatus),
    email: cleanString(form.email),
    jobTitle: cleanString(form.jobTitle),
    userKeycloakId: cleanString(form.userKeycloakId),
    managerKeycloakId: cleanString(form.managerKeycloakId),
    address: cleanString(form.address),
    latitude: numberOrNull(form.latitude),
    longitude: numberOrNull(form.longitude),
    status: form.status || null,
  };
}

export function AccessDenied({ message }: { message: string }) {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-xl border border-border/80 bg-card p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">Acces refuse</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Retour au dashboard</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

export function LoadingState({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-xl bg-muted/25 px-4 text-sm text-muted-foreground">
      <div className="text-center">{label}</div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl bg-muted/25 px-6 text-center text-sm text-muted-foreground">
      <UserRound className="h-8 w-8" />
      <span className="max-w-md leading-6">{label}</span>
    </div>
  );
}

export function StatusBadge({ employee }: { employee: Employee }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={employee.userKeycloakId ? "secondary" : "outline"}>
        {employee.userKeycloakId ? "Compte lie" : "Non lie"}
      </Badge>
      {employee.status && <Badge variant="outline">{formatStatus(employee.status)}</Badge>}
      {employee.availabilityStatus && (
        <Badge variant="outline">{formatAvailabilityStatus(employee.availabilityStatus)}</Badge>
      )}
    </div>
  );
}

export function EmployeeField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <EmployeeField label={label}>
      <Input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </EmployeeField>
  );
}

export function formatStatus(status: EmployeeStatus) {
  const labels: Record<EmployeeStatus, string> = {
    ACTIVE: "Actif",
    INACTIVE: "Inactif",
    ON_LEAVE: "En pause",
  };
  return labels[status];
}

export function formatAvailabilityStatus(status: AvailabilityStatus) {
  const labels: Record<AvailabilityStatus, string> = {
    AVAILABLE: "Disponible",
    BREAK: "Pause",
    IN_COMMUNICATION: "En communication",
    LEAVE: "Congé",
    OFFLINE: "Hors ligne",
  };
  return labels[status];
}

export function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function cleanString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
