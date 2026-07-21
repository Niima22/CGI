import type { Conversation, ConversationType, MessagingDirectoryUser } from "@/lib/api/messages";

const conversationTypeLabels: Record<ConversationType, string> = {
  DIRECT: "Conversation directe",
  GROUP: "Conversation de groupe",
  TICKET: "Discussion liée au ticket",
};

export function getConversationTypeLabel(type: ConversationType) {
  return conversationTypeLabels[type];
}

export function formatMessageDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMessageTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatConversationActivityDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getUserDisplayLabel(
  userId: number,
  usersById: Map<number, MessagingDirectoryUser>,
  currentUserId?: number | null,
) {
  if (currentUserId != null && userId === currentUserId) {
    return "Vous";
  }
  const user = usersById.get(userId);
  if (!user) {
    return `Utilisateur #${userId}`;
  }
  return user.fullName || user.email || `Utilisateur #${userId}`;
}

export function buildConversationTitle(
  conversation: Conversation,
  currentUserId: number | null | undefined,
  usersById: Map<number, MessagingDirectoryUser>,
) {
  if (conversation.type === "GROUP") {
    return conversation.title?.trim() || "Conversation de groupe sans titre";
  }
  if (conversation.type === "TICKET") {
    if (conversation.title?.trim()) {
      return conversation.title.trim();
    }
    return conversation.ticketId ? `Ticket ${conversation.ticketId}` : "Discussion liée au ticket";
  }

  const otherParticipant = conversation.participants.find(
    (participant) => currentUserId == null || participant.userId !== currentUserId,
  );
  if (!otherParticipant) {
    return "Conversation directe";
  }
  return getUserDisplayLabel(otherParticipant.userId, usersById, currentUserId);
}

export function buildParticipantSummary(
  conversation: Conversation,
  currentUserId: number | null | undefined,
  usersById: Map<number, MessagingDirectoryUser>,
) {
  const names = conversation.participants.map((participant) =>
    getUserDisplayLabel(participant.userId, usersById, currentUserId),
  );
  if (conversation.type === "DIRECT") {
    return names.join(" - ");
  }
  if (names.length <= 3) {
    return names.join(", ");
  }
  return `${names.slice(0, 3).join(", ")} + ${names.length - 3}`;
}
