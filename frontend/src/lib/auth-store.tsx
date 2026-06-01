import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "Agent" | "Superviseur";

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  role: Role;
  login: (email: string, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "cgi-auth";

interface Persisted {
  isAuthenticated: boolean;
  email: string | null;
  role: Role;
}

function load(): Persisted {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, email: null, role: "Agent" };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* ignore */
  }
  return { isAuthenticated: false, email: null, role: "Agent" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value: AuthState = {
    ...state,
    login: (email, role) => setState({ isAuthenticated: true, email, role }),
    logout: () => setState({ isAuthenticated: false, email: null, role: state.role }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
