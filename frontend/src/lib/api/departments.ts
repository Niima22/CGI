export interface Department {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  managerKeycloakId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentPayload {
  name: string;
  description?: string | null;
  managerKeycloakId?: string | null;
}

export class DepartmentApiError extends Error {
  constructor(
    public status: number,
    message = `HTTP ${status}`,
  ) {
    super(message);
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new DepartmentApiError(response.status);
  }
  return response.json() as Promise<T>;
}

function jsonHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return headers;
}

export async function fetchDepartments(authenticatedFetch: Fetcher, includeInactive = true) {
  return parseResponse<Department[]>(
    await authenticatedFetch(`/api/departments?includeInactive=${includeInactive ? "true" : "false"}`),
  );
}

export async function createDepartment(authenticatedFetch: Fetcher, payload: DepartmentPayload) {
  return parseResponse<Department>(
    await authenticatedFetch("/api/departments", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateDepartment(
  authenticatedFetch: Fetcher,
  id: number | string,
  payload: DepartmentPayload,
) {
  return parseResponse<Department>(
    await authenticatedFetch(`/api/departments/${id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateDepartmentStatus(
  authenticatedFetch: Fetcher,
  id: number | string,
  active: boolean,
) {
  return parseResponse<Department>(
    await authenticatedFetch(`/api/departments/${id}/status`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ active }),
    }),
  );
}
