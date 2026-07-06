import { Search } from "lucide-react";
import { AvailabilityStatusSelector } from "@/components/app/AvailabilityStatusSelector";
import { CurrentUserAvatar } from "@/components/app/CurrentUserAvatar";
import { NotificationBell } from "@/components/app/NotificationBell";
import { getBusinessRoleLabel, useAuth } from "@/lib/auth-store";

export function Topbar({ compact = false }: { compact?: boolean }) {
  const { roles, email, fullName } = useAuth();

  return (
    <header
      className={`sticky top-0 z-20 border-b border-border/70 bg-background/85 px-4 backdrop-blur md:grid md:grid-cols-[minmax(0,1fr)_minmax(320px,560px)_auto] md:items-center md:gap-5 md:px-6 xl:px-8 ${
        compact ? "min-h-12 py-1.5" : "min-h-16 py-2.5"
      }`}
    >
      <div className="hidden md:block" />

      <div className="flex w-full justify-center">
        <div className="relative w-full max-w-xl md:max-w-none">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un module..."
            className={`w-full rounded-xl border border-transparent bg-muted/85 pl-10 pr-4 text-sm outline-none transition-all focus:border-ring/40 focus:bg-card ${
              compact ? "py-2" : "py-2.5"
            }`}
          />
        </div>
      </div>

      <div className="mt-2 flex w-full flex-wrap items-center justify-end gap-2.5 md:mt-0 md:w-auto md:flex-nowrap md:justify-self-end">
        <div className="min-w-[170px] md:min-w-[188px]">
          <AvailabilityStatusSelector compact={compact} />
        </div>

        <NotificationBell compact={compact} />

        <div className="hidden min-w-0 text-right xl:block">
          <div className="truncate text-sm font-medium text-foreground">{fullName}</div>
          <div className="truncate text-xs text-muted-foreground">{email}</div>
        </div>
        <span className="hidden shrink-0 sm:inline-flex rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
          {roles
            .filter((role) => ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role))
            .map(getBusinessRoleLabel)
            .join(", ")}
        </span>
        <CurrentUserAvatar compact={compact} />
      </div>
    </header>
  );
}
