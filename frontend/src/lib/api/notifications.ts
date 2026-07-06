export type NotificationType =
  | "TICKET_ASSIGNED"
  | "TICKET_REASSIGNED"
  | "TICKET_STATUS_UPDATED"
  | "TICKET_PENDING_REMINDER"
  | "SLA_AT_RISK"
  | "SLA_BREACHED"
  | "SLA_ESCALATION_LEVEL_1"
  | "SLA_ESCALATION_LEVEL_2";

export interface NotificationResponse {
  id: number;
  ticketId: number | null;
  type: NotificationType;
  typeLabel: string | null;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface UnreadNotificationCountResponse {
  unreadCount: number;
}

export class NotificationApiError extends Error {
  constructor(
    public status: number,
    message = `HTTP ${status}`,
  ) {
    super(message);
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
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

  throw new NotificationApiError(response.status, message);
}

export async function getNotifications(authenticatedFetch: Fetcher) {
  return parseResponse<NotificationResponse[]>(await authenticatedFetch("/api/notifications"));
}

export async function getUnreadNotificationCount(authenticatedFetch: Fetcher) {
  return parseResponse<UnreadNotificationCountResponse>(
    await authenticatedFetch("/api/notifications/unread-count"),
  );
}

export async function markNotificationRead(authenticatedFetch: Fetcher, id: number) {
  return parseResponse<NotificationResponse>(
    await authenticatedFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
  );
}

export async function markAllNotificationsRead(authenticatedFetch: Fetcher) {
  return parseResponse<void>(
    await authenticatedFetch("/api/notifications/read-all", { method: "PATCH" }),
  );
}
