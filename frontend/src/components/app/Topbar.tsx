import { Bell, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

export function Topbar() {
  const { role, email } = useAuth();
  const initial = (email?.[0] ?? "U").toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/80 backdrop-blur px-6 py-3">
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un module..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-transparent focus:border-ring focus:bg-card outline-none text-sm transition-all"
        />
      </div>

      <button className="relative h-10 w-10 rounded-xl bg-muted hover:bg-accent flex items-center justify-center transition-colors">
        <Bell className="h-4 w-4 text-foreground" />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cgi-gradient" />
      </button>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-cgi-gradient text-white shadow-glow">
          {role}
        </span>
        <div className="h-10 w-10 rounded-xl bg-cgi-gradient flex items-center justify-center text-white font-semibold text-sm shadow-glow">
          {initial}
        </div>
      </div>
    </header>
  );
}
