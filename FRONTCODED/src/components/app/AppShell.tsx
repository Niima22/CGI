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
        className="h-[100dvh] w-full overflow-hidden p-2 text-foreground md:p-4"
        style={{ background: "color-mix(in oklab, var(--cgi-red) 7%, white)" }}
      >
        <div
          className="mx-auto flex h-full min-h-0 max-w-[1500px] overflow-hidden rounded-3xl shadow-glass"
          style={{ background: "color-mix(in oklab, var(--cgi-red) 3%, white)" }}
        >
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar compact={compactTopbar} />
            <main
              className={`min-h-0 flex-1 overflow-hidden ${
                lockScroll ? "p-3 sm:p-4 lg:p-5" : "p-3 sm:p-4 lg:p-5"
              }`}
            >
              <div
                className={`h-full min-h-0 min-w-0 ${
                  lockScroll ? "overflow-hidden" : "overflow-auto overscroll-contain"
                }`}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </AuthenticatedView>
  );
}
