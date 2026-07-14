import type {
  TicketCriticality,
  TicketPriority,
  TicketType,
} from "./tickets";

export type SlaStatus =
  | "RESPECTED"
  | "AT_RISK"
  | "BREACHED"
  | "PAUSED"
  | "NOT_APPLICABLE";

export interface SlaPolicyResponse {
  id: number;
  name: string;
  incidentType: TicketType;
  incidentTypeLabel: string;
  priority: TicketPriority;
  priorityLabel: string;
  criticality: TicketCriticality;
  criticalityLabel: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  warningThresholdPercent: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketSlaResponse {
  ticketId: number;
  policyId: number | null;
  policyName: string | null;
  responseDeadline: string | null;
  resolutionDeadline: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  responseStatus: SlaStatus;
  responseStatusLabel: string;
  resolutionStatus: SlaStatus;
  resolutionStatusLabel: string;
  globalStatus: SlaStatus;
  globalStatusLabel: string;
  elapsedMinutes: number | null;
  remainingMinutes: number | null;
  consumedPercentage: number | null;
  breachReason: string | null;
  lastCalculatedAt: string | null;
}

export interface SlaDashboardSummaryResponse {
  totalTrackedTickets: number;
  respectedTickets: number;
  atRiskTickets: number;
  breachedTickets: number;
  pausedTickets: number;
  notApplicableTickets: number;
  criticalBreachedTickets: number;
  averageResolutionMinutes: number | null;
  averageResponseMinutes: number | null;
  slaComplianceRate: number | null;
  generatedAt: string;
}

export interface SlaUrgentTicketResponse {
  ticketId: number;
  ticketReference: string;
  ticketTitle: string;
  status: string;
  statusLabel: string;
  priority: TicketPriority;
  priorityLabel: string;
  criticality: TicketCriticality;
  criticalityLabel: string;
  globalStatus: SlaStatus;
  globalStatusLabel: string;
  remainingMinutes: number | null;
  consumedPercentage: number | null;
  resolutionDeadline: string | null;
  assignedUserId: number | null;
}

export interface SlaPolicyPayload {
  name: string;
  incidentType: TicketType;
  priority: TicketPriority;
  criticality: TicketCriticality;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  warningThresholdPercent: number;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class SlaApiError extends Error {
  constructor(
    public status: number,
    message = `HTTP ${status}`,
  ) {
    super(message);
  }
}

function jsonHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return headers;
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

  throw new SlaApiError(response.status, message);
}

export async function getSlaPolicies(authenticatedFetch: Fetcher) {
  return parseResponse<SlaPolicyResponse[]>(await authenticatedFetch("/api/sla/policies"));
}

export async function getSlaPolicy(authenticatedFetch: Fetcher, id: string | number) {
  return parseResponse<SlaPolicyResponse>(await authenticatedFetch(`/api/sla/policies/${id}`));
}

export async function createSlaPolicy(authenticatedFetch: Fetcher, payload: SlaPolicyPayload) {
  return parseResponse<SlaPolicyResponse>(
    await authenticatedFetch("/api/sla/policies", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateSlaPolicy(
  authenticatedFetch: Fetcher,
  id: string | number,
  payload: Partial<SlaPolicyPayload>,
) {
  return parseResponse<SlaPolicyResponse>(
    await authenticatedFetch(`/api/sla/policies/${id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateSlaPolicyStatus(
  authenticatedFetch: Fetcher,
  id: string | number,
  active: boolean,
) {
  return parseResponse<SlaPolicyResponse>(
    await authenticatedFetch(`/api/sla/policies/${id}/status`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ active }),
    }),
  );
}

export async function getTicketSla(authenticatedFetch: Fetcher, ticketId: string | number) {
  return parseResponse<TicketSlaResponse>(await authenticatedFetch(`/api/sla/tickets/${ticketId}`));
}

export async function recalculateTicketSla(
  authenticatedFetch: Fetcher,
  ticketId: string | number,
) {
  return parseResponse<TicketSlaResponse>(
    await authenticatedFetch(`/api/sla/tickets/${ticketId}/recalculate`, {
      method: "POST",
    }),
  );
}

export async function getSlaDashboardSummary(authenticatedFetch: Fetcher) {
  return parseResponse<SlaDashboardSummaryResponse>(
    await authenticatedFetch("/api/sla/dashboard/summary"),
  );
}

export async function getSlaUrgentTickets(authenticatedFetch: Fetcher, limit = 10) {
  return parseResponse<SlaUrgentTicketResponse[]>(
    await authenticatedFetch(`/api/sla/dashboard/urgent-tickets?limit=${limit}`),
  );
}
