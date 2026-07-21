import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApiError,
  fetchMyEmployee,
  updateMyAvailabilityStatus,
  type AvailabilityStatus,
} from "@/lib/api/employees";
import { useAuth } from "@/lib/auth-store";
import { publishAvailabilityStatusUpdate, subscribeAvailabilityStatusUpdate } from "@/lib/availability-status-events";

export const AVAILABILITY_STATUS_OPTIONS: AvailabilityStatus[] = [
  "AVAILABLE",
  "BREAK",
  "IN_COMMUNICATION",
  "LEAVE",
  "OFFLINE",
];

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  AVAILABLE: "Disponible",
  BREAK: "Pause",
  IN_COMMUNICATION: "En communication",
  LEAVE: "Congé",
  OFFLINE: "Hors ligne",
};

export const AVAILABILITY_STATUS_DOT_CLASSES: Record<AvailabilityStatus, string> = {
  AVAILABLE: "bg-emerald-500",
  BREAK: "bg-amber-500",
  IN_COMMUNICATION: "bg-sky-500",
  LEAVE: "bg-violet-500",
  OFFLINE: "bg-slate-400",
};

export function AvailabilityStatusSelector({ compact = false }: { compact?: boolean }) {
  const { authenticatedFetch, isAuthenticated, user } = useAuth();
  const [status, setStatus] = useState<AvailabilityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missingProfile, setMissingProfile] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      setMissingProfile(true);
      setStatus(null);
      return;
    }

    setLoading(true);
    try {
      const employee = await fetchMyEmployee(authenticatedFetch);
      const next = employee.availabilityStatus ?? "OFFLINE";
      setStatus(next);
      setMissingProfile(false);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setMissingProfile(true);
        setStatus(null);
      } else {
        setMissingProfile(true);
        setStatus(null);
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, isAuthenticated, user]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => subscribeAvailabilityStatusUpdate(setStatus), []);

  const currentStatus = useMemo(() => status ?? "OFFLINE", [status]);

  async function handleChange(nextStatus: string) {
    const typedStatus = nextStatus as AvailabilityStatus;
    setSaving(true);
    try {
      const updated = await updateMyAvailabilityStatus(authenticatedFetch, typedStatus);
      const persisted = updated.availabilityStatus ?? "OFFLINE";
      setStatus(persisted);
      publishAvailabilityStatusUpdate(persisted);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs text-muted-foreground">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        Statut...
      </div>
    );
  }

  if (missingProfile) {
    return (
      <div
        className={`rounded-xl border border-border/80 bg-card text-muted-foreground ${
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-xs"
        }`}
      >
        Statut indisponible
      </div>
    );
  }

  return (
    <Select value={currentStatus} onValueChange={(value) => void handleChange(value)} disabled={saving}>
      <SelectTrigger
        aria-label="Statut de disponibilité"
        className={`border-border/80 bg-card ${compact ? "h-8 min-w-40 text-xs" : "h-10 min-w-48 text-sm"}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <span
            aria-hidden
            className={`h-2 w-2 shrink-0 rounded-full ${AVAILABILITY_STATUS_DOT_CLASSES[currentStatus]}`}
          />
          <SelectValue>{AVAILABILITY_STATUS_LABELS[currentStatus]}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {AVAILABILITY_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {AVAILABILITY_STATUS_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
