import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({
  children,
  lockScroll = false,
  compactTopbar = false,
}: {
  children: ReactNode;
  lockScroll?: boolean;
  compactTopbar?: boolean;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar compact={compactTopbar} />
        <main
          className={`min-h-0 flex-1 ${
            lockScroll ? "overflow-hidden px-4 py-3 md:px-8" : "overflow-auto px-3 py-4 md:px-5"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
