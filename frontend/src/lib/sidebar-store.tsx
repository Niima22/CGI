import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const storageKey = "cgi-sidebar-collapsed";

type SidebarState = {
  isCollapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarStateProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem(storageKey) === "true");
  }, []);

  const toggle = useCallback(() => {
    setIsCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ isCollapsed, toggle }), [isCollapsed, toggle]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebarState() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebarState must be used within SidebarStateProvider");
  return context;
}
