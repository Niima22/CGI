import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, ChevronDown, CircleHelp, LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileAvatar } from "@/components/app/ProfileAvatar";
import {
  AVAILABILITY_STATUS_DOT_CLASSES,
  AVAILABILITY_STATUS_LABELS,
} from "@/components/app/AvailabilityStatusSelector";
import { ApiError, fetchMyEmployee, type AvailabilityStatus } from "@/lib/api/employees";
import {
  subscribeAvailabilityStatusUpdate,
  subscribeProfilePhotoUpdate,
} from "@/lib/availability-status-events";
import { getBusinessRoleLabel, useAuth, type Role } from "@/lib/auth-store";

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { authenticatedFetch, email, fullName, isAuthenticated, logout, roles, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);

  const loadProfileSummary = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setProfilePhotoUrl(null);
      setAvailabilityStatus(null);
      return;
    }

    try {
      const employee = await fetchMyEmployee(authenticatedFetch);
      setProfilePhotoUrl(employee.profilePhotoUrl ?? null);
      setAvailabilityStatus(employee.availabilityStatus ?? "OFFLINE");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setProfilePhotoUrl(null);
        setAvailabilityStatus(null);
        return;
      }
      setProfilePhotoUrl(null);
      setAvailabilityStatus(null);
    }
  }, [authenticatedFetch, isAuthenticated, user]);

  useEffect(() => {
    void loadProfileSummary();
  }, [loadProfileSummary]);

  useEffect(() => subscribeProfilePhotoUpdate(setProfilePhotoUrl), []);
  useEffect(() => subscribeAvailabilityStatusUpdate(setAvailabilityStatus), []);

  const roleLabel = useMemo(
    () =>
      roles
        .filter((role): role is Role => ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role))
        .map(getBusinessRoleLabel)
        .join(", "),
    [roles],
  );

  const statusLabel = availabilityStatus
    ? AVAILABILITY_STATUS_LABELS[availabilityStatus]
    : "Statut indisponible";
  const statusDot = availabilityStatus
    ? AVAILABILITY_STATUS_DOT_CLASSES[availabilityStatus]
    : "bg-slate-400";
  const displayName = fullName ?? email ?? "Utilisateur CGI";

  function navigateTo(to: "/my-profile" | "/help") {
    setOpen(false);
    void navigate({ to });
  }

  async function handleLogout() {
    setOpen(false);
    await logout();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu utilisateur"
          className="flex items-center gap-2 rounded-xl border border-border/70 bg-white px-1.5 py-1 pr-2.5 text-sm transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.24_300)] focus-visible:ring-offset-2"
        >
          <span className="relative">
            <ProfileAvatar
              fullName={fullName}
              email={email}
              profilePhotoUrl={profilePhotoUrl}
              size={compact ? "sm" : "md"}
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${statusDot}`}
              aria-hidden
            />
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:inline" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl border-border/80 p-1.5 shadow-card">
        <DropdownMenuLabel className="px-3 py-2.5">
          <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">{email}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${statusDot}`} aria-hidden />
            <span>{roleLabel || "Compte CGI"} · {statusLabel}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigateTo("/my-profile")} className="cursor-pointer rounded-lg">
          <UserRound className="h-4 w-4" />
          Mon profil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigateTo("/help")} className="cursor-pointer rounded-lg">
          <CircleHelp className="h-4 w-4" />
          Aide
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
          className="cursor-pointer rounded-lg text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Se dÃ©connecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
