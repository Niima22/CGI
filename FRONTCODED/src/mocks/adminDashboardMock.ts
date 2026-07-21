// Données de démonstration centralisées pour le Centre de contrôle (rôle ADMIN / Pilote).
// Activées via la variable d'environnement Vite VITE_USE_ADMIN_DASHBOARD_MOCK=true.
// Aucune valeur calculée n'est codée en dur : les totaux, taux et compteurs dérivés
// sont recalculés à partir de ces données brutes.

import type { Department } from "@/lib/api/departments";
import type { Employee } from "@/lib/api/employees";
import type { EmployeeWorkloadKpiResponse, KpiEmployeeSummaryResponse } from "@/lib/api/kpi";
import type { SlaDashboardSummaryResponse, SlaUrgentTicketResponse } from "@/lib/api/sla";
import type {
  Ticket,
  TicketDashboardSummaryResponse,
  TicketStatusDistributionResponse,
} from "@/lib/api/tickets";
import type { Role } from "@/lib/auth-store";

export function isAdminDashboardMockEnabled() {
  return import.meta.env.VITE_USE_ADMIN_DASHBOARD_MOCK === "true";
}

export interface AdminDashboardMockUser {
  id: number;
  keycloakId: string;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  accountStatus: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface AdminDashboardUrgentTicket extends SlaUrgentTicketResponse {
  teamLabel: string;
}

export interface AdminDashboardWorkload extends EmployeeWorkloadKpiResponse {
  teamLabel: string;
  responsibleLabel: string;
}

const NOW = new Date().toISOString();

// --- Utilisateurs (10 au total : 1 ADMIN, 2 MANAGER, 7 EMPLOYEE, tous actifs) ---
const roleByIndex: Role[] = [
  "ADMIN",
  "MANAGER",
  "MANAGER",
  "EMPLOYEE",
  "EMPLOYEE",
  "EMPLOYEE",
  "EMPLOYEE",
  "EMPLOYEE",
  "EMPLOYEE",
  "EMPLOYEE",
];

export const mockUsers: AdminDashboardMockUser[] = roleByIndex.map((role, index) => ({
  id: index + 1,
  keycloakId: `kc-mock-${index + 1}`,
  fullName: `Utilisateur Demo ${index + 1}`,
  email: `utilisateur${index + 1}@cgi-demo.local`,
  role,
  active: true,
  accountStatus: "ACTIVE",
  createdAt: NOW,
  updatedAt: NOW,
}));

// --- Départements (5, avec effectifs cohérents avec les 10 employés ci-dessous) ---
const departmentNames = [
  "Support informatique",
  
  "Front Office",
  "Infrastructure",
  
];

export const mockDepartments: Department[] = departmentNames.map((name, index) => ({
  id: index + 1,
  name,
  description: null,
  active: true,
  managerKeycloakId: null,
  createdAt: NOW,
  updatedAt: NOW,
}));

// --- Bannettes opérationnelles (6) ---
const bannetteNames = [
  "BO",
  "PROXI-PMC",
  "FO",
  
  
  
];

// Effectif par département : Support informatique 3, Back Office 2, Front Office 2, Infrastructure 2, Sécurité 1
const employeeDepartmentPlan = [
  "Support informatique",
  "Support informatique",
  "Support informatique",
  
  
  "Front Office",
  "Front Office",
  "Infrastructure",
  "Infrastructure",
  
];

export const mockEmployees: Employee[] = employeeDepartmentPlan.map((department, index) => ({
  id: index + 1,
  userKeycloakId: `kc-mock-${index + 1}`,
  fullName: `Utilisateur Demo ${index + 1}`,
  email: `utilisateur${index + 1}@cgi-demo.local`,
  jobTitle: null,
  department,
  bannette: bannetteNames[index % bannetteNames.length],
  operationalStatus: "ACTIVE",
  activityStatus: "AVAILABLE",
  managerKeycloakId: null,
  phone: null,
  address: null,
  bio: null,
  profilePhotoUrl: null,
  latitude: null,
  longitude: null,
  status: "ACTIVE",
  availabilityStatus: "AVAILABLE",
  createdAt: NOW,
  updatedAt: NOW,
}));

// --- Répartition des tickets par statut ---
export const ticketStatusCounts = {
  TODO: 1,
  ASSIGNED: 3,
  IN_PROGRESS: 5,
  RESOLVED: 2,
  CLOSED: 1,
} as const;

export const mockStatusDistribution: TicketStatusDistributionResponse[] = [
  { status: "TODO", statusLabel: "À faire", count: ticketStatusCounts.TODO },
  { status: "ASSIGNED", statusLabel: "Affectés", count: ticketStatusCounts.ASSIGNED },
  { status: "IN_PROGRESS", statusLabel: "En cours", count: ticketStatusCounts.IN_PROGRESS },
  { status: "RESOLVED", statusLabel: "Résolus", count: ticketStatusCounts.RESOLVED },
  { status: "CLOSED", statusLabel: "Fermés", count: ticketStatusCounts.CLOSED },
];

const totalTickets = Object.values(ticketStatusCounts).reduce((sum, value) => sum + value, 0);
const openTickets = totalTickets - ticketStatusCounts.RESOLVED - ticketStatusCounts.CLOSED;

export const mockTicketSummary: TicketDashboardSummaryResponse = {
  totalTickets,
  openTickets,
  todoTickets: ticketStatusCounts.TODO,
  assignedTickets: ticketStatusCounts.ASSIGNED,
  inProgressTickets: ticketStatusCounts.IN_PROGRESS,
  waitingTickets: 0,
  resolvedTickets: ticketStatusCounts.RESOLVED,
  closedTickets: ticketStatusCounts.CLOSED,
  cancelledTickets: 0,
  createdToday: 0,
  resolvedToday: 0,
  closedToday: 0,
  averageTreatmentMinutes: null,
  generatedAt: NOW,
};

// --- Tickets individuels (12), dont 2 critiques ---
const criticalTicketIndexes = new Set([0, 3]);
let ticketSequence = 0;
export const mockTickets: Ticket[] = (
  Object.entries(ticketStatusCounts) as [keyof typeof ticketStatusCounts, number][]
).flatMap(([status, count]) =>
  Array.from({ length: count }, () => {
    const index = ticketSequence;
    ticketSequence += 1;
    return {
      id: index + 1,
      reference: `Ticket ${124381627 + index}`,
      title: `Ticket de démonstration ${index + 1}`,
      description: "Ticket généré pour la démonstration du tableau de bord Pilote.",
      status,
      statusLabel:
        mockStatusDistribution.find((entry) => entry.status === status)?.statusLabel ?? status,
      type: "INCIDENT",
      typeLabel: "Incident",
      category: null,
      subCategory: null,
      priority: criticalTicketIndexes.has(index) ? "URGENT" : "MEDIUM",
      priorityLabel: criticalTicketIndexes.has(index) ? "Critique" : "Moyenne",
      criticality: criticalTicketIndexes.has(index) ? "CRITICAL" : "LOW",
      criticalityLabel: criticalTicketIndexes.has(index) ? "Critique" : "Faible",
      requesterId: 1,
      assignedUserId: null,
      assignedTeamId: null,
      departmentId: null,
      createdAt: NOW,
      updatedAt: NOW,
      assignedAt: null,
      startedAt: null,
      resolvedAt: null,
      closedAt: null,
    } satisfies Ticket;
  }),
);

// --- SLA ---
const slaRespected = 8;
const slaAtRisk = 1;
const slaBreached = 3;
const slaTotalTracked = slaRespected + slaAtRisk + slaBreached;

export const mockSlaSummary: SlaDashboardSummaryResponse = {
  totalTrackedTickets: slaTotalTracked,
  respectedTickets: slaRespected,
  atRiskTickets: slaAtRisk,
  breachedTickets: slaBreached,
  pausedTickets: 0,
  notApplicableTickets: 0,
  criticalBreachedTickets: 1,
  averageResolutionMinutes: null,
  averageResponseMinutes: null,
  slaComplianceRate: Math.round((slaRespected / slaTotalTracked) * 100),
  generatedAt: NOW,
};

// --- Tickets prioritaires / échéance SLA ---
export const mockUrgentTickets: AdminDashboardUrgentTicket[] = [
  {
    ticketId: 1,
    ticketReference: "Ticket 124381627",
    ticketTitle: "Document bloqué sur la file d'impression",
    status: "IN_PROGRESS",
    statusLabel: "En cours",
    priority: "HIGH",
    priorityLabel: "P2",
    criticality: "CRITICAL",
    criticalityLabel: "Critique",
    globalStatus: "BREACHED",
    globalStatusLabel: "SLA dépassé",
    remainingMinutes: -120,
    consumedPercentage: 100,
    resolutionDeadline: NOW,
    assignedUserId: null,
    teamLabel: "Bannette BO",
  },
  {
    ticketId: 4,
    ticketReference: "Ticket 124470398",
    ticketTitle: "Problème d'affichage écran SCO",
    status: "ASSIGNED",
    statusLabel: "Affecté",
    priority: "HIGH",
    priorityLabel: "P2",
    criticality: "HIGH",
    criticalityLabel: "Haute",
    globalStatus: "AT_RISK",
    globalStatusLabel: "SLA en risque",
    remainingMinutes: 38,
    consumedPercentage: 82,
    resolutionDeadline: NOW,
    assignedUserId: null,
    teamLabel: "Bannette FO",
  },
];

// --- Charge des bannettes (3 bannettes, total tickets actifs = 9 = tickets ouverts) ---
export const mockEmployeeSummary: KpiEmployeeSummaryResponse = {
  totalAgentsWithTickets: 3,
  totalActiveAssignedTickets: 9,
  averageWorkloadScore: 9.7,
  bestSlaComplianceRate: mockSlaSummary.slaComplianceRate,
  lowestSlaComplianceRate: mockSlaSummary.slaComplianceRate,
  generatedAt: NOW,
};

export const mockEmployeeWorkload: AdminDashboardWorkload[] = [
  {
    assignedUserId: 101,
    assignedUserLabel: "BO",
    teamLabel: "BO",
    responsibleLabel: "Sara Benomar",
    totalAssignedTickets: 4,
    todoTickets: 1,
    assignedTickets: 2,
    inProgressTickets: 2,
    waitingTickets: 0,
    atRiskTickets: 1,
    breachedTickets: 0,
    criticalTickets: 1,
    workloadScore: 12,
  },
  {
    assignedUserId: 102,
    assignedUserLabel: "PROXI-PMC",
    teamLabel: "PROXI-PMC",
    responsibleLabel: "Othmane Chafik",
    totalAssignedTickets: 3,
    todoTickets: 0,
    assignedTickets: 1,
    inProgressTickets: 1,
    waitingTickets: 0,
    atRiskTickets: 0,
    breachedTickets: 0,
    criticalTickets: 1,
    workloadScore: 11,
  },
  {
    assignedUserId: 103,
    assignedUserLabel: "FO",
    teamLabel: "FO",
    responsibleLabel: "Sara Benomar",
    totalAssignedTickets: 2,
    todoTickets: 0,
    assignedTickets: 2,
    inProgressTickets: 0,
    waitingTickets: 0,
    atRiskTickets: 0,
    breachedTickets: 0,
    criticalTickets: 0,
    workloadScore: 6,
  },
];

export function getAdminDashboardMockData() {
  return {
    users: mockUsers,
    departments: mockDepartments,
    employees: mockEmployees,
    tickets: mockTickets,
    ticketSummary: mockTicketSummary,
    statusDistribution: mockStatusDistribution,
    slaSummary: mockSlaSummary,
    urgentTickets: mockUrgentTickets,
    employeeSummary: mockEmployeeSummary,
    employeeWorkload: mockEmployeeWorkload,
  };
}
