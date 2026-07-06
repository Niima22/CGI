export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";
export type AvailabilityStatus =
  | "AVAILABLE"
  | "BREAK"
  | "IN_COMMUNICATION"
  | "LEAVE"
  | "OFFLINE";

export interface Employee {
  id: number;
  userKeycloakId: string | null;
  fullName: string;
  email: string | null;
  jobTitle: string | null;
  department: string;
  bannette: string | null;
  operationalStatus: string | null;
  activityStatus: string | null;
  managerKeycloakId: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  status: EmployeeStatus | null;
  availabilityStatus: AvailabilityStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePayload {
  userKeycloakId?: string | null;
  fullName: string;
  email?: string | null;
  jobTitle?: string | null;
  department: string;
  bannette?: string | null;
  operationalStatus?: string | null;
  activityStatus?: string | null;
  managerKeycloakId?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: EmployeeStatus | null;
}

export interface MyEmployeeProfilePayload {
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  profilePhotoUrl?: string | null;
}

export interface ImportEmployee {
  fullName: string;
  department: string;
  bannette: string | null;
  operationalStatus: string | null;
  activityStatus: string | null;
  email: string | null;
  userKeycloakId: string | null;
  managerKeycloakId: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface EmployeeImportPreview {
  count: number;
  employees: ImportEmployee[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message = `HTTP ${status}`,
  ) {
    super(message);
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}

function jsonHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return headers;
}

export async function fetchEmployees(authenticatedFetch: Fetcher) {
  return parseResponse<Employee[]>(await authenticatedFetch("/api/employees"));
}

export async function fetchEmployee(authenticatedFetch: Fetcher, id: string | number) {
  return parseResponse<Employee>(await authenticatedFetch(`/api/employees/${id}`));
}

export async function fetchMyEmployee(authenticatedFetch: Fetcher) {
  return parseResponse<Employee>(await authenticatedFetch("/api/employees/me"));
}

export async function updateMyAvailabilityStatus(
  authenticatedFetch: Fetcher,
  availabilityStatus: AvailabilityStatus,
) {
  return parseResponse<Employee>(
    await authenticatedFetch("/api/employees/me/availability-status", {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ availabilityStatus }),
    }),
  );
}

export async function updateMyProfile(
  authenticatedFetch: Fetcher,
  payload: MyEmployeeProfilePayload,
) {
  return parseResponse<Employee>(
    await authenticatedFetch("/api/employees/me/profile", {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function uploadProfilePhoto(authenticatedFetch: Fetcher, file: File) {
  const formData = new FormData();
  formData.set("file", file);
  return parseResponse<Employee>(
    await authenticatedFetch("/api/employees/me/profile-photo", {
      method: "POST",
      body: formData,
    }),
  );
}

export async function createEmployee(authenticatedFetch: Fetcher, payload: EmployeePayload) {
  return parseResponse<Employee>(
    await authenticatedFetch("/api/employees", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateEmployee(
  authenticatedFetch: Fetcher,
  id: string | number,
  payload: EmployeePayload,
) {
  return parseResponse<Employee>(
    await authenticatedFetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateEmployeeBannette(
  authenticatedFetch: Fetcher,
  id: string | number,
  bannette: string,
) {
  return parseResponse<Employee>(
    await authenticatedFetch(`/api/employees/${id}/bannette`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ bannette }),
    }),
  );
}

export async function linkEmployeeUser(
  authenticatedFetch: Fetcher,
  id: string | number,
  payload: { userKeycloakId: string | null; email: string | null },
) {
  return parseResponse<Employee>(
    await authenticatedFetch(`/api/employees/${id}/link-user`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function assignEmployeeManager(
  authenticatedFetch: Fetcher,
  id: string | number,
  managerKeycloakId: string | null,
) {
  return parseResponse<Employee>(
    await authenticatedFetch(`/api/employees/${id}/manager`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ managerKeycloakId }),
    }),
  );
}

export async function updateEmployeeDepartment(
  authenticatedFetch: Fetcher,
  id: string | number,
  departmentId: number,
) {
  return parseResponse<Employee>(
    await authenticatedFetch(`/api/employees/${id}/department`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ departmentId }),
    }),
  );
}

export async function previewEmployeeImport(authenticatedFetch: Fetcher, file: File) {
  const formData = new FormData();
  formData.set("file", file);
  return parseResponse<EmployeeImportPreview>(
    await authenticatedFetch("/api/employees/import/preview", {
      method: "POST",
      body: formData,
    }),
  );
}

export async function confirmEmployeeImport(authenticatedFetch: Fetcher, employees: ImportEmployee[]) {
  return parseResponse<Employee[]>(
    await authenticatedFetch("/api/employees/import/confirm", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ employees }),
    }),
  );
}
