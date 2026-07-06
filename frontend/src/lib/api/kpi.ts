export interface KpiEmployeeSummaryResponse {
  totalAgentsWithTickets: number;
  totalActiveAssignedTickets: number;
  averageWorkloadScore: number | null;
  bestSlaComplianceRate: number | null;
  lowestSlaComplianceRate: number | null;
  generatedAt: string;
}

export interface EmployeeWorkloadKpiResponse {
  assignedUserId: number | null;
  assignedUserLabel: string;
  totalAssignedTickets: number;
  todoTickets: number;
  assignedTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  atRiskTickets: number;
  breachedTickets: number;
  criticalTickets: number;
  workloadScore: number;
}

export interface EmployeeProductivityKpiResponse {
  assignedUserId: number | null;
  assignedUserLabel: string;
  resolvedTickets: number;
  closedTickets: number;
  processedTickets: number;
  averageTreatmentMinutes: number | null;
  slaRespectedTickets: number;
  slaBreachedTickets: number;
  slaComplianceRate: number | null;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class KpiApiError extends Error {
  constructor(
    public status: number,
    message = `HTTP ${status}`,
  ) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return null as T;
    }
    return response.json() as Promise<T>;
  }

  let message = `HTTP ${response.status}`;
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      message = payload.message;
    }
  } catch {
  }

  throw new KpiApiError(response.status, message);
}

export async function getEmployeeKpiSummary(authenticatedFetch: Fetcher) {
  return parseResponse<KpiEmployeeSummaryResponse>(
    await authenticatedFetch("/api/kpi/employees/summary"),
  );
}

export async function getEmployeeWorkload(authenticatedFetch: Fetcher, limit = 5) {
  return parseResponse<EmployeeWorkloadKpiResponse[]>(
    await authenticatedFetch(`/api/kpi/employees/workload?limit=${limit}`),
  );
}

export async function getEmployeeProductivity(authenticatedFetch: Fetcher, limit = 5) {
  return parseResponse<EmployeeProductivityKpiResponse[]>(
    await authenticatedFetch(`/api/kpi/employees/productivity?limit=${limit}`),
  );
}
