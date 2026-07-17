export type TicketStatus =
  | "Nouveau"
  | "Assigné"
  | "En cours"
  | "En attente demandeur"
  | "En attente prestataire"
  | "En attente validation"
  | "Résolu"
  | "Fermé"
  | "Réouvert";

export type TicketPriority = "Faible" | "Moyenne" | "Haute" | "Urgente";
export type TicketCriticality = "Faible" | "Moyenne" | "Haute" | "Critique";
export type TicketSla = "Respecté" | "En risque" | "Dépassé" | "Non applicable";
export type TicketType = "Incident" | "Demande" | "Problème";

export interface Ticket {
  reference: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  criticality: TicketCriticality;
  type: TicketType;
  category: string;
  assignee: string | null;
  department: string;
  sla: TicketSla;
  slaRemaining?: string;
  updated: string;
  createdAt: string;
  requester: string;
  creator: string;
}

export const mockTickets: Ticket[] = [
  {
    reference: "INC-2026-1042",
    title: "Accès VPN impossible",
    description:
      "L'utilisateur ne parvient plus à établir une connexion au réseau interne.",
    status: "En cours",
    priority: "Urgente",
    criticality: "Critique",
    type: "Incident",
    category: "Réseau",
    assignee: "Sara El Amrani",
    department: "Infrastructure",
    sla: "En risque",
    slaRemaining: "42 min restantes",
    updated: "Il y a 8 min",
    createdAt: "Aujourd'hui, 14:42",
    requester: "Nadia El Mansouri",
    creator: "Nadia El Mansouri",
  },
  {
    reference: "INC-2026-1039",
    title: "Erreur de synchronisation des données",
    description:
      "La synchronisation quotidienne reste bloquée depuis ce matin.",
    status: "Assigné",
    priority: "Haute",
    criticality: "Haute",
    type: "Incident",
    category: "Application",
    assignee: "Youssef Karim",
    department: "Applications métier",
    sla: "Respecté",
    updated: "Il y a 24 min",
    createdAt: "Aujourd'hui, 13:10",
    requester: "Fatima Zahra Bouzid",
    creator: "Système",
  },
  {
    reference: "INC-2026-1037",
    title: "Compte utilisateur verrouillé",
    description:
      "Un collaborateur ne peut plus accéder à son espace professionnel.",
    status: "Nouveau",
    priority: "Moyenne",
    criticality: "Moyenne",
    type: "Demande",
    category: "Accès",
    assignee: null,
    department: "Support N1",
    sla: "En risque",
    slaRemaining: "1 h 18 min restantes",
    updated: "Il y a 35 min",
    createdAt: "Aujourd'hui, 12:32",
    requester: "Karim Idrissi",
    creator: "Karim Idrissi",
  },
  {
    reference: "INC-2026-1028",
    title: "Interruption du service de messagerie",
    description:
      "Plusieurs utilisateurs signalent une indisponibilité de la messagerie.",
    status: "En attente prestataire",
    priority: "Urgente",
    criticality: "Critique",
    type: "Incident",
    category: "Messagerie",
    assignee: "Imane Alaoui",
    department: "Infrastructure",
    sla: "Dépassé",
    updated: "Il y a 1 h",
    createdAt: "Aujourd'hui, 09:04",
    requester: "Direction générale",
    creator: "Supervision",
  },
  {
    reference: "INC-2026-1019",
    title: "Installation d'un logiciel métier",
    description: "Demande d'installation validée pour un nouvel employé.",
    status: "Résolu",
    priority: "Faible",
    criticality: "Faible",
    type: "Demande",
    category: "Logiciel",
    assignee: "Amine Bennani",
    department: "Support N2",
    sla: "Respecté",
    updated: "Hier à 16:42",
    createdAt: "Hier, 09:15",
    requester: "Sofia Amrani",
    creator: "RH",
  },
  {
    reference: "INC-2026-1015",
    title: "Imprimante étage 3 hors ligne",
    description: "L'imprimante partagée du 3ème étage est inaccessible.",
    status: "Nouveau",
    priority: "Moyenne",
    criticality: "Moyenne",
    type: "Incident",
    category: "Matériel",
    assignee: null,
    department: "Support N1",
    sla: "Respecté",
    updated: "Il y a 2 h",
    createdAt: "Aujourd'hui, 08:22",
    requester: "Hicham Naciri",
    creator: "Hicham Naciri",
  },
  {
    reference: "INC-2026-1011",
    title: "Lenteur ERP module RH",
    description: "Temps de réponse dégradés sur le module RH depuis 24 h.",
    status: "En cours",
    priority: "Haute",
    criticality: "Haute",
    type: "Problème",
    category: "Application",
    assignee: "Youssef Karim",
    department: "Applications métier",
    sla: "En risque",
    slaRemaining: "2 h 05 min restantes",
    updated: "Il y a 3 h",
    createdAt: "Hier, 15:48",
    requester: "Direction RH",
    creator: "Direction RH",
  },
  {
    reference: "INC-2026-1004",
    title: "Réouverture — accès partagé refusé",
    description: "L'utilisateur signale que le problème n'est pas résolu.",
    status: "Réouvert",
    priority: "Moyenne",
    criticality: "Moyenne",
    type: "Incident",
    category: "Accès",
    assignee: "Sara El Amrani",
    department: "Support N1",
    sla: "Respecté",
    updated: "Hier à 11:20",
    createdAt: "Il y a 2 jours",
    requester: "Meryem Chraibi",
    creator: "Meryem Chraibi",
  },
];

export const departments = [
  "Support N1",
  "Support N2",
  "Infrastructure",
  "Applications métier",
  "Sécurité",
  "RH",
  "Direction générale",
];

export const employees = [
  { name: "Sara El Amrani", team: "Support N1", availability: "Disponible", active: 8, load: "Charge équilibrée" },
  { name: "Youssef Karim", team: "Infrastructure", availability: "Disponible", active: 3, load: "Faible charge" },
  { name: "Imane Alaoui", team: "Support applicatif", availability: "Occupée", active: 11, load: "Charge élevée" },
  { name: "Amine Bennani", team: "Support N2", availability: "Disponible", active: 5, load: "Charge équilibrée" },
];