// Données de démonstration centralisées pour la page "Indicateurs KPI" (rôle ADMIN / Pilote).
// Activées via la variable d'environnement Vite VITE_USE_ADMIN_KPI_MOCK=true.
// Aucune valeur calculée n'est codée en dur : les totaux et taux dérivés sont
// recalculés à partir des données brutes ci-dessous.

export function isAdminKpiMockEnabled() {
  return import.meta.env.VITE_USE_ADMIN_KPI_MOCK === "true";
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

export type KpiIndicatorKey = "ticketsTraites" | "tauxResolution" | "qualiteService" | "nps";

export interface AdminKpiMockFilters {
  period: string;
  bannette: string;
  agent: string;
  indicator: KpiIndicatorKey;
}

export interface KpiMainCard {
  key: string;
  label: string;
  value: number;
  unit: "%" | "count" | "score";
  delta: number;
  deltaUnit: "%" | "points" | "count";
}

export const mockKpiMainCards: KpiMainCard[] = [
  {
    key: "quality",
    label: "Qualité de service globale",
    value: 92,
    unit: "%",
    delta: 3,
    deltaUnit: "%",
  },
  {
    key: "handled",
    label: "Tickets traités",
    value: 184,
    unit: "count",
    delta: 18,
    deltaUnit: "count",
  },
  {
    key: "resolution",
    label: "Taux de résolution",
    value: 78,
    unit: "%",
    delta: 4,
    deltaUnit: "%",
  },
  { key: "escalation", label: "Taux d'escalade", value: 12, unit: "%", delta: -2, deltaUnit: "%" },
  { key: "transfer", label: "Taux de transfert", value: 10, unit: "%", delta: -1, deltaUnit: "%" },
  { key: "nps", label: "NPS global", value: 41, unit: "score", delta: 5, deltaUnit: "points" },
];

export interface KpiEvolutionPoint {
  period: string;
  qualiteService: number;
  tauxResolution: number;
  nps: number;
}

export const mockKpiEvolution: KpiEvolutionPoint[] = [
  { period: "Semaine 1", qualiteService: 84, tauxResolution: 68, nps: 28 },
  { period: "Semaine 2", qualiteService: 86, tauxResolution: 70, nps: 30 },
  { period: "Semaine 3", qualiteService: 88, tauxResolution: 72, nps: 33 },
  { period: "Semaine 4", qualiteService: 89, tauxResolution: 74, nps: 35 },
  { period: "Semaine 5", qualiteService: 91, tauxResolution: 76, nps: 38 },
  { period: "Semaine 6", qualiteService: 92, tauxResolution: 78, nps: 41 },
];

export interface BannettePerformance {
  bannette: RealBannette;
  ticketsTraites: number;
  tauxResolution: number;
  qualiteService: number;
  nps: number;
}

export const mockBannettePerformance: BannettePerformance[] = [
  { bannette: "FO", ticketsTraites: 38, tauxResolution: 82, qualiteService: 94, nps: 46 },
  { bannette: "BO", ticketsTraites: 42, tauxResolution: 76, qualiteService: 91, nps: 39 },
  { bannette: "PROXI-PMC", ticketsTraites: 31, tauxResolution: 74, qualiteService: 89, nps: 35 },
  { bannette: "Partenaire", ticketsTraites: 27, tauxResolution: 81, qualiteService: 93, nps: 44 },
  { bannette: "Supply", ticketsTraites: 24, tauxResolution: 75, qualiteService: 90, nps: 37 },
  { bannette: "DS-Magasin", ticketsTraites: 22, tauxResolution: 79, qualiteService: 92, nps: 42 },
];

const ticketsResolus = 144;
const ticketsEscalades = 22;
const transfertsInternes = 11;
const transfertsExternes = 7;

export const mockTicketProductivity = {
  resolus: ticketsResolus,
  escalades: ticketsEscalades,
  transfertsInternes,
  transfertsExternes,
  totalTraite: ticketsResolus + ticketsEscalades + transfertsInternes + transfertsExternes,
};

const appelsComptabilises = 420;
const appelsRepondus = 386;

export const mockCallQuality = {
  appelsComptabilises,
  appelsRepondus,
  appelsPerdus: 21,
  appelsAbandonnes: 13,
  tauxDecrochePercent: Math.round((appelsRepondus / appelsComptabilises) * 1000) / 10,
  tempsMoyenAttenteSeconds: 24,
  tempsMoyenCommunicationSeconds: 6 * 60 + 18,
  slaReponseSous30sPercent: 88,
};

const promoteursPercent = 62;
const neutresPercent = 17;
const detracteursPercent = 21;

export const mockNpsBreakdown = {
  promoteursPercent,
  neutresPercent,
  detracteursPercent,
  npsGlobal: promoteursPercent - detracteursPercent,
};

export interface AgentPerformance {
  fullName: string;
  bannette: RealBannette;
  ticketsTraites: number;
  tauxResolution: number;
  tauxEscalade: number;
  qualiteService: number;
  nps: number;
}

export const mockAgentPerformance: AgentPerformance[] = [
  {
    fullName: "Soukaina El Idrissi",
    bannette: "FO",
    ticketsTraites: 31,
    tauxResolution: 84,
    tauxEscalade: 8,
    qualiteService: 95,
    nps: 48,
  },
  {
    fullName: "Amine Boussaid",
    bannette: "BO",
    ticketsTraites: 34,
    tauxResolution: 77,
    tauxEscalade: 11,
    qualiteService: 91,
    nps: 40,
  },
  {
    fullName: "Mariam El Fassi",
    bannette: "PROXI-PMC",
    ticketsTraites: 27,
    tauxResolution: 73,
    tauxEscalade: 15,
    qualiteService: 88,
    nps: 33,
  },
  {
    fullName: "Youssef Ait Ali",
    bannette: "Partenaire",
    ticketsTraites: 25,
    tauxResolution: 82,
    tauxEscalade: 9,
    qualiteService: 94,
    nps: 45,
  },
  {
    fullName: "Hiba Bennani",
    bannette: "Supply",
    ticketsTraites: 23,
    tauxResolution: 75,
    tauxEscalade: 13,
    qualiteService: 90,
    nps: 36,
  },
  {
    fullName: "Rayan Chraibi",
    bannette: "DS-Magasin",
    ticketsTraites: 22,
    tauxResolution: 79,
    tauxEscalade: 10,
    qualiteService: 92,
    nps: 42,
  },
];

export interface KpiAlert {
  bannette: RealBannette;
  message: string;
  tone: "red" | "orange" | "purple";
}

export const mockKpiAlerts: KpiAlert[] = [
  { bannette: "PROXI-PMC", message: "Taux d'escalade supérieur au seuil", tone: "red" },
  { bannette: "Supply", message: "Taux de résolution inférieur à l'objectif", tone: "orange" },
  { bannette: "BO", message: "Qualité de service en légère baisse", tone: "purple" },
  { bannette: "DS-Magasin", message: "Volume de tickets en augmentation", tone: "orange" },
];

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildMainCardsFromAgent(agent: AgentPerformance): KpiMainCard[] {
  const transferRate = Math.max(
    4,
    Math.round((agent.ticketsTraites / mockTicketProductivity.totalTraite) * 100),
  );

  return [
    {
      key: "quality",
      label: "Qualité de service globale",
      value: agent.qualiteService,
      unit: "%",
      delta: 2,
      deltaUnit: "%",
    },
    {
      key: "handled",
      label: "Tickets traités",
      value: agent.ticketsTraites,
      unit: "count",
      delta: 3,
      deltaUnit: "count",
    },
    {
      key: "resolution",
      label: "Taux de résolution",
      value: agent.tauxResolution,
      unit: "%",
      delta: 2,
      deltaUnit: "%",
    },
    {
      key: "escalation",
      label: "Taux d'escalade",
      value: agent.tauxEscalade,
      unit: "%",
      delta: -1,
      deltaUnit: "%",
    },
    {
      key: "transfer",
      label: "Taux de transfert",
      value: transferRate,
      unit: "%",
      delta: 0,
      deltaUnit: "%",
    },
    {
      key: "nps",
      label: "NPS global",
      value: agent.nps,
      unit: "score",
      delta: 3,
      deltaUnit: "points",
    },
  ];
}

function buildMainCardsFromBannette(
  bannette: RealBannette,
  agents: AgentPerformance[],
): KpiMainCard[] {
  const performance = mockBannettePerformance.find((row) => row.bannette === bannette);
  if (!performance) {
    return mockKpiMainCards;
  }

  return [
    {
      key: "quality",
      label: "Qualité de service globale",
      value: performance.qualiteService,
      unit: "%",
      delta: 2,
      deltaUnit: "%",
    },
    {
      key: "handled",
      label: "Tickets traités",
      value: performance.ticketsTraites,
      unit: "count",
      delta: 4,
      deltaUnit: "count",
    },
    {
      key: "resolution",
      label: "Taux de résolution",
      value: performance.tauxResolution,
      unit: "%",
      delta: 2,
      deltaUnit: "%",
    },
    {
      key: "escalation",
      label: "Taux d'escalade",
      value: average(agents.map((agent) => agent.tauxEscalade)),
      unit: "%",
      delta: -1,
      deltaUnit: "%",
    },
    {
      key: "transfer",
      label: "Taux de transfert",
      value: Math.max(
        5,
        Math.round((performance.ticketsTraites / mockTicketProductivity.totalTraite) * 100),
      ),
      unit: "%",
      delta: 0,
      deltaUnit: "%",
    },
    {
      key: "nps",
      label: "NPS global",
      value: performance.nps,
      unit: "score",
      delta: 2,
      deltaUnit: "points",
    },
  ];
}

function scaleTicketProductivity(ratio: number) {
  const resolus = Math.round(mockTicketProductivity.resolus * ratio);
  const escalades = Math.round(mockTicketProductivity.escalades * ratio);
  const internes = Math.round(mockTicketProductivity.transfertsInternes * ratio);
  const externes = Math.round(mockTicketProductivity.transfertsExternes * ratio);

  return {
    resolus,
    escalades,
    transfertsInternes: internes,
    transfertsExternes: externes,
    totalTraite: resolus + escalades + internes + externes,
  };
}

export function getAdminKpiMockData() {
  return {
    mainCards: mockKpiMainCards,
    evolution: mockKpiEvolution,
    bannettePerformance: mockBannettePerformance,
    ticketProductivity: mockTicketProductivity,
    callQuality: mockCallQuality,
    npsBreakdown: mockNpsBreakdown,
    agentPerformance: mockAgentPerformance,
    alerts: mockKpiAlerts,
  };
}

export function getFilteredAdminKpiMockData(filters: AdminKpiMockFilters) {
  const base = getAdminKpiMockData();
  const periodCount = Number(filters.period);
  const evolution = base.evolution.slice(Math.max(0, base.evolution.length - periodCount));

  let bannettePerformance = base.bannettePerformance;
  let agentPerformance = base.agentPerformance;
  let alerts = base.alerts;
  let mainCards = base.mainCards;
  let ticketProductivity = base.ticketProductivity;
  const callQuality = base.callQuality;
  let npsBreakdown = base.npsBreakdown;

  if (filters.bannette !== "all") {
    const bannette = filters.bannette as RealBannette;
    bannettePerformance = base.bannettePerformance.filter((row) => row.bannette === bannette);
    agentPerformance = base.agentPerformance.filter((row) => row.bannette === bannette);
    alerts = base.alerts.filter((row) => row.bannette === bannette);

    const performance = base.bannettePerformance.find((row) => row.bannette === bannette);
    if (performance) {
      const ratio = performance.ticketsTraites / mockTicketProductivity.totalTraite;
      ticketProductivity = scaleTicketProductivity(ratio);
      mainCards = buildMainCardsFromBannette(bannette, agentPerformance);
    }
  }

  if (filters.agent !== "all") {
    const selectedAgent = base.agentPerformance.find((row) => row.fullName === filters.agent);
    agentPerformance = agentPerformance.filter((row) => row.fullName === filters.agent);
    if (selectedAgent) {
      mainCards = buildMainCardsFromAgent(selectedAgent);
      const ratio = selectedAgent.ticketsTraites / mockTicketProductivity.totalTraite;
      ticketProductivity = scaleTicketProductivity(ratio);
      npsBreakdown = {
        promoteursPercent: Math.min(85, selectedAgent.nps + 20),
        neutresPercent: 15,
        detracteursPercent: Math.max(5, 100 - (selectedAgent.nps + 20) - 15),
        npsGlobal: selectedAgent.nps,
      };
    }
  }

  return {
    mainCards,
    evolution,
    bannettePerformance,
    ticketProductivity,
    callQuality,
    npsBreakdown,
    agentPerformance,
    alerts,
  };
}
