import { useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { AvailabilityStatusSelector } from "@/components/app/AvailabilityStatusSelector";
import { NotificationBell } from "@/components/app/NotificationBell";
import { UserMenu } from "@/components/app/UserMenu";

export function Topbar({
  compact = false,
  onOpenMobileSidebar,
}: {
  compact?: boolean;
  onOpenMobileSidebar?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = getPageTitle(pathname);

  return (
    <header
      className={`sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-white/90 px-4 backdrop-blur sm:px-6 ${
        compact ? "min-h-12 py-1.5" : "min-h-16 py-2.5"
      }`}
    >
      <button
        type="button"
        aria-label="Ouvrir le menu"
        onClick={onOpenMobileSidebar}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-white text-foreground transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.24_300)] lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          CGI-Intranet
        </div>
        <h1 className="truncate text-base font-semibold tracking-normal text-foreground sm:text-lg">
          {title}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden min-w-[188px] sm:block">
          <AvailabilityStatusSelector compact={compact} />
        </div>
        <NotificationBell compact={compact} />
        <UserMenu compact={compact} />
      </div>
    </header>
  );
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/tickets")) return "Tickets";
  if (pathname.startsWith("/sla")) return "SLA";
  if (pathname.startsWith("/quality-lab")) return "Quality Lab IA";
  if (pathname.startsWith("/employees")) return "Employes";
  if (pathname.startsWith("/planning")) return "Planning";
  if (pathname.startsWith("/messages")) return "Messagerie";
  if (pathname.startsWith("/my-profile")) return "Mon profil";
  if (pathname.startsWith("/departments")) return "Departements";
  if (pathname.startsWith("/users")) return "Utilisateurs";
  if (pathname.startsWith("/help")) return "Aide";
  return "Tableau de bord";
}
