export type TicketStatus =
  | "NEW"
  | "TODO"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_REQUESTER"
  | "WAITING_PROVIDER"
  | "WAITING_MANAGER_VALIDATION"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketCriticality = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TicketType = "INCIDENT" | "REQUEST" | "PROBLEM" | "CHANGE";
export type TicketHistoryActionType =
  | "CREATED"
  | "UPDATED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "REASSIGNED"
  | "PRIORITY_CHANGED"
  | "CRITICALITY_CHANGED"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED"
  | "SLA_STARTED"
  | "SLA_AT_RISK"
  | "SLA_BREACHED"
  | "SLA_ESCALATED_LEVEL_1"
  | "SLA_ESCALATED_LEVEL_2"
  | "SLA_RESPECTED"
  | "SLA_NOT_APPLICABLE";

export interface Ticket {
  id: number;
  reference: string;
  title: string;
  description: string;
  status: TicketStatus;
  statusLabel?: string | null;
  type: TicketType;
  typeLabel?: string | null;
  category: string | null;
  subCategory: string | null;
  priority: TicketPriority;
  priorityLabel?: string | null;
  criticality: TicketCriticality;
  criticalityLabel?: string | null;
  requesterId: number;
  assignedUserId: number | null;
  assignedTeamId: number | null;
  departmentId: number | null;
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface TicketCreatePayload {
  title: string;
  description: string;
  type?: TicketType | null;
  category?: string | null;
  subCategory?: string | null;
  priority?: TicketPriority | null;
  criticality?: TicketCriticality | null;
  departmentId?: number | null;
}

export interface TicketHistoryEntry {
  id: number;
  ticketId: number;
  actionType: TicketHistoryActionType;
  actionTypeLabel?: string | null;
  oldValue: string | null;
  newValue: string | null;
  comment: string | null;
  performedBy: number;
  createdAt: string;
}

export interface TicketDashboardSummaryResponse {
  totalTickets: number;
  openTickets: number;
  todoTickets: number;
  assignedTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  cancelledTickets: number;
  createdToday: number;
  resolvedToday: number;
  closedToday: number;
  averageTreatmentMinutes: number | null;
  generatedAt: string;
}

export interface TicketStatusDistributionResponse {
  status: TicketStatus;
  statusLabel: string;
  count: number;
}

export interface TicketPriorityDistributionResponse {
  priority: TicketPriority;
  priorityLabel: string;
  count: number;
}

export class TicketApiError extends Error {
  constructor(
    public status: number,
    message = `HTTP ${status}`,
  ) {
    super(message);
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function jsonHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
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

  throw new TicketApiError(response.status, message);
}

export async function fetchTickets(authenticatedFetch: Fetcher) {
  return parseResponse<Ticket[]>(await authenticatedFetch("/api/tickets"));
}

export async function fetchTicket(authenticatedFetch: Fetcher, id: string | number) {
  return parseResponse<Ticket>(await authenticatedFetch(`/api/tickets/${id}`));
}

export async function fetchTicketHistory(authenticatedFetch: Fetcher, id: string | number) {
  return parseResponse<TicketHistoryEntry[]>(await authenticatedFetch(`/api/tickets/${id}/history`));
}

export async function createTicket(authenticatedFetch: Fetcher, payload: TicketCreatePayload) {
  return parseResponse<Ticket>(
    await authenticatedFetch("/api/tickets", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function getTicketDashboardSummary(authenticatedFetch: Fetcher) {
  return parseResponse<TicketDashboardSummaryResponse>(
    await authenticatedFetch("/api/tickets/dashboard/summary"),
  );
}

export async function getTicketStatusDistribution(authenticatedFetch: Fetcher) {
  return parseResponse<TicketStatusDistributionResponse[]>(
    await authenticatedFetch("/api/tickets/dashboard/status-distribution"),
  );
}

export async function getTicketPriorityDistribution(authenticatedFetch: Fetcher) {
  return parseResponse<TicketPriorityDistributionResponse[]>(
    await authenticatedFetch("/api/tickets/dashboard/priority-distribution"),
  );
}
