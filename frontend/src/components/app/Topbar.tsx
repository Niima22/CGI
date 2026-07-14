import { ChevronDown, Search } from "lucide-react";
import { AvailabilityStatusSelector } from "@/components/app/AvailabilityStatusSelector";
import { CurrentUserAvatar } from "@/components/app/CurrentUserAvatar";
import { NotificationBell } from "@/components/app/NotificationBell";
import { getBusinessRoleLabel, useAuth } from "@/lib/auth-store";

export function Topbar({ compact = false }: { compact?: boolean }) {
  const { roles, email, fullName } = useAuth();

  return (
    <header
      className={`sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-white/90 px-4 backdrop-blur sm:px-6 ${
        compact ? "min-h-12 py-1.5" : "min-h-16 py-2.5"
      }`}
    >
      <div className="relative max-w-2xl flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un ticket, un employé, un département..."
          className={`w-full rounded-xl border border-border/70 bg-muted/40 pl-10 pr-4 text-sm outline-none transition-all focus:border-[oklch(0.6_0.2_300)] focus:bg-white focus:ring-2 focus:ring-[oklch(0.6_0.2_300)]/20 ${
            compact ? "py-2" : "py-2.5"
          }`}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden min-w-[188px] sm:block">
          <AvailabilityStatusSelector compact={compact} />
        </div>

        <NotificationBell compact={compact} />

        <div className="hidden min-w-0 text-right xl:block">
          <div className="truncate text-sm font-medium text-foreground">{fullName}</div>
          <div className="truncate text-xs text-muted-foreground">{email}</div>
        </div>
        <span className="hidden shrink-0 rounded-lg border border-border/70 bg-white px-2.5 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
          {roles
            .filter((role) => ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role))
            .map(getBusinessRoleLabel)
            .join(", ")}
        </span>
        <button
          type="button"
          aria-label="Menu utilisateur"
          className="flex items-center gap-2 rounded-lg border border-border/70 bg-white px-1.5 py-1 pr-2.5 text-sm transition hover:bg-muted/50"
        >
          <CurrentUserAvatar compact={compact} />
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:inline" />
        </button>
      </div>
    </header>
  );
}
