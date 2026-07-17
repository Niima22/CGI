import { ChevronDown, Search } from "lucide-react";
import { AvailabilityStatusSelector } from "@/components/app/AvailabilityStatusSelector";
import { CurrentUserAvatar } from "@/components/app/CurrentUserAvatar";
import { NotificationBell } from "@/components/app/NotificationBell";
import { getBusinessRoleLabel, useAuth } from "@/lib/auth-store";

export function Topbar({ compact = false }: { compact?: boolean }) {
  const { roles } = useAuth();
  const roleLabel =
    roles
      .filter((role) => ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role))
      .map(getBusinessRoleLabel)
      .join(", ") || "Compte";

  return (
    <header
      className={`sticky top-0 z-30 flex items-center gap-3 bg-white px-4 sm:px-6 ${
        compact ? "min-h-12 py-2" : "min-h-16 py-4"
      }`}
    >
      <div className="relative max-w-2xl flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un ticket, un employé, un département..."
          className={`w-full rounded-2xl border border-border/60 bg-white pl-10 pr-4 text-sm shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-[color:var(--cgi-purple)] focus:ring-2 focus:ring-[color:var(--cgi-purple)]/15 ${
            compact ? "py-2" : "py-2.5"
          }`}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden min-w-[188px] sm:block">
          <AvailabilityStatusSelector compact={compact} />
        </div>

        <NotificationBell compact={compact} />

        <button
          type="button"
          aria-label="Menu utilisateur"
          className="flex items-center gap-2 rounded-full border border-border/60 bg-white px-1.5 py-1 pr-3 text-sm shadow-sm transition hover:bg-muted/50"
        >
          <CurrentUserAvatar compact={compact} />
          <span className="hidden max-w-28 truncate text-xs font-semibold text-foreground sm:inline">
            {roleLabel}
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:inline" />
        </button>
      </div>
    </header>
  );
}
