import { useEffect, useState, type ReactNode } from "react";
import { AuthenticatedView } from "./AuthenticatedView";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "cgi-intranet-sidebar-collapsed";

export function AppShell({
  children,
  lockScroll = false,
  compactTopbar = false,
}: {
  children: ReactNode;
  lockScroll?: boolean;
  compactTopbar?: boolean;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true");
    } catch {
      setSidebarCollapsed(false);
    }
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // localStorage may be unavailable in private or server-like contexts.
      }
      return next;
    });
  }

  return (
    <AuthenticatedView>
      <div className="h-screen w-full overflow-hidden bg-[oklch(0.985_0.003_260)] text-foreground">
        <div className="mx-auto flex h-full max-w-[1600px] overflow-hidden">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapsed={toggleSidebarCollapsed}
            mobileOpen={mobileSidebarOpen}
            onMobileOpenChange={setMobileSidebarOpen}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar compact={compactTopbar} onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
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
