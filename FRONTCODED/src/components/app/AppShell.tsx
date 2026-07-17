import type { ReactNode } from "react";
import { AuthenticatedView } from "./AuthenticatedView";
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
    <AuthenticatedView>
      <div
        className="h-screen w-full overflow-hidden p-3 text-foreground md:p-6"
        style={{ background: "color-mix(in oklab, var(--cgi-red) 7%, white)" }}
      >
        <div
          className="mx-auto flex h-full max-w-[1500px] overflow-hidden rounded-3xl shadow-glass"
          style={{ background: "color-mix(in oklab, var(--cgi-red) 3%, white)" }}
        >
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar compact={compactTopbar} />
            <main
              className={`min-h-0 flex-1 ${
                lockScroll ? "overflow-hidden p-4 sm:p-6 lg:p-8" : "overflow-auto p-4 sm:p-6 lg:p-8"
              }`}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </AuthenticatedView>
  );
}
