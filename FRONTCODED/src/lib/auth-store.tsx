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
export type AccountStatus = "ACTIVE" | "INACTIVE";

const roleLabels: Record<Role, string> = {
  ADMIN: "Pilote",
  MANAGER: "Superviseur",
  EMPLOYEE: "Agent",
};

export function getBusinessRoleLabel(role: string) {
  return role in roleLabels ? roleLabels[role as Role] : role;
}

export interface LocalUserProfile {
  id: number;
  keycloakId: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  accountStatus: AccountStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrentUser {
  keycloakId: string;
  email: string;
  fullName: string;
  roles: Role[];
  primaryRole: Role | null;
  accountStatus: AccountStatus;
  localProfileLinked: boolean;
  warnings: string[];
  localProfile: LocalUserProfile | null;
}

interface AuthState {
  isReady: boolean;
  isAuthenticated: boolean;
  user: CurrentUser | null;
  email: string | null;
  fullName: string | null;
  roles: Role[];
  hasRole: (role: Role) => boolean;
  authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginRedirect: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
let keycloak: Keycloak | null = null;
let keycloakInit: Promise<boolean> | null = null;
const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8085";
const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM ?? "cgi-flow";
const keycloakClientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "cgi-flow-web";
const tokenStorageKey = "cgi-flow.keycloak.tokens";

interface LoginCredentials {
  email: string;
  password: string;
}

interface StoredTokens {
  token: string;
  refreshToken?: string;
  idToken?: string;
}

interface TokenEndpointResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
}

function getPreferredLocalOrigin() {
  if (typeof window === "undefined") {
    return "http://localhost:5173";
  }

  return window.location.origin;
}

function getKeycloakUrl() {
  if (typeof window === "undefined") {
    return keycloakUrl;
  }

  if (keycloakUrl.includes("host.docker.internal")) {
    return `${window.location.protocol}//${window.location.hostname}:8085`;
  }

  return keycloakUrl;
}

function getKeycloak() {
  keycloak ??= new Keycloak({
    url: getKeycloakUrl(),
    realm: keycloakRealm,
    clientId: keycloakClientId,
  });
  return keycloak;
}

function readStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(tokenStorageKey);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    window.localStorage.removeItem(tokenStorageKey);
    return null;
  }
}

function storeTokens(tokens: StoredTokens) {
  window.localStorage.setItem(tokenStorageKey, JSON.stringify(tokens));
}

function clearTokens() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(tokenStorageKey);
  }
}

function initializeKeycloak(client: Keycloak) {
  const storedTokens = readStoredTokens();
  const origin = getPreferredLocalOrigin();
  keycloakInit ??= client.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: false,
    silentCheckSsoRedirectUri: `${origin}/silent-check-sso.html`,
    silentCheckSsoFallback: false,
    token: storedTokens?.token,
    refreshToken: storedTokens?.refreshToken,
    idToken: storedTokens?.idToken,
  });
  return keycloakInit;
}

async function refreshClientToken(client: Keycloak) {
  await client.updateToken(30);
  if (client.token) {
    storeTokens({
      token: client.token,
      refreshToken: client.refreshToken,
      idToken: client.idToken,
    });
  }
}

async function loadCurrentUser(client: Keycloak): Promise<CurrentUser> {
  await refreshClientToken(client);
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
      void refreshClientToken(client).catch(() => {
        clearTokens();
        setIsAuthenticated(false);
        setUser(null);
      });
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
        clearTokens();
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

  const login = useCallback(async ({ email, password }: LoginCredentials) => {
    const response = await fetch(
      `${getKeycloakUrl()}/realms/${keycloakRealm}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: keycloakClientId,
          grant_type: "password",
          username: email,
          password,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Identifiants invalides ou compte non autorise.");
    }

    const payload = (await response.json()) as TokenEndpointResponse;
    storeTokens({
      token: payload.access_token,
      refreshToken: payload.refresh_token,
      idToken: payload.id_token,
    });

    keycloak = null;
    keycloakInit = null;

    const client = getKeycloak();
    const authenticated = await initializeKeycloak(client);
    if (!authenticated) {
      clearTokens();
      throw new Error("La session Keycloak n'a pas pu etre initialisee.");
    }

    const currentUser = await loadCurrentUser(client);
    setUser(currentUser);
    setIsAuthenticated(true);
    setIsReady(true);
  }, []);

  const loginRedirect = useCallback(async () => {
    const client = getKeycloak();
    await client.login({
      redirectUri: `${getPreferredLocalOrigin()}/dashboard`,
    });
  }, []);

  const logout = useCallback(async () => {
    const client = getKeycloak();
    const refreshToken = client.refreshToken ?? readStoredTokens()?.refreshToken;

    if (refreshToken) {
      await fetch(`${getKeycloakUrl()}/realms/${keycloakRealm}/protocol/openid-connect/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: keycloakClientId,
          refresh_token: refreshToken,
        }),
      }).catch(() => undefined);
    }

    clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    client.clearToken();
    window.location.assign(getPreferredLocalOrigin());
  }, []);

  const authenticatedFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const client = getKeycloak();
    await refreshClientToken(client);
    if (!client.token) {
      throw new Error("No active Keycloak access token");
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${client.token}`);
    return fetch(input, { ...init, headers });
  }, []);

  const roles = useMemo<Role[]>(() => user?.roles ?? [], [user]);
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
      loginRedirect,
      logout,
    }),
    [isReady, isAuthenticated, user, roles, authenticatedFetch, login, loginRedirect, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
