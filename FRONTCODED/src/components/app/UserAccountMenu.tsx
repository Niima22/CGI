import { Link } from "@tanstack/react-router";
import { ChevronDown, HelpCircle, LogOut, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProfileAvatar } from "@/components/app/ProfileAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError, fetchMyEmployee, type AvailabilityStatus } from "@/lib/api/employees";
import { subscribeAvailabilityStatusUpdate, subscribeProfilePhotoUpdate } from "@/lib/availability-status-events";
import { getBusinessRoleLabel, useAuth } from "@/lib/auth-store";
import { agentProfileMock, isAgentUser } from "@/mocks/agentProfileMock";

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  AVAILABLE: "Disponible",
  BREAK: "Pause",
  IN_COMMUNICATION: "En communication",
  LEAVE: "Conge",
  OFFLINE: "Hors ligne",
};

const STATUS_DOT_CLASS: Record<AvailabilityStatus, string> = {
  AVAILABLE: "bg-emerald-500",
  BREAK: "bg-amber-500",
  IN_COMMUNICATION: "bg-sky-500",
  LEAVE: "bg-violet-500",
  OFFLINE: "bg-slate-400",
};

export function UserAccountMenu({ placement = "topbar" }: { placement?: "sidebar" | "topbar" }) {
  const { authenticatedFetch, email, fullName, isAuthenticated, logout, user } = useAuth();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("OFFLINE");

  const loadEmployeeProfile = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setProfilePhotoUrl(null);
      setAvailabilityStatus("OFFLINE");
      return;
    }

    try {
      const employee = await fetchMyEmployee(authenticatedFetch);
      setProfilePhotoUrl(employee.profilePhotoUrl ?? null);
      setAvailabilityStatus(employee.availabilityStatus ?? "OFFLINE");
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.status === 404)) {
        setAvailabilityStatus("OFFLINE");
      }
      setProfilePhotoUrl(null);
    }
  }, [authenticatedFetch, isAuthenticated, user]);

  useEffect(() => {
    void loadEmployeeProfile();
  }, [loadEmployeeProfile]);

  useEffect(() => subscribeAvailabilityStatusUpdate(setAvailabilityStatus), []);
  useEffect(() => subscribeProfilePhotoUpdate(setProfilePhotoUrl), []);

  const isManager = user?.primaryRole === "MANAGER";
  const isPilote = user?.primaryRole === "ADMIN";
  const isAgent = isAgentUser(user);
  const displayName = isManager
    ? "Hajar Ait Lahcen"
    : isAgent
      ? agentProfileMock.fullName
    : isPilote
      ? "Zakaria El Kouraichi"
    : fullName || user?.localProfile?.fullName || email || "Utilisateur";
  const displayRole = useMemo(
    () =>
      user?.primaryRole === "MANAGER"
        ? "Superviseure CGI"
        : isAgentUser(user)
          ? agentProfileMock.primaryRole
        : user?.primaryRole
          ? getBusinessRoleLabel(user.primaryRole)
          : "Compte CGI",
    [user],
  );
  // Every account shows its real availability, kept in sync with the selector via the
  // availability event bus.
  const displayAvailabilityStatus = availabilityStatus;
  const compact = placement === "topbar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            compact
              ? "flex min-w-0 items-center gap-2 rounded-full border border-border/60 bg-white px-2 py-1.5 text-left shadow-sm transition hover:bg-muted/50"
              : "flex w-full items-center gap-3 rounded-xl border border-border/70 bg-white/90 p-2.5 text-left shadow-sm transition hover:border-[color:var(--cgi-purple)]/30 hover:bg-white"
          }
        >
          <ProfileAvatar
            fullName={displayName}
            email={email}
            profilePhotoUrl={profilePhotoUrl}
            size={compact ? "sm" : "md"}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[displayAvailabilityStatus]}`} />
              <span className="truncate">{STATUS_LABELS[displayAvailabilityStatus]}</span>
              {!compact ? <span className="truncate text-foreground/50">- {displayRole}</span> : null}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"} className="w-56">
        <DropdownMenuItem asChild>
          <Link to="/my-profile">
            <UserRound className="h-4 w-4" />
            Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/help">
            <HelpCircle className="h-4 w-4" />
            Aide
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void logout();
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
