import Keycloak from "keycloak-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface CurrentUser {
  keycloakId: string;
  email: string;
  fullName: string;
  roles: string[];
  localProfile: {
    id: number;
    keycloakId: string;
    fullName: string;
    email: string;
    role: Role;
    active: boolean;
  } | null;
}

interface AuthState {
  isReady: boolean;
  isAuthenticated: boolean;
  user: CurrentUser | null;
  email: string | null;
  fullName: string | null;
  roles: string[];
  hasRole: (role: Role) => boolean;
  authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
let keycloak: Keycloak | null = null;
let keycloakInit: Promise<boolean> | null = null;

function getKeycloak() {
  keycloak ??= new Keycloak({
    url: "http://localhost:8085",
    realm: "cgi-flow",
    clientId: "cgi-flow-web",
  });
  return keycloak;
}

function initializeKeycloak(client: Keycloak) {
  keycloakInit ??= client.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });
  return keycloakInit;
}

async function loadCurrentUser(client: Keycloak): Promise<CurrentUser> {
  await client.updateToken(30);
  const response = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${client.token}` },
  });

  if (!response.ok) {
    throw new Error(`Unable to load current user: HTTP ${response.status}`);
  }
  return response.json() as Promise<CurrentUser>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let active = true;
    const client = getKeycloak();

    client.onTokenExpired = () => {
      void client.updateToken(30).catch(() => client.login());
    };

    void initializeKeycloak(client)
      .then(async (authenticated) => {
        if (!active) return;
        setIsAuthenticated(authenticated);
        if (authenticated) {
          const currentUser = await loadCurrentUser(client);
          if (active) setUser(currentUser);
        }
      })
      .catch(() => {
        if (active) {
          setIsAuthenticated(false);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async () => {
    await getKeycloak().login({
      redirectUri: `${window.location.origin}/dashboard`,
    });
  }, []);

  const logout = useCallback(async () => {
    const client = getKeycloak();
    const logoutUrl = client.createLogoutUrl({ redirectUri: window.location.origin });
    setUser(null);
    setIsAuthenticated(false);
    client.clearToken();
    window.location.assign(logoutUrl);
  }, []);

  const authenticatedFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const client = getKeycloak();
    await client.updateToken(30);
    if (!client.token) {
      throw new Error("No active Keycloak access token");
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${client.token}`);
    return fetch(input, { ...init, headers });
  }, []);

  const roles = useMemo(() => user?.roles ?? [], [user]);
  const value = useMemo<AuthState>(
    () => ({
      isReady,
      isAuthenticated,
      user,
      email: user?.email ?? null,
      fullName: user?.fullName ?? null,
      roles,
      hasRole: (role) => roles.includes(role),
      authenticatedFetch,
      login,
      logout,
    }),
    [isReady, isAuthenticated, user, roles, authenticatedFetch, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
