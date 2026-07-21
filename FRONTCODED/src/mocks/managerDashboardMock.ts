import type { TicketStatusDistributionResponse } from "@/lib/api/tickets";

export function isManagerDashboardMockEnabled() {
  return import.meta.env.VITE_USE_MANAGER_DASHBOARD_MOCK === "true";
}

export const managerDashboardMock = {
  profile: {
    fullName: "Hajar Ait Lahcen",
    roleLabel: "Superviseure",
    availability: "Disponible",
  },
  scope: {
    bannettes: ["BO", "FO"],
    agentsByBannette: {
      BO: ["Yasmine Akdim", "Omar El Moutaouakil", "Salma Raji"],
      FO: ["Ibtissam Aouad", "Mehdi El Harrak", "Kawtar Bouzid"],
    },
  },
  kpis: [
    { title: "Tickets non affectés", value: "2", delta: "Nécessitent une affectation" },
    { title: "Tickets en cours", value: "5", delta: "Traitements en cours" },
    { title: "Tickets critiques", value: "2", delta: "Intervention prioritaire" },
    { title: "Tickets résolus", value: "8", delta: "Sur la période actuelle" },
    { title: "SLA en risque", value: "1", delta: "Échéance proche" },
    { title: "Agents disponibles", value: "4 / 6", delta: "Périmètre BO et FO" },
  ],
  statusDistribution: [
    { status: "TODO", statusLabel: "À faire", count: 2 },
    { status: "ASSIGNED", statusLabel: "Affectés", count: 3 },
    { status: "IN_PROGRESS", statusLabel: "En cours", count: 5 },
    { status: "RESOLVED", statusLabel: "Résolus", count: 8 },
    { status: "CLOSED", statusLabel: "Fermés", count: 4 },
  ] satisfies TicketStatusDistributionResponse[],
  ticketIndicators: {
    total: 22,
    critical: 2,
    atRiskSla: 1,
    breachedSla: 2,
  },
  agentAvailability: {
    available: 4,
    inCommunication: 1,
    unavailable: 1,
    total: 6,
  },
  agentWorkload: [
    {
      name: "Yasmine Akdim",
      bannette: "BO",
      activeTickets: 4,
      criticalTickets: 1,
      charge: "Élevée",
      tone: "red",
    },
    {
      name: "Omar El Moutaouakil",
      bannette: "BO",
      activeTickets: 2,
      criticalTickets: 0,
      charge: "Équilibrée",
      tone: "purple",
    },
    {
      name: "Ibtissam Aouad",
      bannette: "FO",
      activeTickets: 1,
      criticalTickets: 0,
      charge: "Disponible",
      tone: "green",
    },
  ],
  priorityTickets: [
    {
      reference: "Ticket 124381627",
      title: "Liste des tickets indisponible",
      priority: "P2",
      criticality: "Haute",
      status: "En cours",
      sla: "Dépassé",
      bannette: "BO",
      agent: "Yasmine Akdim",
    },
    {
      reference: "Ticket 124470398",
      title: "Tableau de bord mal affiché",
      priority: "P2",
      criticality: "Haute",
      status: "Affecté",
      sla: "En risque",
      bannette: "FO",
      agent: "Ibtissam Aouad",
    },
  ],
  sla: {
    respected: 19,
    atRisk: 1,
    breached: 2,
    total: 22,
  },
  nextSlaDeadline: {
    reference: "Ticket 124470398",
    title: "Tableau de bord mal affiché",
    sla: "En risque",
    remaining: "38 minutes",
    bannette: "FO",
    agent: "Ibtissam Aouad",
  },
  planning: {
    presentAgents: 4,
    unavailableAgents: 2,
    pendingLeaveRequests: 1,
    shiftSwapsToProcess: 1,
    detectedConflicts: 0,
  },
  recentActivity: [
    "Le ticket 124381627 a été affecté à Yasmine Akdim.",
    "Le ticket 124470398 est passé en risque SLA.",
    "Omar El Moutaouakil a commencé le traitement d'un ticket.",
    "Kawtar Bouzid a envoyé une demande de congé.",
    "Le planning de Mehdi El Harrak a été modifié.",
  ],
};
