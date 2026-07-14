export type PlanningStatus = "Draft" | "Validated" | "Published";

export type ShiftValue =
  | "03:00 → 12:00"
  | "05:00 → 14:00"
  | "07:00 → 16:00"
  | "08:00 → 17:00"
  | "09:00 → 18:00"
  | "12:00 → 21:00"
  | "13:00 → 22:00"
  | "OFF"
  | "Congé"
  | "ABS";

export interface PlanningAgent {
  id: string;
  name: string;
  department: string;
}

export interface PlanningDay {
  key: string;
  label: string;
  date: string;
}

export interface PlanningShift {
  agentId: string;
  dayKey: string;
  value: ShiftValue;
  generated: boolean;
}

export interface PlanningConflict {
  id: string;
  severity: "High" | "Medium" | "Low";
  message: string;
  agentName?: string;
}

export interface WeeklyPlanning {
  id: string;
  weekStartDate: string;
  status: PlanningStatus;
  agents: PlanningAgent[];
  days: PlanningDay[];
  shifts: PlanningShift[];
  conflicts: PlanningConflict[];
}

export const planningEndpoints = {
  getPlanningByWeek: (weekStartDate: string) => `/api/plannings/week/${weekStartDate}`,
  generatePlanning: "/api/plannings/generate",
  validatePlanning: "/api/plannings/validate",
  publishPlanning: (id: string) => `/api/plannings/${id}/publish`,
} as const;

export type AuthenticatedFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const agents: PlanningAgent[] = [
  { id: "ranya-kissami", name: "Ranya Kissami", department: "Support" },
  { id: "fatima-ezzahra-amanne", name: "Fatima Ezzahra Amanne", department: "Support" },
  { id: "othmane-janah", name: "Othmane Janah", department: "NOC" },
  { id: "karam-znidiga", name: "Karam Znidiga", department: "NOC" },
  { id: "hassnae-hassib", name: "Hassnae Hassib", department: "Back Office" },
  { id: "chaimae-el-kadiri", name: "Chaimae El Kadiri", department: "Back Office" },
  { id: "majdouline-hrar", name: "Majdouline Hrar", department: "Support" },
  { id: "abdellilah-saoudi", name: "Abdellilah Saoudi", department: "Field" },
  { id: "bassma-boukhlal", name: "Bassma Boukhlal", department: "Field" },
  { id: "rim-bakoury", name: "Rim Bakoury", department: "Support" },
  { id: "hajar-essabir", name: "Hajar Essabir", department: "NOC" },
  { id: "abdelmoughit-arrabih", name: "Abdelmoughit Arrabih", department: "Back Office" },
];

const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const shiftCycle: ShiftValue[] = [
  "03:00 → 12:00",
  "05:00 → 14:00",
  "07:00 → 16:00",
  "08:00 → 17:00",
  "09:00 → 18:00",
  "12:00 → 21:00",
  "13:00 → 22:00",
  "OFF",
  "Congé",
  "ABS",
];

export function getPlanningByWeek(
  _authenticatedFetch: AuthenticatedFetch,
  weekStartDate: string,
): Promise<WeeklyPlanning> {
  return Promise.resolve(createMockPlanning(weekStartDate, false));
}

export function generatePlanning(
  _authenticatedFetch: AuthenticatedFetch,
  weekStartDate: string,
): Promise<WeeklyPlanning> {
  return Promise.resolve(createMockPlanning(weekStartDate, true));
}

export function validatePlanning(
  _authenticatedFetch: AuthenticatedFetch,
  planning: WeeklyPlanning,
): Promise<WeeklyPlanning> {
  const conflicts = planning.conflicts.length > 0 ? [] : sampleConflicts();
  return Promise.resolve({
    ...planning,
    status: conflicts.length > 0 ? "Draft" : "Validated",
    conflicts,
  });
}

export function publishPlanning(
  _authenticatedFetch: AuthenticatedFetch,
  planning: WeeklyPlanning,
): Promise<WeeklyPlanning> {
  return Promise.resolve({ ...planning, status: "Published", conflicts: [] });
}

function createMockPlanning(weekStartDate: string, generated: boolean): WeeklyPlanning {
  const weekStart = parseLocalDate(weekStartDate);
  const days = dayLabels.map((label, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      key: label.toLowerCase(),
      label,
      date: toDateInputValue(date),
    };
  });

  return {
    id: `planning-${weekStartDate}`,
    weekStartDate,
    status: generated ? "Draft" : "Draft",
    agents,
    days,
    shifts: agents.flatMap((agent, agentIndex) =>
      days.map((day, dayIndex) => ({
        agentId: agent.id,
        dayKey: day.key,
        value: shiftCycle[(agentIndex + dayIndex + (generated ? 2 : 0)) % shiftCycle.length],
        generated,
      })),
    ),
    conflicts: generated ? sampleConflicts() : [],
  };
}

function sampleConflicts(): PlanningConflict[] {
  return [
    {
      id: "coverage-opening",
      severity: "High",
      message: "Opening coverage is under target on Wednesday.",
    },
    {
      id: "agent-rest-window",
      severity: "Medium",
      message: "Short rest window after closing shift.",
      agentName: "Othmane Janah",
    },
  ];
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
