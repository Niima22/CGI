export type ConversationType = "DIRECT" | "GROUP" | "TICKET";
export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface Participant {
  userId: number;
  joinedAt: string;
  active: boolean;
  lastReadAt: string | null;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  title: string | null;
  ticketId: number | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastMessageUrgent: boolean | null;
  unreadCount: number;
}

export interface Message {
  id: number;
  conversationId: number;
  senderUserId: number;
  content: string;
  urgent: boolean;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  ownMessage: boolean;
}

export interface CreateConversationRequest {
  type: ConversationType;
  title?: string | null;
  participantUserIds?: number[];
  ticketId?: number | null;
  initialMessage?: string | null;
  urgent?: boolean | null;
}

export interface SendMessageRequest {
  content: string;
  urgent?: boolean | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface PaginatedMessagesResponse {
  content: Message[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
}

export interface ParticipantRequest {
  userId: number;
}

export interface MessagingDirectoryUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
}

export class MessagesApiError extends Error {
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

  throw new MessagesApiError(response.status, message);
}

function normalizeMessagePage(payload: unknown): PaginatedMessagesResponse {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const content = Array.isArray(record.content) ? (record.content as Message[]) : [];
  const page = typeof record.page === "number" ? record.page : 0;
  const size = typeof record.size === "number" ? record.size : content.length;
  const totalElements = typeof record.totalElements === "number" ? record.totalElements : content.length;
  const totalPages =
    typeof record.totalPages === "number"
      ? record.totalPages
      : size > 0
        ? Math.max(1, Math.ceil(totalElements / size))
        : 1;
  const first = typeof record.first === "boolean" ? record.first : page <= 0;
  const last = typeof record.last === "boolean" ? record.last : page >= Math.max(0, totalPages - 1);

  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first,
    last,
    hasNext: !last,
  };
}

export async function listConversations(authenticatedFetch: Fetcher) {
  return parseResponse<Conversation[]>(await authenticatedFetch("/api/messages/conversations"));
}

export async function getConversationDetail(authenticatedFetch: Fetcher, conversationId: number | string) {
  return parseResponse<Conversation>(await authenticatedFetch(`/api/messages/conversations/${conversationId}`));
}

export async function createDirectConversation(
  authenticatedFetch: Fetcher,
  participantUserId: number,
  options?: Pick<CreateConversationRequest, "initialMessage" | "urgent">,
) {
  return parseResponse<Conversation>(
    await authenticatedFetch("/api/messages/conversations", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        type: "DIRECT",
        participantUserIds: [participantUserId],
        initialMessage: options?.initialMessage ?? null,
        urgent: options?.urgent ?? false,
      } satisfies CreateConversationRequest),
    }),
  );
}

export async function createGroupConversation(
  authenticatedFetch: Fetcher,
  request: Omit<CreateConversationRequest, "type">,
) {
  return parseResponse<Conversation>(
    await authenticatedFetch("/api/messages/conversations", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        type: "GROUP",
        title: request.title ?? null,
        participantUserIds: request.participantUserIds ?? [],
        initialMessage: request.initialMessage ?? null,
        urgent: request.urgent ?? false,
      } satisfies CreateConversationRequest),
    }),
  );
}

export async function getTicketConversation(authenticatedFetch: Fetcher, ticketId: number | string) {
  return parseResponse<Conversation>(
    await authenticatedFetch(`/api/messages/tickets/${ticketId}/conversation`),
  );
}

export async function createTicketConversation(
  authenticatedFetch: Fetcher,
  ticketId: number | string,
  request: Omit<CreateConversationRequest, "type" | "ticketId">,
) {
  return parseResponse<Conversation>(
    await authenticatedFetch(`/api/messages/tickets/${ticketId}/conversation`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        type: "TICKET",
        participantUserIds: request.participantUserIds ?? [],
        initialMessage: request.initialMessage ?? null,
        urgent: request.urgent ?? false,
      } satisfies CreateConversationRequest),
    }),
  );
}

export async function getConversationMessages(
  authenticatedFetch: Fetcher,
  conversationId: number | string,
  page = 0,
  size = 50,
) {
  const payload = await parseResponse<unknown>(
    await authenticatedFetch(`/api/messages/conversations/${conversationId}/messages?page=${page}&size=${size}`),
  );
  return normalizeMessagePage(payload);
}

export async function sendMessage(
  authenticatedFetch: Fetcher,
  conversationId: number | string,
  request: SendMessageRequest,
) {
  return parseResponse<Message>(
    await authenticatedFetch(`/api/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        content: request.content.trim(),
        urgent: request.urgent ?? false,
      } satisfies SendMessageRequest),
    }),
  );
}

export async function markConversationRead(authenticatedFetch: Fetcher, conversationId: number | string) {
  return parseResponse<Participant>(
    await authenticatedFetch(`/api/messages/conversations/${conversationId}/read`, {
      method: "PATCH",
    }),
  );
}

export async function addConversationParticipant(
  authenticatedFetch: Fetcher,
  conversationId: number | string,
  userId: number,
) {
  return parseResponse<Participant>(
    await authenticatedFetch(`/api/messages/conversations/${conversationId}/participants`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ userId } satisfies ParticipantRequest),
    }),
  );
}

export async function removeConversationParticipant(
  authenticatedFetch: Fetcher,
  conversationId: number | string,
  userId: number,
) {
  return parseResponse<Participant>(
    await authenticatedFetch(`/api/messages/conversations/${conversationId}/participants/${userId}`, {
      method: "DELETE",
    }),
  );
}

export async function getUnreadCount(authenticatedFetch: Fetcher) {
  return parseResponse<UnreadCountResponse>(await authenticatedFetch("/api/messages/unread-count"));
}

export async function listMessagingDirectoryUsers(authenticatedFetch: Fetcher) {
  return parseResponse<MessagingDirectoryUser[]>(await authenticatedFetch("/api/auth/directory"));
}
