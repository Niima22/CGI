import { Search } from "lucide-react";
import { AvailabilityStatusSelector } from "@/components/app/AvailabilityStatusSelector";
import { NotificationBell } from "@/components/app/NotificationBell";
import { UserAccountMenu } from "@/components/app/UserAccountMenu";

export function Topbar({ compact = false }: { compact?: boolean }) {
  return (
    <header
      className={`sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-white/95 px-4 backdrop-blur sm:px-6 ${
        compact ? "min-h-12 py-2" : "min-h-16 py-4"
      }`}
    >
      <div className="relative max-w-xl flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un ticket, un employe, un departement..."
          className={`w-full rounded-xl border border-border/60 bg-white pl-10 pr-4 text-sm shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-[color:var(--cgi-purple)] focus:ring-2 focus:ring-[color:var(--cgi-purple)]/15 ${
            compact ? "py-2" : "py-2.5"
          }`}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden min-w-[188px] sm:block">
          <AvailabilityStatusSelector compact={compact} />
        </div>

        <NotificationBell compact={compact} />
        <UserAccountMenu placement="topbar" />
      </div>
    </header>
  );
}
