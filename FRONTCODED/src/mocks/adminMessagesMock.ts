// Données de démonstration centralisées pour la Messagerie (rôle ADMIN / Pilote).
// Activées via la variable d'environnement Vite VITE_USE_ADMIN_MESSAGES_MOCK=true.
// Lorsque cette variable est désactivée, la page utilise les appels API réels
// existants (aucune modification du backend).

import type { Conversation, Message, MessagingDirectoryUser } from "@/lib/api/messages";

export function isAdminMessagesMockEnabled() {
  return import.meta.env.VITE_USE_ADMIN_MESSAGES_MOCK === "true";
}

// Bannettes réelles CGI-Intranet — ne jamais utiliser "Support N1" / "Support N2" ici.
export const REAL_BANNETTES = [
  "FO",
  "BO",
  "PROXI-PMC",
  "Partenaire",
  "Supply",
  "DS-Magasin",
] as const;
export type RealBannette = (typeof REAL_BANNETTES)[number];

export const MOCK_CURRENT_USER_ID = 9001;

export interface AdminMessagesConversation extends Conversation {
  bannette?: RealBannette;
}

const DAY = "2026-07-19";

function atTime(time: string) {
  return `${DAY}T${time}:00`;
}

export const mockDirectoryUsers: MessagingDirectoryUser[] = [
  { id: 9001, fullName: "Nabil Chraibi", email: "pilote@cgi.local", role: "ADMIN" },
  { id: 9002, fullName: "Karim El Gueddari", email: "karim.elgueddari@cgi.local", role: "MANAGER" },
  { id: 9003, fullName: "Siham Azzouzi", email: "siham.azzouzi@cgi.local", role: "EMPLOYEE" },
  { id: 9004, fullName: "Mouna El Harrak", email: "mouna.elharrak@cgi.local", role: "MANAGER" },
  { id: 9005, fullName: "Anouar Berrichi", email: "anouar.berrichi@cgi.local", role: "EMPLOYEE" },
  { id: 9006, fullName: "Inès El Kettani", email: "ines.elkettani@cgi.local", role: "EMPLOYEE" },
];

export const mockConversations: AdminMessagesConversation[] = [
  {
    id: 1,
    type: "TICKET",
    title: "Suivi du ticket 124381627",
    ticketId: 124381627,
    bannette: "BO",
    createdByUserId: 9001,
    createdAt: atTime("09:00"),
    updatedAt: atTime("13:42"),
    lastMessagePreview:
      "Le diagnostic a été complété. La vérification de la file d'impression est en cours.",
    lastMessageAt: atTime("13:42"),
    lastMessageUrgent: true,
    unreadCount: 0,
    participants: [
      { userId: 9001, joinedAt: atTime("09:00"), active: true, lastReadAt: atTime("13:45") },
      { userId: 9002, joinedAt: atTime("09:00"), active: true, lastReadAt: null },
      { userId: 9003, joinedAt: atTime("13:34"), active: true, lastReadAt: atTime("13:40") },
    ],
  },
  {
    id: 2,
    type: "GROUP",
    title: "Coordination de la bannette FO",
    ticketId: null,
    createdByUserId: 9001,
    createdAt: atTime("08:00"),
    updatedAt: atTime("12:18"),
    lastMessagePreview: "Le planning de la bannette FO a été mis à jour.",
    lastMessageAt: atTime("12:18"),
    lastMessageUrgent: false,
    unreadCount: 2,
    participants: [
      { userId: 9001, joinedAt: atTime("08:00"), active: true, lastReadAt: null },
      { userId: 9004, joinedAt: atTime("08:00"), active: true, lastReadAt: atTime("12:18") },
      { userId: 9005, joinedAt: atTime("08:00"), active: true, lastReadAt: atTime("12:18") },
      { userId: 9006, joinedAt: atTime("08:00"), active: true, lastReadAt: atTime("12:18") },
    ],
  },
  {
    id: 3,
    type: "TICKET",
    title: "Validation du ticket 124470398",
    ticketId: 124470398,
    bannette: "FO",
    createdByUserId: 9001,
    createdAt: atTime("10:00"),
    updatedAt: atTime("11:36"),
    lastMessagePreview: "Le ticket est toujours en risque SLA et nécessite une validation.",
    lastMessageAt: atTime("11:36"),
    lastMessageUrgent: true,
    unreadCount: 0,
    participants: [
      { userId: 9001, joinedAt: atTime("10:00"), active: true, lastReadAt: atTime("11:40") },
      { userId: 9004, joinedAt: atTime("10:00"), active: true, lastReadAt: atTime("11:40") },
      { userId: 9006, joinedAt: atTime("10:00"), active: true, lastReadAt: atTime("11:40") },
    ],
  },
  {
    id: 4,
    type: "DIRECT",
    title: null,
    ticketId: null,
    createdByUserId: 9001,
    createdAt: atTime("10:30"),
    updatedAt: atTime("10:54"),
    lastMessagePreview: "Je confirme ma disponibilité pour le prochain shift.",
    lastMessageAt: atTime("10:54"),
    lastMessageUrgent: false,
    unreadCount: 0,
    participants: [
      { userId: 9001, joinedAt: atTime("10:30"), active: true, lastReadAt: atTime("10:54") },
      { userId: 9005, joinedAt: atTime("10:30"), active: true, lastReadAt: atTime("10:54") },
    ],
  },
];

export const mockMessagesByConversationId: Record<number, Message[]> = {
  1: [
    {
      id: 101,
      conversationId: 1,
      senderUserId: 9001,
      content:
        "Bonjour, le ticket 124381627 a dépassé son délai SLA. Merci de confirmer l'état actuel du traitement.",
      urgent: true,
      createdAt: atTime("13:30"),
      editedAt: null,
      deletedAt: null,
      ownMessage: true,
    },
    {
      id: 102,
      conversationId: 1,
      senderUserId: 9002,
      content: "Le ticket a été réaffecté à Siham Azzouzi. Le diagnostic est en cours.",
      urgent: false,
      createdAt: atTime("13:34"),
      editedAt: null,
      deletedAt: null,
      ownMessage: false,
    },
    {
      id: 103,
      conversationId: 1,
      senderUserId: 9003,
      content:
        "Le document reste bloqué dans la file d'impression. J'ai lancé la vérification du service concerné.",
      urgent: false,
      createdAt: atTime("13:38"),
      editedAt: null,
      deletedAt: null,
      ownMessage: false,
    },
    {
      id: 104,
      conversationId: 1,
      senderUserId: 9002,
      content:
        "Merci de renseigner les actions réalisées et la solution proposée avant de passer le ticket au statut Résolu.",
      urgent: false,
      createdAt: atTime("13:42"),
      editedAt: null,
      deletedAt: null,
      ownMessage: false,
    },
  ],
  2: [
    {
      id: 201,
      conversationId: 2,
      senderUserId: 9004,
      content: "Le planning de la bannette FO a été mis à jour.",
      urgent: false,
      createdAt: atTime("12:18"),
      editedAt: null,
      deletedAt: null,
      ownMessage: false,
    },
  ],
  3: [
    {
      id: 301,
      conversationId: 3,
      senderUserId: 9004,
      content: "Le ticket est toujours en risque SLA et nécessite une validation.",
      urgent: true,
      createdAt: atTime("11:36"),
      editedAt: null,
      deletedAt: null,
      ownMessage: false,
    },
  ],
  4: [
    {
      id: 401,
      conversationId: 4,
      senderUserId: 9005,
      content: "Je confirme ma disponibilité pour le prochain shift.",
      urgent: false,
      createdAt: atTime("10:54"),
      editedAt: null,
      deletedAt: null,
      ownMessage: false,
    },
  ],
};

export function getAdminMessagesMockData() {
  return {
    currentUserId: MOCK_CURRENT_USER_ID,
    directoryUsers: mockDirectoryUsers,
    conversations: mockConversations,
    messagesByConversationId: mockMessagesByConversationId,
  };
}
