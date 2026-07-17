import { Link } from "@tanstack/react-router";
import { HelpCircle, LogOut, Search, Settings } from "lucide-react";
import { AvailabilityStatusSelector } from "@/components/app/AvailabilityStatusSelector";
import { CurrentUserAvatar } from "@/components/app/CurrentUserAvatar";
import { NotificationBell } from "@/components/app/NotificationBell";
import { useAuth } from "@/lib/auth-store";

export function Topbar({ compact = false }: { compact?: boolean }) {
  const { logout } = useAuth();
  const iconButtonClass =
    "grid place-items-center rounded-full border border-border/60 bg-white text-foreground/70 shadow-sm transition hover:bg-muted/50 hover:text-foreground";
  const iconButtonSize = compact ? "h-8 w-8" : "h-9 w-9";

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

        <Link to="/my-profile" aria-label="Paramètres" className={`${iconButtonClass} ${iconButtonSize}`}>
          <Settings className="h-4 w-4" />
        </Link>

        <Link to="/dashboard" aria-label="Aide" className={`${iconButtonClass} ${iconButtonSize}`}>
          <HelpCircle className="h-4 w-4" />
        </Link>

        <button
          type="button"
          aria-label="Déconnexion"
          onClick={() => void logout()}
          className={`${iconButtonClass} ${iconButtonSize}`}
        >
          <LogOut className="h-4 w-4" />
        </button>

        <Link
          to="/my-profile"
          aria-label="Mon profil"
          className="flex items-center rounded-full border border-border/60 bg-white px-1 py-1 text-sm shadow-sm transition hover:bg-muted/50"
        >
          <CurrentUserAvatar compact={compact} />
        </Link>
      </div>
    </header>
  );
}
