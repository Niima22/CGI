import { Bell, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

export function Topbar({ compact = false }: { compact?: boolean }) {
  const { role, email } = useAuth();
  const initial = (email?.[0] ?? "U").toUpperCase();

  return (
    <header
      className={`sticky top-0 z-20 flex flex-col gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-8 ${
        compact ? "min-h-12 py-1" : "min-h-20 py-3"
      }`}
    >
      <div className="hidden md:block md:w-1/4" />

      <div className="flex w-full justify-center md:flex-1">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un module..."
            className={`w-full rounded-xl border border-transparent bg-muted pl-10 pr-4 text-sm outline-none transition-all focus:border-ring focus:bg-card ${
              compact ? "py-1.5" : "py-2.5"
            }`}
          />
        </div>
      </div>

      <div className="flex w-full items-center justify-end gap-3 md:w-1/4">
        <button
          className={`relative flex items-center justify-center rounded-xl bg-muted transition-colors hover:bg-accent ${
            compact ? "h-8 w-8" : "h-10 w-10"
          }`}
        >
          <Bell className="h-4 w-4 text-foreground" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cgi-gradient" />
        </button>

        <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-cgi-gradient text-white shadow-glow">
          {role}
        </span>
        <div
          className={`flex items-center justify-center rounded-xl bg-cgi-gradient text-sm font-semibold text-white shadow-glow ${
            compact ? "h-8 w-8" : "h-10 w-10"
          }`}
        >
          {initial}
        </div>
      </div>
    </header>
  );
}
