import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock3,
  Home,
  LoaderCircle,
  Lock,
  RefreshCcw,
  Send,
  Save,
  Sparkles,
  Trash2,
  Unlock,
  Redo2,
  Undo2,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/planning")({
  head: () => ({
    meta: [
      { title: "Planning - CGI Intranet" },
      {
        name: "description",
        content: "Generation automatique et visualisation du planning hebdomadaire.",
      },
    ],
  }),
  component: PlanningPage,
});

type ShiftCategory = "OPENING" | "NORMAL" | "CLOSING" | "SCO";
type ProblemSeverity = "ERROR" | "WARNING";

interface PlanningAgent {
  id: number;
  fullName: string;
  email: string;
  active: boolean;
  fixedSco: boolean;
}

interface Shift {
  id: number;
  code: string;
  name: string;
  category: ShiftCategory;
  startTime: string;
  endTime: string;
  paidHours: number;
}

interface PlanningAssignment {
  id: number | null;
  agentId: number;
  agentName: string;
  shiftId: number;
  shiftCode: string;
  shiftCategory: ShiftCategory;
  assignmentDate: string;
  startTime: string;
  endTime: string;
  paidHours: number;
  latenessMinutes: number;
  locked: boolean;
  generated: boolean;
  manuallyOverridden: boolean;
}

interface PlanningProblem {
  severity: ProblemSeverity;
  code: string;
  message: string;
  agentId: number | null;
  date: string | null;
}

interface AgentUnavailability {
  agentId: number;
  date: string;
  reason: "CONGÉ" | "ABSENT" | "TELETRAVAIL" | string;
}

interface AgentSummary {
  agentId: number;
  fullName: string;
  assignedHours: number;
  openingCount: number;
  closingCount: number;
  offDays: number;
  lateClosingCount: number;
  saturdayOffCount: number;
  sundayOffCount: number;
  completeWeekendOffCount: number;
  lastCompleteWeekendOff: string | null;
  weekendsWorkedCount: number;
  scoCount: number;
}

interface WeeklyPlanning {
  planningWeekId: number | null;
  status: "DRAFT" | "PUBLISHED";
  weekStartDate: string;
  weekEndDate: string;
  shifts: Shift[];
  assignments: PlanningAssignment[];
  problems: PlanningProblem[];
  agentSummaries: AgentSummary[];
  lockedOffDays: string[];
  freezes: PlanningFreeze[];
  unavailableDays: AgentUnavailability[];
  manuallyOverridden: boolean;
}

interface PlanningFreeze {
  agentId: number;
  date: string;
  shiftId: number | null;
  startDate: string;
  endDate: string | null;
}

interface WeekendOffStatistic {
  agentId: number;
  fullName: string;
  periodStart: string;
  periodEnd: string;
  saturdayOffCount: number;
  sundayOffCount: number;
  completeWeekendOffCount: number;
  lastCompleteWeekendOff: string | null;
  completeWeekendOffDates: string[];
}

interface PendingFreeze {
  agent: PlanningAgent;
  date: string;
  shiftId?: number;
  duration: "forever" | "1" | "2" | "4" | "8" | "12";
}

interface PendingLeavePeriod {
  agent: PlanningAgent;
  date: string;
  endDate: string;
}

interface PendingLateness {
  agent: PlanningAgent;
  date: string;
  minutes: number;
}

interface PlanningChangeSummary {
  key: string;
  agentName: string;
  date: string;
  before: string;
  after: string;
}

interface SaveReview {
  warnings: PlanningProblem[];
  changes: PlanningChangeSummary[];
  requiresOverride: boolean;
}

function PlanningPage() {
  const { authenticatedFetch, hasRole, isReady, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isSupervisor = hasRole("ADMIN") || hasRole("MANAGER");
  const [weekStart, setWeekStart] = useState(getMondayInputValue(new Date()));
  const [agents, setAgents] = useState<PlanningAgent[]>([]);
  const [planning, setPlanning] = useState<WeeklyPlanning | null>(null);
  const [assignments, setAssignments] = useState<PlanningAssignment[]>([]);
  const [undoStack, setUndoStack] = useState<PlanningAssignment[][]>([]);
  const [redoStack, setRedoStack] = useState<PlanningAssignment[][]>([]);
  const [loadingPlanning, setLoadingPlanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);
  const [resettingHistory, setResettingHistory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekendStats, setWeekendStats] = useState<WeekendOffStatistic[]>([]);
  const [weekendPeriodWeeks, setWeekendPeriodWeeks] = useState(8);
  const [pendingFreeze, setPendingFreeze] = useState<PendingFreeze | null>(null);
  const [pendingLeavePeriod, setPendingLeavePeriod] = useState<PendingLeavePeriod | null>(null);
  const [pendingLateness, setPendingLateness] = useState<PendingLateness | null>(null);
  const [saveReview, setSaveReview] = useState<SaveReview | null>(null);

  const days = useMemo(() => {
    const start = parseLocalDate(weekStart);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [weekStart]);
  const displayedWeekendStats = useMemo(
    () => enrichWeekendStatsWithCurrentPlanning(weekendStats, agents, assignments, weekStart),
    [weekendStats, agents, assignments, weekStart],
  );

  useEffect(() => {
    if (isReady && isAuthenticated && !isSupervisor) {
      void navigate({ to: "/planning-view", replace: true });
      return;
    }
    if (isReady && isAuthenticated) {
      void refreshPlanningData();
    }
    // Loading is intentionally keyed to authentication, role, selected week, and stats period.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isAuthenticated, isSupervisor, navigate, weekStart, weekendPeriodWeeks]);

  async function refreshPlanningData() {
    setLoadingPlanning(true);
    setError(null);
    try {
      if (isSupervisor) {
        await Promise.all([loadAgents(), loadWeekendStatistics()]);
      }
      await loadPlanning();
    } finally {
      setLoadingPlanning(false);
    }
  }

  async function loadAgents() {
    try {
      const response = await authenticatedFetch("/api/plannings/agents");
      if (!response.ok) throw new Error(await planningApiError(response));
      setAgents((await response.json()) as PlanningAgent[]);
    } catch (cause) {
      setError(formatPlanningLoadError(cause, "Impossible de charger les agents du planning."));
    }
  }

  async function loadWeekendStatistics() {
    const selected = parseLocalDate(weekStart);
    const from = formatDateInput(addDays(selected, -7 * (weekendPeriodWeeks - 1)));
    const to = formatDateInput(addDays(selected, 6));
    try {
      const response = await authenticatedFetch(
        `/api/plannings/weekend-off-statistics?from=${from}&to=${to}`,
      );
      if (!response.ok) throw new Error(await planningApiError(response));
      setWeekendStats((await response.json()) as WeekendOffStatistic[]);
    } catch {
      setWeekendStats([]);
    }
  }

  async function generatePlanning(datesToRegenerate?: string[]) {
    setLoading(true);
    setNotice(null);
    setError(null);
    try {
      const response = await authenticatedFetch("/api/plannings/weeks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate: weekStart, datesToRegenerate }),
      });
      if (!response.ok) throw new Error(await planningApiError(response));
      const data = (await response.json()) as WeeklyPlanning;
      const firstBlockingProblem = data.problems.find((problem) => problem.severity === "ERROR");
      if (data.assignments.length === 0 && (data.lockedOffDays?.length ?? 0) === 0) {
        if (!planning || assignments.length === 0) {
          setPlanning(null);
          setAssignments([]);
          clearDraftHistory();
        }
        setError(
          firstBlockingProblem
            ? formatProblemForSupervisor(firstBlockingProblem).summary
            : "Aucun planning n'a pu être généré. Le planning précédent a été conservé.",
        );
        return;
      }
      setPlanning(data);
      setAssignments(data.assignments);
      clearDraftHistory();
      if (firstBlockingProblem) {
        setError(formatProblemForSupervisor(firstBlockingProblem).summary);
      } else {
        setNotice("Planning genere. Verifiez les alertes avant sauvegarde.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "La generation automatique du planning a echoue.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPlanning() {
    try {
      const response = await authenticatedFetch(`/api/plannings/week/${weekStart}`);
      if (!response.ok) throw new Error(await planningApiError(response));
      const data = (await response.json()) as WeeklyPlanning;
      if (data.planningWeekId === null && data.assignments.length === 0) {
        setPlanning(null);
        setAssignments([]);
        clearDraftHistory();
        return;
      }
      setPlanning(data);
      setAssignments(data.assignments);
      clearDraftHistory();
      if (!isSupervisor) {
        setAgents(
          data.agentSummaries.map((summary) => ({
            id: summary.agentId,
            fullName: summary.fullName,
            email: "",
            active: true,
            fixedSco: false,
          })),
        );
      }
    } catch (cause) {
      setError(formatPlanningLoadError(cause, "Impossible de charger le planning de cette semaine."));
    }
  }

  async function savePlanning(overrideConfirmed = false) {
    if (!planning) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const assignmentsPayload = assignments.map((assignment) => ({
        id: assignment.id,
        agentId: assignment.agentId,
        shiftId: assignment.shiftId,
        assignmentDate: assignment.assignmentDate,
        locked: assignment.locked,
        generated: assignment.generated,
        latenessMinutes: assignment.latenessMinutes ?? 0,
      }));
      const validationResponse = await authenticatedFetch("/api/plannings/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: weekStart,
          publish: false,
          assignments: assignmentsPayload,
          validationMode: "SUPERVISOR_OVERRIDE",
        }),
      });
      if (!validationResponse.ok) throw new Error(await planningApiError(validationResponse));
      const validation = (await validationResponse.json()) as WeeklyPlanning;
      const technicalErrors = validation.problems.filter((problem) => problem.severity === "ERROR");
      if (technicalErrors.length > 0) {
        setError(formatProblemForSupervisor(technicalErrors[0]).summary);
        return;
      }
      const warningsRequiringOverride = validation.problems.filter(
        (problem) =>
          problem.severity === "WARNING" &&
          ![
            "NO_FULL_WEEKEND_OFF",
            "REPEATED_WEEKLY_ROTATION",
            "TWO_MONTH_SHIFT_ROTATION_GAP",
          ].includes(problem.code),
      );
      if (!overrideConfirmed) {
        setSaveReview({
          warnings: warningsRequiringOverride,
          changes: buildPlanningChangeSummary(planning, assignments, agents, weekStart),
          requiresOverride: warningsRequiringOverride.length > 0,
        });
        return;
      }
      const response = await authenticatedFetch("/api/plannings/weeks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: weekStart,
          publish: false,
          assignments: assignmentsPayload,
          validationMode: warningsRequiringOverride.length > 0 ? "SUPERVISOR_OVERRIDE" : "STRICT",
          overrideConfirmed: warningsRequiringOverride.length > 0,
          overrideReason: null,
        }),
      });
      if (!response.ok) throw new Error(await planningApiError(response));
      const data = (await response.json()) as WeeklyPlanning;
      setPlanning(data);
      setAssignments(data.assignments);
      clearDraftHistory();
      setSaveReview(null);
      setNotice("Planning sauvegarde en brouillon.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La sauvegarde du planning a echoue.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCellLock(
    agent: PlanningAgent,
    date: string,
    locked: boolean,
    shiftId?: number,
    endDate?: string | null,
  ) {
    try {
      const response = await authenticatedFetch(`/api/plannings/week/${weekStart}/lock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, assignmentDate: date, shiftId, locked, endDate }),
      });
      if (!response.ok) throw new Error(await planningApiError(response));
      const data = (await response.json()) as WeeklyPlanning;
      setPlanning(data);
      setAssignments(data.assignments);
      clearDraftHistory();
      setNotice(
        locked
          ? "Affectation figée pour cette semaine et les prochaines semaines."
          : "Gel récurrent retiré pour ce jour.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de modifier le verrou.");
    }
  }

  async function unfreezeCurrentWeek() {
    if (!planning) return;
    const targets = freezeTargetsForWeek(planning, assignments, days.map(formatDateInput));
    if (targets.length === 0) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      for (const target of targets) {
        const response = await authenticatedFetch(`/api/plannings/week/${weekStart}/lock`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: target.agentId,
            assignmentDate: target.date,
            shiftId: target.shiftId,
            locked: false,
          }),
        });
        if (!response.ok) throw new Error(await planningApiError(response));
      }
      await loadPlanning();
      setNotice("Tous les gels de cette semaine ont été retirés.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de défiger cette semaine.");
    } finally {
      setSaving(false);
    }
  }

  function requestFreeze(agent: PlanningAgent, date: string, shiftId?: number) {
    setPendingFreeze({ agent, date, shiftId, duration: "forever" });
  }

  function confirmPendingFreeze() {
    if (!pendingFreeze) return;
    const durationWeeks =
      pendingFreeze.duration === "forever" ? null : Number(pendingFreeze.duration);
    const endDate =
      durationWeeks === null
        ? null
        : formatDateInput(addDays(parseLocalDate(pendingFreeze.date), 7 * (durationWeeks - 1)));
    const { agent, date, shiftId } = pendingFreeze;
    setPendingFreeze(null);
    void toggleCellLock(agent, date, true, shiftId, endDate);
  }

  async function publishPlanning() {
    if (!planning?.planningWeekId) return;
    setPublishing(true);
    setNotice(null);
    setError(null);
    try {
      const response = await authenticatedFetch(
        `/api/plannings/${planning.planningWeekId}/publish`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(await planningApiError(response));
      const data = (await response.json()) as WeeklyPlanning;
      setPlanning(data);
      setAssignments(data.assignments);
      clearDraftHistory();
      setNotice("Planning publie.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La publication a echoue: verifiez les erreurs de validation.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function exportPlanning(format: "xlsx" | "pdf") {
    if (!planning) return;
    setExporting(format);
    setError(null);
    try {
      const response = await authenticatedFetch(
        `/api/plannings/week/${weekStart}/export?format=${format}`,
      );
      if (!response.ok) throw new Error(await planningApiError(response));
      const blob = await response.blob();
      downloadBlob(blob, `planning-${weekStart}.${format}`);
      setNotice(format === "xlsx" ? "Export Excel telecharge." : "Export PDF telecharge.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'exporter le planning.");
    } finally {
      setExporting(null);
    }
  }

  async function deleteSavedPlanningHistory() {
    const confirmed = window.confirm(
      "Supprimer tous les anciens plannings sauvegardes ? Cette action remet a zero l'historique week-end OFF.",
    );
    if (!confirmed) return;
    setResettingHistory(true);
    setNotice(null);
    setError(null);
    try {
      const response = await authenticatedFetch("/api/plannings/history", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await planningApiError(response));
      const payload = (await response.json()) as { deletedPlanningWeeks?: number };
      setPlanning(null);
      setAssignments([]);
      clearDraftHistory();
      await loadWeekendStatistics();
      setNotice(`${payload.deletedPlanningWeeks ?? 0} ancien(s) planning(s) supprime(s).`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de supprimer l'historique planning.");
    } finally {
      setResettingHistory(false);
    }
  }

  async function setUnavailability(
    agent: PlanningAgent,
    date: string,
    reason: string | null,
    endDate?: string,
  ) {
    try {
      const response = await authenticatedFetch(`/api/plannings/week/${weekStart}/unavailability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, date, endDate, reason }),
      });
      if (!response.ok) throw new Error(await planningApiError(response));
      const data = (await response.json()) as WeeklyPlanning;
      const blockingDates =
        reason && reason !== "TELETRAVAIL" ? dateKeysInRange(date, endDate ?? date) : [];
      setAssignments((current) => {
        const baseAssignments = current.length > 0 ? current : data.assignments;
        const nextAssignments =
          blockingDates.length === 0
            ? baseAssignments
            : baseAssignments.filter(
                (assignment) =>
                  assignment.agentId !== agent.id ||
                  !blockingDates.includes(assignment.assignmentDate),
              );
        setPlanning({ ...data, assignments: nextAssignments });
        return nextAssignments;
      });
      clearDraftHistory();
      setNotice(reason ? `${reason} enregistré.` : "Absence retirée.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de modifier l'absence.");
    }
  }

  function clearDraftHistory() {
    setUndoStack([]);
    setRedoStack([]);
  }

  function applyDraftAssignmentsEdit(
    updater: (current: PlanningAssignment[]) => PlanningAssignment[],
  ) {
    setAssignments((current) => {
      const before = cloneAssignments(current);
      const next = cloneAssignments(updater(current));
      if (assignmentsEqual(before, next)) {
        return current;
      }
      setUndoStack((stack) => [...stack, before].slice(-30));
      setRedoStack([]);
      setPlanning((currentPlanning) =>
        currentPlanning ? { ...currentPlanning, assignments: next } : currentPlanning,
      );
      return next;
    });
  }

  function undoPlanningEdit() {
    setUndoStack((current) => {
      const previous = current[current.length - 1];
      if (!previous) return current;
      const nextUndoStack = current.slice(0, -1);
      setRedoStack((stack) => [cloneAssignments(assignments), ...stack].slice(0, 30));
      setAssignments(cloneAssignments(previous));
      setPlanning((currentPlanning) =>
        currentPlanning ? { ...currentPlanning, assignments: cloneAssignments(previous) } : currentPlanning,
      );
      return nextUndoStack;
    });
  }

  function redoPlanningEdit() {
    setRedoStack((current) => {
      const next = current[0];
      if (!next) return current;
      const nextRedoStack = current.slice(1);
      setUndoStack((stack) => [...stack, cloneAssignments(assignments)].slice(-30));
      setAssignments(cloneAssignments(next));
      setPlanning((currentPlanning) =>
        currentPlanning ? { ...currentPlanning, assignments: cloneAssignments(next) } : currentPlanning,
      );
      return nextRedoStack;
    });
  }

  function updateCell(agent: PlanningAgent, date: string, value: string) {
    if (!planning || value === "__LOCKED__") return;
    if (value === "CONGE") {
      setPendingLeavePeriod({ agent, date, endDate: date });
      return;
    }
    if (value === "ABSENT") {
      void setUnavailability(agent, date, value);
      return;
    }
    const hasUnavailability = planning.unavailableDays?.some(
      (item) => item.agentId === agent.id && item.date === date && item.reason !== "TELETRAVAIL",
    );
    if (hasUnavailability) {
      void setUnavailability(agent, date, null);
    }
    applyDraftAssignmentsEdit((current) => {
      const withoutCell = current.filter(
        (assignment) => !(assignment.agentId === agent.id && assignment.assignmentDate === date),
      );
      if (value === "OFF") {
        return withoutCell;
      }
      const shift = planning.shifts.find((item) => item.id === Number(value));
      if (!shift) return current;
      return [
        ...withoutCell,
        {
          id: null,
          agentId: agent.id,
          agentName: agent.fullName,
          shiftId: shift.id,
          shiftCode: shift.code,
          shiftCategory: shift.category,
          assignmentDate: date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          paidHours: shift.paidHours,
          latenessMinutes: 0,
          locked: false,
          generated: false,
          manuallyOverridden: true,
        },
      ];
    });
  }

  function toggleTelework(agent: PlanningAgent, date: string) {
    if (!planning) return;
    const current = planning.unavailableDays?.find(
      (item) => item.agentId === agent.id && item.date === date,
    );
    void setUnavailability(agent, date, current?.reason === "TELETRAVAIL" ? null : "TELETRAVAIL");
  }

  function setAssignmentLateness(agent: PlanningAgent, date: string) {
    const assignment = assignments.find(
      (item) => item.agentId === agent.id && item.assignmentDate === date,
    );
    if (!assignment) return;
    setPendingLateness({ agent, date, minutes: assignment.latenessMinutes ?? 0 });
  }

  function applyAssignmentLateness(minutes: number) {
    if (!pendingLateness) return;
    if (!Number.isFinite(minutes) || minutes < 0) {
      setError("Le retard doit etre un nombre de minutes positif.");
      return;
    }
    const roundedMinutes = Math.round(minutes);
    const { agent, date } = pendingLateness;
    applyDraftAssignmentsEdit((current) =>
      current.map((item) =>
        item.agentId === agent.id && item.assignmentDate === date
          ? { ...item, latenessMinutes: roundedMinutes, manuallyOverridden: true }
          : item,
      ),
    );
    setNotice(roundedMinutes > 0 ? `Retard de ${roundedMinutes} min enregistre.` : "Retard retire.");
    setPendingLateness(null);
  }

  const problems = planning?.problems ?? [];
  const blockingErrors = problems.filter((problem) => problem.severity === "ERROR");
  const hasPlanningContent = Boolean(
    planning &&
    (assignments.length > 0 ||
      (planning.lockedOffDays?.length ?? 0) > 0 ||
      (planning.unavailableDays?.length ?? 0) > 0 ||
      planning.planningWeekId),
  );
  const isPlanningValid = hasPlanningContent && blockingErrors.length === 0;

  if (isReady && isAuthenticated && !isSupervisor) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl rounded-xl border bg-white p-10 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <h1 className="text-xl font-semibold">Génération réservée aux superviseurs</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seuls les rôles ADMIN et MANAGER peuvent générer, modifier ou publier un planning.
            Utilisez la rubrique « Voir le planning ».
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1680px] space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Workforce · Vue semaine</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Planning des shifts
            </h1>
          </div>
          {isSupervisor && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-rose-200 bg-white text-xs text-rose-700 hover:bg-rose-50"
              onClick={() => void deleteSavedPlanningHistory()}
              disabled={resettingHistory}
            >
              {resettingHistory ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Reset historique
            </Button>
          )}
          {hasPlanningContent && planning && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-white px-3 py-1.5">
                {planning.agentSummaries.length} agents
              </span>
              <span className="rounded-full border bg-white px-3 py-1.5">
                {planning.status === "PUBLISHED" ? "Publié" : "Brouillon"}
              </span>
              <span
                className={`rounded-full border px-3 py-1.5 ${
                  !isPlanningValid
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {blockingErrors.length
                  ? `${blockingErrors.length} erreur(s)`
                  : isPlanningValid
                    ? "Planning valide"
                    : "Planning non généré"}
              </span>
            </div>
          )}
        </div>

        {!isSupervisor && (
          <div className="rounded-md border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            Mode lecture seule: seuls les superviseurs peuvent generer ou modifier le planning.
          </div>
        )}

        {notice && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        )}
        {error && (
          <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start border-destructive/30 bg-white text-destructive hover:bg-destructive/10 sm:self-auto"
              onClick={() => void refreshPlanningData()}
              disabled={loadingPlanning}
            >
              {loadingPlanning ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Reessayer
            </Button>
          </div>
        )}

        <div className="grid items-start gap-3 xl:grid-cols-[190px_minmax(0,1fr)]">
          <div className="space-y-3 xl:sticky xl:top-3">
            <MonthCalendar weekStart={weekStart} onWeekChange={setWeekStart} />
          </div>
          <div className="min-w-0 space-y-3">
            {hasPlanningContent && planning && <ProblemPanel problems={problems} />}
            {hasPlanningContent && planning && (
              <PlanningGrid
                agents={agents}
                days={days.map(formatDateInput)}
                shifts={planning.shifts}
                assignments={assignments}
                lockedOffDays={planning.lockedOffDays ?? []}
                freezes={planning.freezes ?? []}
                unavailableDays={planning.unavailableDays ?? []}
                readOnly={!isSupervisor}
                loading={loading}
                saving={saving}
                publishing={publishing}
                exporting={exporting}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                canSave={isSupervisor && assignments.length > 0}
                canPublish={
                  isSupervisor &&
                  blockingErrors.length === 0 &&
                  Boolean(planning.planningWeekId) &&
                  planning.status !== "PUBLISHED"
                }
                onGenerate={(dates) => void generatePlanning(dates)}
                onSave={() => void savePlanning()}
                onPublish={() => void publishPlanning()}
                onExport={(format) => void exportPlanning(format)}
                onUndo={undoPlanningEdit}
                onRedo={redoPlanningEdit}
                onChange={updateCell}
                onUnfreezeWeek={() => void unfreezeCurrentWeek()}
                onToggleTelework={toggleTelework}
                onSetLateness={setAssignmentLateness}
                onToggleLock={(agent, date, locked, shiftId) =>
                  locked
                    ? requestFreeze(agent, date, shiftId)
                    : void toggleCellLock(agent, date, false, shiftId)
                }
              />
            )}

            {loadingPlanning && !hasPlanningContent && (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-[0_10px_40px_-24px_rgba(15,23,42,0.25)]">
                <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-cyan-600" />
                <h2 className="mt-4 text-base font-semibold text-slate-900">
                  Chargement du planning
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recuperation des agents, shifts et affectations de la semaine.
                </p>
              </div>
            )}

            {!loadingPlanning && !hasPlanningContent && (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-[0_10px_40px_-24px_rgba(15,23,42,0.25)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50">
                  <CalendarDays className="h-5 w-5 text-cyan-600" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-900">
                  Créer le planning de la semaine
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choisissez une semaine puis lancez la génération automatique.
                </p>
                <div className="mt-5 flex justify-center">
                  <Button
                    className="h-9 rounded-md bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => void generatePlanning()}
                    disabled={!isSupervisor || loading}
                  >
                    {loading ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                    Générer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {isSupervisor && displayedWeekendStats.length > 0 && (
          <WeekendOffPanel
            statistics={displayedWeekendStats}
            periodWeeks={weekendPeriodWeeks}
            onPeriodWeeksChange={setWeekendPeriodWeeks}
          />
        )}
        {pendingFreeze && (
          <FreezeDurationDialog
            pendingFreeze={pendingFreeze}
            onChange={(duration) =>
              setPendingFreeze((current) => current && { ...current, duration })
            }
            onCancel={() => setPendingFreeze(null)}
            onConfirm={confirmPendingFreeze}
          />
        )}
        {pendingLeavePeriod && (
          <LeavePeriodDialog
            pendingLeavePeriod={pendingLeavePeriod}
            onEndDateChange={(endDate) =>
              setPendingLeavePeriod((current) => current && { ...current, endDate })
            }
            onCancel={() => setPendingLeavePeriod(null)}
            onConfirm={() => {
              void setUnavailability(
                pendingLeavePeriod.agent,
                pendingLeavePeriod.date,
                "CONGE",
                pendingLeavePeriod.endDate,
              );
              setPendingLeavePeriod(null);
            }}
          />
        )}
        {pendingLateness && (
          <LatenessDialog
            pendingLateness={pendingLateness}
            onChange={(minutes) =>
              setPendingLateness((current) => current && { ...current, minutes })
            }
            onCancel={() => setPendingLateness(null)}
            onConfirm={() => applyAssignmentLateness(pendingLateness.minutes)}
            onRemove={() => applyAssignmentLateness(0)}
          />
        )}
        {saveReview && (
          <SaveConfirmationDialog
            warnings={saveReview.warnings}
            changes={saveReview.changes}
            requiresOverride={saveReview.requiresOverride}
            saving={saving}
            onCancel={() => setSaveReview(null)}
            onConfirm={() => void savePlanning(true)}
          />
        )}
      </div>
    </AppShell>
  );
}

function FreezeDurationDialog({
  pendingFreeze,
  onChange,
  onCancel,
  onConfirm,
}: {
  pendingFreeze: PendingFreeze;
  onChange: (duration: PendingFreeze["duration"]) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const durationWeeks =
    pendingFreeze.duration === "forever" ? null : Number(pendingFreeze.duration);
  const endDate =
    durationWeeks === null
      ? null
      : addDays(parseLocalDate(pendingFreeze.date), 7 * (durationWeeks - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-950">Durée du gel</h3>
        <p className="mt-1 text-sm text-slate-500">
          Choisissez pendant combien de semaines cette affectation doit rester figée.
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-medium text-slate-950">{pendingFreeze.agent.fullName}</div>
          <div>{new Intl.DateTimeFormat("fr-FR").format(parseLocalDate(pendingFreeze.date))}</div>
        </div>
        <div className="mt-4">
          <Select
            value={pendingFreeze.duration}
            onValueChange={(value) => onChange(value as PendingFreeze["duration"])}
          >
            <SelectTrigger className="h-10 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Cette semaine seulement</SelectItem>
              <SelectItem value="2">2 semaines</SelectItem>
              <SelectItem value="4">4 semaines</SelectItem>
              <SelectItem value="8">8 semaines</SelectItem>
              <SelectItem value="12">12 semaines</SelectItem>
              <SelectItem value="forever">Toujours, jusqu'au dégel manuel</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-slate-500">
            {endDate
              ? `Le gel s'arrêtera après le ${new Intl.DateTimeFormat("fr-FR").format(endDate)}.`
              : "Le gel restera actif pour toutes les prochaines semaines jusqu'à ce que vous le retiriez."}
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={onConfirm}>
            Confirmer le gel
          </Button>
        </div>
      </div>
    </div>
  );
}

function LeavePeriodDialog({
  pendingLeavePeriod,
  onEndDateChange,
  onCancel,
  onConfirm,
}: {
  pendingLeavePeriod: PendingLeavePeriod;
  onEndDateChange: (endDate: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const startDate = parseLocalDate(pendingLeavePeriod.date);
  const endDate = pendingLeavePeriod.endDate ? parseLocalDate(pendingLeavePeriod.endDate) : null;
  const formatter = new Intl.DateTimeFormat("fr-FR");
  const isInvalid = !endDate || endDate < startDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-950">Periode du conge</h3>
        <p className="mt-1 text-sm text-slate-500">
          Choisissez la date de fin. Le planning bloquera tous les jours entre le debut et la fin.
        </p>
        <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-slate-700">
          <div className="font-medium text-slate-950">{pendingLeavePeriod.agent.fullName}</div>
          <div>Debut: {formatter.format(startDate)}</div>
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="leave-period-end">
          Date de fin
        </label>
        <input
          id="leave-period-end"
          type="date"
          min={pendingLeavePeriod.date}
          value={pendingLeavePeriod.endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
        {isInvalid && (
          <p className="mt-2 text-xs font-medium text-rose-600">
            La date de fin doit etre apres la date de debut.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onConfirm} disabled={isInvalid}>
            Confirmer le conge
          </Button>
        </div>
      </div>
    </div>
  );
}

function LatenessDialog({
  pendingLateness,
  onChange,
  onCancel,
  onConfirm,
  onRemove,
}: {
  pendingLateness: PendingLateness;
  onChange: (minutes: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onRemove: () => void;
}) {
  const quickValues = [5, 10, 15, 30];
  const isInvalid = !Number.isFinite(pendingLateness.minutes) || pendingLateness.minutes < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-950">Retard</h3>
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-slate-700">
          <div className="font-medium text-slate-950">{pendingLateness.agent.fullName}</div>
          <div>{new Intl.DateTimeFormat("fr-FR").format(parseLocalDate(pendingLateness.date))}</div>
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="lateness-minutes">
          Minutes de retard
        </label>
        <input
          id="lateness-minutes"
          type="number"
          min={0}
          step={1}
          value={String(pendingLateness.minutes)}
          onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {quickValues.map((minutes) => (
            <Button
              key={minutes}
              type="button"
              variant="outline"
              className="h-8 rounded-lg px-3 text-xs"
              onClick={() => onChange(minutes)}
            >
              {minutes} min
            </Button>
          ))}
        </div>
        {isInvalid && (
          <p className="mt-2 text-xs font-medium text-rose-600">
            Le retard doit etre un nombre de minutes positif.
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onRemove}>
            Retirer
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={onConfirm} disabled={isInvalid}>
            Confirmer
          </Button>
        </div>
      </div>
    </div>
  );
}

function SaveConfirmationDialog({
  warnings,
  changes,
  requiresOverride,
  saving,
  onCancel,
  onConfirm,
}: {
  warnings: PlanningProblem[];
  changes: PlanningChangeSummary[];
  requiresOverride: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-950">
              {requiresOverride
                ? "Confirmer la dérogation superviseur"
                : "Confirmer la sauvegarde du planning"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Certaines règles métier ne sont pas respectées. Voulez-vous sauvegarder ce planning
              avec une dérogation superviseur ?
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-950">Modifications détectées</h4>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
              {changes.length}
            </span>
          </div>
          {changes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Aucune modification manuelle détectée. Le planning courant sera sauvegardé tel quel.
            </p>
          ) : (
            <ul className="mt-3 max-h-48 space-y-2 overflow-auto text-sm text-slate-800">
              {changes.map((change) => (
                <li key={change.key} className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="font-semibold text-slate-950">
                    {formatProblemDate(change.date)} · {change.agentName}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
                      {change.before}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-md bg-cyan-50 px-2 py-1 font-medium text-cyan-900">
                      {change.after}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {warnings.length > 0 ? (
          <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <div className="mb-2 text-sm font-semibold text-amber-950">
              Alertes qui seront sauvegardées avec dérogation
            </div>
            <ul className="space-y-2 text-sm text-amber-950">
              {warnings.map((warning, index) => (
                <li key={`${warning.code}-${warning.agentId ?? "global"}-${warning.date ?? index}`}>
                  <div className="font-semibold">{formatProblemForSupervisor(warning).title}</div>
                  <div className="text-xs text-amber-800">
                    {formatProblemForSupervisor(warning).description}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Aucune alerte bloquante ou dérogation superviseur nécessaire.
          </div>
        )}

        {requiresOverride && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            Aucune raison n’est obligatoire. L’action sera quand même enregistrée dans l’audit avec
            votre identité, la date et les règles concernées.
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button
            className={
              requiresOverride ? "bg-amber-600 hover:bg-amber-700" : "bg-cyan-600 hover:bg-cyan-700"
            }
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
            {requiresOverride ? "Confirmer l’override" : "Confirmer la sauvegarde"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MonthCalendar({
  weekStart,
  onWeekChange,
}: {
  weekStart: string;
  onWeekChange: (value: string) => void;
}) {
  const selected = parseLocalDate(weekStart);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  useEffect(() => {
    const selectedDate = parseLocalDate(weekStart);
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [weekStart]);

  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -mondayOffset);
  const selectedWeekEnd = addDays(selected, 6);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          onClick={() =>
            setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))
          }
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold capitalize text-slate-900">
          {new Intl.DateTimeFormat("fr-FR", {
            month: "long",
            year: "numeric",
          }).format(visibleMonth)}
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          onClick={() =>
            setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))
          }
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium uppercase text-slate-400">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((date) => {
          const value = formatDateInput(date);
          const inMonth = date.getMonth() === visibleMonth.getMonth();
          const inSelectedWeek = date >= selected && date <= selectedWeekEnd;
          const monday = date.getDay() === 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onWeekChange(getMondayInputValue(date))}
              className={`flex h-6 items-center justify-center rounded-md text-[10px] transition ${
                inSelectedWeek
                  ? monday
                    ? "bg-cyan-600 font-semibold text-white"
                    : "bg-cyan-50 font-medium text-cyan-800"
                  : inMonth
                    ? "text-slate-700 hover:bg-slate-100"
                    : "text-slate-300 hover:bg-slate-50"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600">
        Semaine du <strong>{new Intl.DateTimeFormat("fr-FR").format(selected)}</strong>
      </div>
    </aside>
  );
}

function PlanningGrid({
  agents,
  days,
  shifts,
  assignments,
  lockedOffDays,
  freezes,
  unavailableDays,
  readOnly,
  loading,
  saving,
  publishing,
  exporting,
  canUndo,
  canRedo,
  canSave,
  canPublish,
  onGenerate,
  onSave,
  onPublish,
  onExport,
  onUndo,
  onRedo,
  onChange,
  onUnfreezeWeek,
  onToggleTelework,
  onSetLateness,
  onToggleLock,
}: {
  agents: PlanningAgent[];
  days: string[];
  shifts: Shift[];
  assignments: PlanningAssignment[];
  lockedOffDays: string[];
  freezes: PlanningFreeze[];
  unavailableDays: AgentUnavailability[];
  readOnly: boolean;
  loading: boolean;
  saving: boolean;
  publishing: boolean;
  exporting: "xlsx" | "pdf" | null;
  canUndo: boolean;
  canRedo: boolean;
  canSave: boolean;
  canPublish: boolean;
  onGenerate: (dates?: string[]) => void;
  onSave: () => void;
  onPublish: () => void;
  onExport: (format: "xlsx" | "pdf") => void;
  onUndo: () => void;
  onRedo: () => void;
  onChange: (agent: PlanningAgent, date: string, value: string) => void;
  onUnfreezeWeek: () => void;
  onToggleTelework: (agent: PlanningAgent, date: string) => void;
  onSetLateness: (agent: PlanningAgent, date: string) => void;
  onToggleLock: (agent: PlanningAgent, date: string, locked: boolean, shiftId?: number) => void;
}) {
  const [selectedRegenerationDates, setSelectedRegenerationDates] = useState<string[]>([]);
  const daysKey = days.join("|");
  const frozenCellCount = freezes.filter((freeze) => days.includes(freeze.date)).length;

  useEffect(() => {
    setSelectedRegenerationDates([]);
  }, [daysKey]);

  function toggleRegenerationDate(date: string) {
    setSelectedRegenerationDates((current) =>
      current.includes(date) ? current.filter((item) => item !== date) : [...current, date],
    );
  }

  function cellIsBlocked(agent: PlanningAgent, date: string) {
    const lockedOff = lockedOffDays.includes(`${agent.id}|${date}`);
    const frozen = freezes.some((item) => item.agentId === agent.id && item.date === date);
    const blockedUnavailable = unavailableDays.some(
      (item) => item.agentId === agent.id && item.date === date && item.reason !== "TELETRAVAIL",
    );
    return readOnly || lockedOff || frozen || blockedUnavailable;
  }

  function focusCell(rowIndex: number, dayIndex: number) {
    const next = document.querySelector<HTMLElement>(
      `[data-planning-cell="${rowIndex}-${dayIndex}"]`,
    );
    next?.focus();
  }

  function handleCellKeyDown(
    event: ReactKeyboardEvent<HTMLTableCellElement>,
    agent: PlanningAgent,
    day: string,
    rowIndex: number,
    dayIndex: number,
    assignment: PlanningAssignment | undefined,
  ) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      onUndo();
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === "y") {
      event.preventDefault();
      onRedo();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(rowIndex, Math.min(days.length - 1, dayIndex + 1));
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(rowIndex, Math.max(0, dayIndex - 1));
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(Math.min(agents.length - 1, rowIndex + 1), dayIndex);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(Math.max(0, rowIndex - 1), dayIndex);
      return;
    }
    if (readOnly || cellIsBlocked(agent, day)) return;
    const key = event.key.toLowerCase();
    if (key === "r" && assignment) {
      event.preventDefault();
      onSetLateness(agent, day);
    } else if (key === "t" && assignment) {
      event.preventDefault();
      onToggleTelework(agent, day);
    } else if (key === "l") {
      event.preventDefault();
      onToggleLock(agent, day, true, assignment?.shiftId);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onChange(agent, day, "OFF");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_40px_-24px_rgba(15,23,42,0.25)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {formatWeekRange(days.map(parseLocalDate))}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
            <ShiftLegend color="bg-cyan-500" label="Ouverture" />
            <ShiftLegend color="bg-indigo-500" label="Intermédiaire" />
            <ShiftLegend color="bg-orange-500" label="Fermeture" />
            <ShiftLegend color="bg-fuchsia-500" label="SCO" />
            <ShiftLegend color="bg-slate-300" label="OFF" />
            <ShiftLegend color="bg-emerald-500" label="Congé" />
            <ShiftLegend color="bg-rose-500" label="Absent" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {frozenCellCount > 0 && !readOnly && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-md border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={onUnfreezeWeek}
              disabled={saving}
              title="Retirer tous les gels actifs visibles sur cette semaine"
            >
              <Unlock />
              Défiger la semaine
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 rounded-md bg-cyan-600 hover:bg-cyan-700"
            onClick={() => {
              onGenerate(
                selectedRegenerationDates.length > 0 ? selectedRegenerationDates : undefined,
              );
              setSelectedRegenerationDates([]);
            }}
            disabled={readOnly || loading}
          >
            {loading ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {selectedRegenerationDates.length > 0
              ? `Regénérer ${selectedRegenerationDates.length} jour(s)`
              : "Générer"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-md"
            onClick={() => onExport("xlsx")}
            disabled={exporting !== null}
          >
            {exporting === "xlsx" ? <LoaderCircle className="animate-spin" /> : <Download />}
            Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-md"
            onClick={() => onExport("pdf")}
            disabled={exporting !== null}
          >
            {exporting === "pdf" ? <LoaderCircle className="animate-spin" /> : <Download />}
            PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-md"
            onClick={onUndo}
            disabled={readOnly || !canUndo}
            title="Annuler la derniere modification"
          >
            <Undo2 />
            Annuler
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-md"
            onClick={onRedo}
            disabled={readOnly || !canRedo}
            title="Retablir la modification annulee"
          >
            <Redo2 />
            Refaire
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-md"
            onClick={onSave}
            disabled={!canSave || saving}
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
            Sauver
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-md"
            onClick={onPublish}
            disabled={!canPublish || publishing}
          >
            {publishing ? <LoaderCircle className="animate-spin" /> : <Send />}
            Publier
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-sm">
          <thead className="sticky top-0 z-30 bg-white/95 backdrop-blur">
            <tr>
              <th className="sticky left-0 z-40 w-32 border-b border-r border-slate-200 bg-slate-50 px-2 py-1 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Agents
                </div>
              </th>
              {days.map((day, index) => (
                <th
                  key={day}
                  className={`border-b border-r border-slate-200 px-1 py-1 text-center ${
                    index >= 5 ? "bg-slate-100/70" : "bg-slate-50"
                  }`}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    {formatWeekday(day)}
                  </div>
                  <div
                    className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday(day) ? "bg-cyan-600 text-white" : "text-slate-900"
                    }`}
                  >
                    {parseLocalDate(day).getDate()}
                  </div>
                  {!readOnly && (
                    <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[8px] font-normal normal-case tracking-normal text-slate-400">
                      <input
                        type="checkbox"
                        checked={selectedRegenerationDates.includes(day)}
                        onChange={() => toggleRegenerationDate(day)}
                        className="h-2.5 w-2.5 accent-cyan-600"
                      />
                      regénérer
                    </label>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, rowIndex) => {
              const agentAssignments = assignments.filter((item) => item.agentId === agent.id);
              const hours = agentAssignments.reduce((sum, item) => sum + item.paidHours, 0);
              return (
                <tr key={agent.id} className="group border-b border-slate-100 last:border-b-0">
                  <td className="sticky left-0 z-20 border-r border-slate-200 bg-white px-2 py-1 group-hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[9px] font-semibold text-cyan-700">
                        {agentInitials(agent.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-semibold text-slate-900">
                          {agent.fullName}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-500">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              hours === 40 ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {hours}h · {7 - agentAssignments.length} OFF
                        </div>
                      </div>
                    </div>
                  </td>
                  {days.map((day, index) => {
                    const assignment = agentAssignments.find((item) => item.assignmentDate === day);
                    const freeze = freezes.find(
                      (item) => item.agentId === agent.id && item.date === day,
                    );
                    const unavailability = unavailableDays.find(
                      (item) => item.agentId === agent.id && item.date === day,
                    );
                    return (
                      <td
                        key={day}
                        tabIndex={0}
                        data-planning-cell={`${rowIndex}-${index}`}
                        onKeyDown={(event) =>
                          handleCellKeyDown(event, agent, day, rowIndex, index, assignment)
                        }
                        className={`border-r border-slate-100 p-0.5 align-top outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                          index >= 5 ? "bg-slate-50/55" : ""
                        }`}
                        title={
                          readOnly
                            ? undefined
                            : "R=retard, T=teletravail, L=figer, Suppr=OFF."
                        }
                      >
                        <ShiftCell
                          assignment={assignment}
                          unavailability={unavailability}
                          shifts={shifts}
                          date={day}
                          readOnly={readOnly}
                          onChange={(value) => onChange(agent, day, value)}
                          onToggleTelework={() => onToggleTelework(agent, day)}
                          onSetLateness={() => onSetLateness(agent, day)}
                          lockedOff={Boolean(lockedOffDays.includes(`${agent.id}|${day}`))}
                          freeze={freeze}
                          onToggleLock={(locked) =>
                            onToggleLock(agent, day, locked, assignment?.shiftId)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShiftCell({
  assignment,
  unavailability,
  shifts,
  date,
  readOnly,
  onChange,
  onToggleTelework,
  onSetLateness,
  lockedOff,
  freeze,
  onToggleLock,
}: {
  assignment?: PlanningAssignment;
  unavailability?: AgentUnavailability;
  shifts: Shift[];
  date: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  onToggleTelework: () => void;
  onSetLateness: () => void;
  lockedOff: boolean;
  freeze?: PlanningFreeze;
  onToggleLock: (locked: boolean) => void;
}) {
  const visual = unavailability
    ? unavailabilityVisual(unavailability.reason)
    : shiftVisual(assignment?.shiftCategory);
  const allowedShifts = shifts.filter((shift) => isShiftAllowedOnDate(shift, date));
  const isLocked = Boolean(assignment?.locked || lockedOff || freeze);
  const frozenLabel = freezeLabel(freeze, isLocked);
  const unavailableLabel = unavailability ? unavailabilityLabel(unavailability.reason) : null;
  const isTelework = unavailability?.reason === "TELETRAVAIL";
  const mainLabel = cellShiftLabel(assignment, unavailability);
  const value = unavailableLabel && !isTelework
    ? unavailabilityValue(unavailability?.reason)
    : assignment
      ? String(assignment.shiftId)
      : "OFF";
  const canToggleTelework = !readOnly && !isLocked && (isTelework || (Boolean(assignment) && !unavailability));
  const canSetLateness = Boolean(assignment) && !readOnly && !isLocked && (!unavailability || isTelework);
  const latenessMinutes = assignment?.latenessMinutes ?? 0;
  const latenessAccent =
    latenessMinutes > 0
      ? "ring-1 ring-amber-300/70 shadow-[inset_3px_0_0_rgba(217,119,6,0.6)]"
      : "";
  if (readOnly || isLocked) {
    return (
      <div
        className={`relative min-h-9 rounded-md border px-1.5 py-1 pr-6 text-[9px] transition ${visual.card} ${latenessAccent}`}
        title={latenessMinutes > 0 ? `Retard ${formatLateness(latenessMinutes)}` : undefined}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${visual.dot}`} />
          <div className="truncate font-semibold">{mainLabel}</div>
        </div>
        <CellStatusCluster isTelework={isTelework} latenessMinutes={latenessMinutes} />
        {isLocked && (
          <button
            type="button"
            className="mt-1 flex items-center gap-1 text-[8px] uppercase text-amber-700"
            title={frozenLabel}
            onClick={() => !readOnly && onToggleLock(false)}
            disabled={readOnly}
          >
            <Lock className="h-3 w-3" /> {frozenLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group/cell relative">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={`h-9 w-full rounded-md border px-1.5 pr-6 shadow-none transition hover:border-slate-400 ${visual.card} ${latenessAccent}`}
          title={latenessMinutes > 0 ? `Retard ${formatLateness(latenessMinutes)}` : undefined}
        >
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${visual.dot}`} />
              <span className="truncate text-[9px] font-semibold">{mainLabel}</span>
            </div>
            <div className="hidden">
              {assignment ? `${assignment.startTime} – ${assignment.endTime}` : "Jour de repos"}
            </div>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OFF">OFF</SelectItem>
          <SelectItem value="CONGE">Congé</SelectItem>
          <SelectItem value="ABSENT">Absent</SelectItem>
          {allowedShifts.map((shift) => (
            <SelectItem key={shift.id} value={String(shift.id)}>
              {shiftLabel(shift)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <CellStatusCluster
        isTelework={isTelework}
        latenessMinutes={latenessMinutes}
        canToggleTelework={canToggleTelework}
        canSetLateness={canSetLateness}
        onToggleTelework={onToggleTelework}
        onSetLateness={onSetLateness}
      />
      <button
        type="button"
        aria-label="Figer cette affectation pour les prochaines semaines"
        title="Figer pour les prochaines semaines"
        onClick={() => onToggleLock(true)}
        className="absolute right-0.5 top-0.5 rounded p-0.5 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
      >
        <Unlock className="h-3 w-3" />
      </button>
    </div>
  );
}

function cellShiftLabel(assignment?: PlanningAssignment, unavailability?: AgentUnavailability) {
  if (unavailability?.reason === "TELETRAVAIL") {
    return assignment ? shortShiftName(assignment) : "OFF";
  }
  if (unavailability) return unavailabilityLabel(unavailability.reason);
  return assignment ? shortShiftName(assignment) : "OFF";
}

function CellStatusCluster({
  isTelework,
  latenessMinutes,
  canToggleTelework = false,
  canSetLateness = false,
  onToggleTelework,
  onSetLateness,
}: {
  isTelework: boolean;
  latenessMinutes: number;
  canToggleTelework?: boolean;
  canSetLateness?: boolean;
  onToggleTelework?: () => void;
  onSetLateness?: () => void;
}) {
  const interactive = Boolean(onToggleTelework || onSetLateness);
  if (!interactive && !isTelework && latenessMinutes <= 0) {
    return null;
  }

  return (
    <>
      <div className="absolute right-5 top-0.5 flex items-center justify-end gap-0.5">
        {interactive && (
          <button
            type="button"
            aria-label="Declarer un retard"
            title={latenessMinutes > 0 ? `Retard ${formatLateness(latenessMinutes)}` : "Declarer un retard"}
            onClick={onSetLateness}
            disabled={!canSetLateness}
            className={`flex h-4 min-w-4 items-center justify-center rounded-full border px-0.5 text-[7px] font-bold leading-none transition ${
              latenessMinutes > 0
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-transparent text-slate-400 opacity-0 hover:bg-amber-50 hover:text-amber-700 group-hover/cell:opacity-100 disabled:cursor-not-allowed disabled:opacity-0 disabled:group-hover/cell:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400"
            }`}
          >
            <Clock3 className="h-3 w-3" />
          </button>
        )}
        {(interactive || isTelework) && (
          <button
            type="button"
            aria-label={isTelework ? "Retirer le teletravail" : "Marquer en teletravail"}
            title={isTelework ? "Retirer le teletravail" : "Marquer en teletravail"}
            onClick={onToggleTelework}
            disabled={!canToggleTelework}
            className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${
              isTelework
                ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                : "border-transparent text-slate-400 opacity-0 hover:bg-sky-50 hover:text-sky-700 group-hover/cell:opacity-100 disabled:cursor-not-allowed disabled:opacity-0 disabled:group-hover/cell:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400"
            }`}
          >
            <Home className="h-3 w-3" />
          </button>
        )}
      </div>
    </>
  );
}

function WeekendOffPanel({
  statistics,
  periodWeeks,
  onPeriodWeeksChange,
}: {
  statistics: WeekendOffStatistic[];
  periodWeeks: number;
  onPeriodWeeksChange: (value: number) => void;
}) {
  const weekends = weekendStartsBetween(statistics[0]?.periodStart, statistics[0]?.periodEnd);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-300 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Suivi week-ends OFF</h3>
          <p className="text-[10px] text-slate-500">
            Case bleue = week-end complet OFF. Période affichée : {weekends.length} week-ends.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span>Période</span>
          <Select
            value={String(periodWeeks)}
            onValueChange={(value) => onPeriodWeeksChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-32 rounded-lg border-slate-300 bg-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 semaines</SelectItem>
              <SelectItem value="8">8 semaines</SelectItem>
              <SelectItem value="12">12 semaines</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="max-h-[360px] overflow-auto">
        <table className="min-w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-10 bg-white text-slate-950">
            <tr>
              {weekends.map((weekend) => (
                <th
                  key={formatDateInput(weekend)}
                  className="min-w-16 border border-slate-950 px-1 py-1 text-center text-[10px] font-bold leading-tight"
                >
                  <span className="block">{formatWeekendHeader(weekend)}</span>
                  <span className="block text-[9px] font-medium text-slate-500">
                    {formatWeekendMonth(weekend)}
                  </span>
                </th>
              ))}
              <th className="border border-slate-950 bg-white px-2 py-1 text-center text-[10px] font-bold">
                Total
              </th>
              <th className="border border-slate-950 bg-slate-950 px-2 py-1 text-left text-[10px] font-bold text-white">
                Agent
              </th>
            </tr>
          </thead>
          <tbody>
            {statistics.map((item, index) => {
              const completeDates = new Set(item.completeWeekendOffDates ?? []);
              return (
                <tr key={item.agentId}>
                  {weekends.map((weekend) => {
                    const dateKey = formatDateInput(weekend);
                    return (
                      <td
                        key={dateKey}
                        className={`h-6 min-w-7 border border-slate-950 text-center font-semibold ${
                          completeDates.has(dateKey) ? "bg-blue-100" : "bg-white"
                        }`}
                        title={
                          completeDates.has(dateKey)
                            ? `Week-end OFF complet - ${item.fullName}`
                            : undefined
                        }
                      >
                        {completeDates.has(dateKey) ? "WE" : ""}
                      </td>
                    );
                  })}
                  <td className="border border-slate-950 bg-white px-2 text-center font-semibold text-slate-950">
                    {item.completeWeekendOffCount}
                  </td>
                  <td
                    className={`min-w-40 border border-slate-950 px-2 py-1 font-medium text-slate-950 ${
                      index % 2 === 0 ? "bg-blue-100" : "bg-amber-100"
                    }`}
                    title={
                      item.lastCompleteWeekendOff
                        ? `Dernier WE complet: ${new Intl.DateTimeFormat("fr-FR").format(
                            parseLocalDate(item.lastCompleteWeekendOff),
                          )}`
                        : "Jamais de week-end complet sur la période"
                    }
                  >
                    {item.fullName}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OldWeekendOffPanel({ statistics }: { statistics: WeekendOffStatistic[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Historique des week-ends OFF</h3>
        <p className="text-xs text-slate-500">Fenêtre glissante de huit semaines.</p>
      </div>
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Agent</th>
              <th className="px-3 py-2 text-center">Samedi OFF</th>
              <th className="px-3 py-2 text-center">Dimanche OFF</th>
              <th className="px-3 py-2 text-center">Week-end complet</th>
              <th className="px-3 py-2 text-left">Dernier complet</th>
            </tr>
          </thead>
          <tbody>
            {statistics.map((item) => (
              <tr key={item.agentId} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{item.fullName}</td>
                <td className="px-3 py-2 text-center">{item.saturdayOffCount}</td>
                <td className="px-3 py-2 text-center">{item.sundayOffCount}</td>
                <td className="px-3 py-2 text-center font-semibold">
                  {item.completeWeekendOffCount}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {item.lastCompleteWeekendOff
                    ? new Intl.DateTimeFormat("fr-FR").format(
                        parseLocalDate(item.lastCompleteWeekendOff),
                      )
                    : "Jamais"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

void OldWeekendOffPanel;

function ProblemPanel({ problems }: { problems: PlanningProblem[] }) {
  if (problems.length === 0) {
    return null;
  }
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {problems.slice(0, 4).map((rawProblem, index) => {
          const translated = formatProblemForSupervisor(rawProblem);
          const problem = {
            ...rawProblem,
            code: translated.title,
            message: translated.description,
          };
          return (
            <div
              key={`${problem.code}-${index}`}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                problem.severity === "ERROR"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <span className="font-semibold">{problem.code}</span> · {problem.message}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShiftLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function shiftVisual(category?: ShiftCategory) {
  if (category === "OPENING") {
    return {
      card: "border-cyan-200 bg-cyan-50 text-cyan-950",
      dot: "bg-cyan-500",
    };
  }
  if (category === "CLOSING") {
    return {
      card: "border-orange-200 bg-orange-50 text-orange-950",
      dot: "bg-orange-500",
    };
  }
  if (category === "NORMAL") {
    return {
      card: "border-indigo-200 bg-indigo-50 text-indigo-950",
      dot: "bg-indigo-500",
    };
  }
  if (category === "SCO") {
    return {
      card: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950",
      dot: "bg-fuchsia-500",
    };
  }
  return {
    card: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-300",
  };
}

function unavailabilityVisual(reason?: string) {
  if (reason === "ABSENT") {
    return {
      card: "border-rose-200 bg-rose-50 text-rose-950",
      dot: "bg-rose-500",
    };
  }
  if (reason === "TELETRAVAIL") {
    return {
      card: "border-sky-200 bg-sky-50 text-sky-950",
      dot: "bg-sky-500",
    };
  }
  return {
    card: "border-emerald-200 bg-emerald-50 text-emerald-950",
    dot: "bg-emerald-500",
  };
}

function unavailabilityLabel(reason?: string) {
  if (reason === "ABSENT") return "Absent";
  if (reason === "TELETRAVAIL") return "TT";
  return "Congé";
}

function unavailabilityValue(reason?: string) {
  if (reason === "ABSENT") return "ABSENT";
  if (reason === "TELETRAVAIL") return "TELETRAVAIL";
  return "CONGE";
}

function shortShiftName(assignment: PlanningAssignment) {
  if (assignment.shiftCode !== "SCO_11_20") {
    return compactTimeRange(assignment.startTime, assignment.endTime);
  }
  return assignment.shiftCode === "SCO_11_20"
    ? "SCO"
    : `${assignment.startTime}–${assignment.endTime}`;
}

function shiftLabel(shift: Shift) {
  return shift.code === "SCO_11_20" ? "SCO · 11:00–20:00" : `${shift.startTime}–${shift.endTime}`;
}

function compactTimeRange(startTime: string, endTime: string) {
  return `${compactTime(startTime)}-${compactTime(endTime)}`;
}

function compactTime(value: string) {
  const [hour, minute] = value.split(":");
  return minute === "00" ? hour : `${hour}:${minute}`;
}

function isShiftAllowedOnDate(shift: Shift, date: string) {
  const sunday = parseLocalDate(date).getDay() === 0;
  if (sunday) {
    return shift.code === "NORMAL_05_14" || shift.code === "SCO_11_20";
  }
  return shift.code !== "SCO_11_20";
}

function agentInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
    .format(parseLocalDate(value))
    .replace(".", "");
}

function formatWeekRange(days: Date[]) {
  if (!days.length) return "";
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  });
  return `${formatter.format(days[0])} – ${formatter.format(days[days.length - 1])}`;
}

function enrichWeekendStatsWithCurrentPlanning(
  statistics: WeekendOffStatistic[],
  agents: PlanningAgent[],
  assignments: PlanningAssignment[],
  weekStart: string,
) {
  if (statistics.length === 0 || agents.length === 0) return statistics;
  const saturday = addDays(parseLocalDate(weekStart), 5);
  const sunday = addDays(parseLocalDate(weekStart), 6);
  const saturdayKey = formatDateInput(saturday);
  const sundayKey = formatDateInput(sunday);
  const firstStatistic = statistics[0];
  if (
    firstStatistic?.periodStart &&
    firstStatistic?.periodEnd &&
    (saturdayKey < firstStatistic.periodStart || sundayKey > firstStatistic.periodEnd)
  ) {
    return statistics;
  }
  const hasCurrentWeekendData = assignments.some(
    (assignment) => assignment.assignmentDate === saturdayKey || assignment.assignmentDate === sundayKey,
  );
  if (!hasCurrentWeekendData) {
    return statistics;
  }
  return statistics.map((item) => {
    const agentExists = agents.some((agent) => agent.id === item.agentId);
    if (!agentExists) return item;
    const worksSaturday = assignments.some(
      (assignment) =>
        assignment.agentId === item.agentId && assignment.assignmentDate === saturdayKey,
    );
    const worksSunday = assignments.some(
      (assignment) =>
        assignment.agentId === item.agentId && assignment.assignmentDate === sundayKey,
    );
    const completeDates = new Set(item.completeWeekendOffDates ?? []);
    if (worksSaturday || worksSunday || completeDates.has(saturdayKey)) {
      return item;
    }
    completeDates.add(saturdayKey);
    const completeWeekendOffDates = [...completeDates].sort();
    return {
      ...item,
      completeWeekendOffCount: completeWeekendOffDates.length,
      lastCompleteWeekendOff: completeWeekendOffDates.at(-1) ?? item.lastCompleteWeekendOff,
      completeWeekendOffDates,
    };
  });
}

function weekendStartsBetween(start?: string, end?: string) {
  if (!start || !end) return [];
  const periodStart = parseLocalDate(start);
  const periodEnd = parseLocalDate(end);
  const firstSaturday = addDays(periodStart, (6 - periodStart.getDay() + 7) % 7);
  const weekends: Date[] = [];
  for (let date = firstSaturday; date <= periodEnd; date = addDays(date, 7)) {
    if (addDays(date, 1) <= periodEnd) {
      weekends.push(date);
    }
  }
  return weekends;
}

function formatWeekendHeader(saturday: Date) {
  const sunday = addDays(saturday, 1);
  return `${saturday.getDate()}–${sunday.getDate()}`;
}

function formatWeekendMonth(saturday: Date) {
  const sunday = addDays(saturday, 1);
  const formatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
  if (saturday.getMonth() === sunday.getMonth()) {
    return formatter.format(saturday).replace(".", "");
  }
  return `${formatter.format(saturday).replace(".", "")}/${formatter
    .format(sunday)
    .replace(".", "")}`;
}

function buildPlanningChangeSummary(
  planning: WeeklyPlanning,
  currentAssignments: PlanningAssignment[],
  agents: PlanningAgent[],
  weekStart: string,
) {
  const originalByCell = mapAssignmentsByCell(planning.assignments);
  const currentByCell = mapAssignmentsByCell(currentAssignments);
  const agentNames = new Map<number, string>();
  agents.forEach((agent) => agentNames.set(agent.id, agent.fullName));
  planning.agentSummaries.forEach((agent) => agentNames.set(agent.agentId, agent.fullName));
  [...planning.assignments, ...currentAssignments].forEach((assignment) =>
    agentNames.set(assignment.agentId, assignment.agentName),
  );

  const changedKeys = new Set([...originalByCell.keys(), ...currentByCell.keys()]);
  const weekStartDate = parseLocalDate(weekStart);
  return [...changedKeys]
    .map((key) => {
      const [agentIdValue, date] = key.split("|");
      const agentId = Number(agentIdValue);
      const original = originalByCell.get(key);
      const current = currentByCell.get(key);
      const before = cellSummary(original, planning.unavailableDays, agentId, date);
      const after = cellSummary(current, planning.unavailableDays, agentId, date);
      if (before === after) return null;
      return {
        key,
        agentName: agentNames.get(agentId) ?? `Agent ${String(agentId).padStart(2, "0")}`,
        date,
        before,
        after,
      };
    })
    .filter((change): change is PlanningChangeSummary => Boolean(change))
    .sort((left, right) => {
      const leftDate = parseLocalDate(left.date).getTime();
      const rightDate = parseLocalDate(right.date).getTime();
      if (leftDate !== rightDate) return leftDate - rightDate;
      return left.agentName.localeCompare(right.agentName, "fr-FR");
    })
    .filter((change) => {
      const date = parseLocalDate(change.date);
      return date >= weekStartDate && date <= addDays(weekStartDate, 6);
    });
}

function mapAssignmentsByCell(assignments: PlanningAssignment[]) {
  return new Map(assignments.map((assignment) => [assignmentCellKey(assignment), assignment]));
}

function assignmentCellKey(assignment: PlanningAssignment) {
  return `${assignment.agentId}|${assignment.assignmentDate}`;
}

function cellSummary(
  assignment: PlanningAssignment | undefined,
  unavailableDays: AgentUnavailability[],
  agentId: number,
  date: string,
) {
  const unavailability = unavailableDays.find(
    (item) => item.agentId === agentId && item.date === date,
  );
  if (unavailability) {
    return unavailabilityLabel(unavailability.reason);
  }
  return assignment ? shiftCodeLabel(assignment.shiftCode) : "OFF";
}

function freezeTargetsForWeek(
  planning: WeeklyPlanning,
  assignments: PlanningAssignment[],
  days: string[],
) {
  const daysSet = new Set(days);
  const byCell = mapAssignmentsByCell(assignments);
  const uniqueTargets = new Map<string, { agentId: number; date: string; shiftId?: number }>();
  (planning.freezes ?? [])
    .filter((freeze) => daysSet.has(freeze.date))
    .forEach((freeze) => {
      const key = `${freeze.agentId}|${freeze.date}`;
      const assignment = byCell.get(key);
      uniqueTargets.set(key, {
        agentId: freeze.agentId,
        date: freeze.date,
        shiftId: freeze.shiftId ?? assignment?.shiftId,
      });
    });
  return [...uniqueTargets.values()];
}

function freezeLabel(freeze: PlanningFreeze | undefined, isLocked: boolean) {
  if (!isLocked) return "";
  if (!freeze) return "Figé cette semaine";
  if (!freeze.endDate) return "Figé toujours";
  return `Figé jusqu'au ${new Intl.DateTimeFormat("fr-FR").format(parseLocalDate(freeze.endDate))}`;
}

function formatProblemForSupervisor(problem: PlanningProblem) {
  const context = [formatProblemDate(problem.date), formatProblemAgent(problem.agentId)]
    .filter(Boolean)
    .join(" · ");
  const title = context ? `${context} — ${problemTitle(problem)}` : problemTitle(problem);
  const description = problemDescription(problem);
  return {
    title,
    description,
    summary: `${title}: ${description}`,
  };
}

function problemTitle(problem: PlanningProblem) {
  switch (problem.code) {
    case "INVALID_SHIFT_COVERAGE":
      return "Couverture de shift incorrecte";
    case "INVALID_WEEKDAY_SHIFT":
      return "Shift non autorisé en semaine";
    case "INVALID_SUNDAY_WORKER_COUNT":
      return "Nombre d'agents incorrect le dimanche";
    case "INVALID_SUNDAY_SHIFT":
    case "INVALID_LOCKED_SUNDAY_SHIFT":
      return "Shift non autorisé le dimanche";
    case "AGENT_NOT_40H":
      return "Volume horaire hebdomadaire incorrect";
    case "INVALID_OFF_DAYS":
      return "Nombre de jours OFF incorrect";
    case "REST_LESS_THAN_10H":
      return "Repos inférieur à 10h";
    case "MAX_CONSECUTIVE_DAYS_EXCEEDED":
      return "Trop de jours travaillés d'affilée";
    case "NO_FULL_WEEKEND_OFF":
      return "Aucun week-end complet OFF";
    case "REPEATED_WEEKLY_ROTATION":
      return "Rotation répétée avec la semaine précédente";
    case "TWO_MONTH_SHIFT_ROTATION_GAP":
      return "Rotation incomplète sur deux mois";
    case "INVALID_FIXED_SCO_CONFIGURATION":
      return "Configuration SCO fixe incorrecte";
    case "FIXED_SCO_AGENT_MISSING":
      return "Agent SCO fixe manquant";
    case "INVALID_ROTATING_SCO":
      return "Rotation SCO incorrecte";
    case "FIXED_SCO_LOCK_CONFLICT":
      return "Conflit avec un SCO figé";
    case "FIXED_SCO_UNAVAILABLE":
      return "Agent SCO fixe indisponible";
    case "INVALID_LOCKED_COVERAGE":
    case "INVALID_LOCKED_SCO_COVERAGE":
    case "INVALID_LOCKED_SUNDAY_COVERAGE":
      return "Les shifts figés rendent la couverture impossible";
    case "INVALID_LOCKED_WEEKDAY_SHIFT":
      return "Shift figé non autorisé en semaine";
    case "NO_FEASIBLE_AGENT":
      return "Aucun agent compatible disponible";
    case "NO_NORMAL_SHIFT":
      return "Aucun shift intermédiaire compatible";
    case "NO_ROTATING_SCO_AGENT":
      return "Aucun agent disponible pour le SCO tournant";
    case "NO_SUNDAY_EARLY_AGENT":
      return "Aucun agent disponible pour le dimanche matin";
    case "INVALID_AGENT_COUNT":
      return "Nombre d'agents actifs incorrect";
    case "MISSING_SHIFT_DEFINITION":
      return "Shift obligatoire manquant";
    case "TOO_MANY_UNAVAILABLE_DAYS":
      return "Trop d'absences ou congés";
    case "ASSIGNMENT_OUTSIDE_WEEK":
      return "Affectation hors semaine";
    case "UNKNOWN_OR_INACTIVE_AGENT":
      return "Agent inconnu ou inactif";
    case "DUPLICATE_AGENT_DAY":
      return "Double affectation sur la même journée";
    case "INVALID_SHIFT":
      return "Shift invalide";
    case "AGENT_UNAVAILABLE":
      return "Agent indisponible";
    case "LOCKED_ASSIGNMENT_OVERWRITTEN":
      return "Shift figé modifié";
    case "LOCKED_OFF_DAY_OVERWRITTEN":
      return "Jour OFF figé modifié";
    case "NO_VALID_PLANNING":
      return "Planning valide impossible";
    default:
      return problem.code.replaceAll("_", " ").toLowerCase();
  }
}

function problemDescription(problem: PlanningProblem) {
  const message = problem.message ?? "";
  const agent = formatProblemAgent(problem.agentId) || "L'agent";
  const coverage = message.match(
    /Shift ([A-Z0-9_]+) requires exactly (\d+) agent\(s\); found (\d+)/,
  );
  if (problem.code === "INVALID_SHIFT_COVERAGE" && coverage) {
    const [, shiftCode, expected, actual] = coverage;
    return `${shiftCodeLabel(shiftCode)} doit avoir ${expected} agent(s), mais ${actual} sont planifiés.`;
  }

  const hours = message.match(/scheduled for (\d+)h/);
  if (problem.code === "AGENT_NOT_40H" && hours) {
    return `${agent} est planifié à ${hours[1]}h au lieu de 40h.`;
  }

  const offDays = message.match(/found (\d+) working days and (\d+) OFF days/);
  if (problem.code === "INVALID_OFF_DAYS" && offDays) {
    return `${agent} doit travailler 5 jours et avoir 2 jours OFF ; actuellement ${offDays[1]} jour(s) travaillés et ${offDays[2]} OFF.`;
  }

  const rest = message.match(
    /only (\d+)h rest before ([A-Z0-9_]+)(?: because of previous-week shift ([A-Z0-9_]+) on ([0-9-]+))?/,
  );
  if (problem.code === "REST_LESS_THAN_10H" && rest) {
    const [, restHours, nextShift, previousShift, previousDate] = rest;
    if (previousShift && previousDate) {
      return `${agent} n'a que ${restHours}h de repos avant ${shiftCodeLabel(nextShift)}, à cause de ${shiftCodeLabel(previousShift)} le ${formatProblemDate(previousDate)}.`;
    }
    return `${agent} n'a que ${restHours}h de repos avant ${shiftCodeLabel(nextShift)}.`;
  }

  const sundayWorkers = message.match(/found (\d+)/);
  if (problem.code === "INVALID_SUNDAY_WORKER_COUNT" && sundayWorkers) {
    return `Le dimanche doit avoir exactement 5 agents travaillés ; actuellement ${sundayWorkers[1]}.`;
  }

  const unavailable = message.match(/has (\d+) unavailable days/);
  if (problem.code === "TOO_MANY_UNAVAILABLE_DAYS" && unavailable) {
    return `${agent} a ${unavailable[1]} jour(s) d'absence/congé, ce qui empêche d'atteindre 5 jours travaillés.`;
  }

  const missingShifts = message.match(/Missing: (.*)\./);
  if (problem.code === "TWO_MONTH_SHIFT_ROTATION_GAP" && missingShifts) {
    return `${agent} n'a pas encore couvert tous les shifts standards. Manquants : ${missingShifts[1]
      .split(", ")
      .map(shiftCodeLabel)
      .join(", ")}.`;
  }

  const repeatedCategory = message.match(/has ([A-Z]+) in consecutive weeks/);
  if (problem.code === "REPEATED_WEEKLY_ROTATION" && repeatedCategory) {
    return `${agent} reçoit encore un shift ${categoryLabel(repeatedCategory[1])} comme la semaine précédente.`;
  }

  switch (problem.code) {
    case "INVALID_WEEKDAY_SHIFT":
      return "Du lundi au samedi, seuls les shifts standards sont autorisés.";
    case "INVALID_SUNDAY_SHIFT":
    case "INVALID_LOCKED_SUNDAY_SHIFT":
      return "Le dimanche accepte uniquement Intermédiaire 05:00–14:00 et SCO 11:00–20:00.";
    case "INVALID_FIXED_SCO_CONFIGURATION":
      return "Il ne peut pas y avoir plus d'un agent configuré comme SCO fixe.";
    case "FIXED_SCO_AGENT_MISSING":
      return `${agent} doit être affecté au SCO du dimanche.`;
    case "INVALID_ROTATING_SCO":
      return "Le dimanche doit avoir la bonne rotation SCO selon la configuration actuelle.";
    case "MAX_CONSECUTIVE_DAYS_EXCEEDED":
      return `${agent} dépasserait 5 jours travaillés d'affilée en tenant compte de l'historique.`;
    case "NO_FULL_WEEKEND_OFF":
      return `${agent} n'a aucun week-end complet OFF sur la période contrôlée.`;
    case "INVALID_LOCKED_COVERAGE":
      return "Les shifts déjà figés empêchent de couvrir correctement cette journée.";
    case "INVALID_LOCKED_SCO_COVERAGE":
      return "Plus de deux affectations SCO du dimanche sont figées.";
    case "INVALID_LOCKED_SUNDAY_COVERAGE":
      return "Plus de trois shifts dimanche matin sont figés.";
    case "NO_FEASIBLE_AGENT":
      return "Aucun agent disponible ne respecte à la fois les repos, les absences et les shifts déjà figés.";
    case "NO_NORMAL_SHIFT":
      return `${agent} ne peut recevoir aucun shift intermédiaire tout en gardant 10h de repos.`;
    case "NO_ROTATING_SCO_AGENT":
      return "Aucun agent différent et disponible ne peut couvrir le SCO tournant du dimanche.";
    case "NO_SUNDAY_EARLY_AGENT":
      return "Aucun agent disponible ne peut couvrir le dimanche 05:00–14:00.";
    case "INVALID_AGENT_COUNT":
      return "La génération automatique exige exactement 12 agents actifs.";
    case "MISSING_SHIFT_DEFINITION":
      return "Un shift requis par les règles n'est pas configuré ou n'est pas actif.";
    case "ASSIGNMENT_OUTSIDE_WEEK":
      return "Une affectation se trouve en dehors de la semaine sélectionnée.";
    case "UNKNOWN_OR_INACTIVE_AGENT":
      return "Une affectation référence un agent qui n'existe pas ou n'est pas actif.";
    case "DUPLICATE_AGENT_DAY":
      return `${agent} a deux affectations sur la même journée.`;
    case "INVALID_SHIFT":
      return "Une affectation ne correspond à aucun shift actif configuré.";
    case "AGENT_UNAVAILABLE":
      return `${agent} est marqué absent ou en congé sur cette date.`;
    case "LOCKED_ASSIGNMENT_OVERWRITTEN":
      return "Une affectation figée a été supprimée ou remplacée.";
    case "LOCKED_OFF_DAY_OVERWRITTEN":
      return "Un jour OFF figé a reçu un shift travaillé.";
    case "NO_VALID_PLANNING":
      return "Le générateur n'a pas trouvé de combinaison valide avec les contraintes actuelles.";
    default:
      return message || "Une règle métier n'est pas respectée.";
  }
}

function formatProblemDate(date: string | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(parseLocalDate(date));
}

function formatProblemAgent(agentId: number | null) {
  return agentId ? `Agent ${String(agentId).padStart(2, "0")}` : "";
}

function shiftCodeLabel(code: string) {
  const labels: Record<string, string> = {
    OPEN_03_12: "Ouverture 03:00–12:00",
    NORMAL_05_14: "Intermédiaire 05:00–14:00",
    NORMAL_07_16: "Intermédiaire 07:00–16:00",
    NORMAL_08_17: "Intermédiaire 08:00–17:00",
    NORMAL_09_18: "Intermédiaire 09:00–18:00",
    CLOSE_12_21: "Fermeture 12:00–21:00",
    CLOSE_13_22: "Fermeture 13:00–22:00",
    SCO_11_20: "SCO 11:00–20:00",
  };
  return labels[code] ?? code;
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    OPENING: "Ouverture",
    NORMAL: "Intermédiaire",
    CLOSING: "Fermeture",
    SCO: "SCO",
    OFF: "OFF",
  };
  return labels[category] ?? category;
}

function formatProblemTitle(problem: PlanningProblem) {
  const parts = [];
  if (problem.date) {
    parts.push(
      new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      }).format(parseLocalDate(problem.date)),
    );
  }
  if (problem.agentId) {
    parts.push(`Agent ${String(problem.agentId).padStart(2, "0")}`);
  }
  parts.push(problem.code);
  return parts.join(" · ");
}

function isToday(value: string) {
  const today = new Date();
  const date = parseLocalDate(value);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function parseLocalDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function cloneAssignments(assignments: PlanningAssignment[]) {
  return assignments.map((assignment) => ({ ...assignment }));
}

function assignmentsEqual(left: PlanningAssignment[], right: PlanningAssignment[]) {
  if (left.length !== right.length) return false;
  const leftMap = new Map(left.map((assignment) => [assignmentCellKey(assignment), assignment]));
  return right.every((assignment) => {
    const other = leftMap.get(assignmentCellKey(assignment));
    return (
      other &&
      other.agentId === assignment.agentId &&
      other.assignmentDate === assignment.assignmentDate &&
      other.shiftId === assignment.shiftId &&
      other.latenessMinutes === assignment.latenessMinutes &&
      other.locked === assignment.locked
    );
  });
}

function dateKeysInRange(start: string, end: string) {
  const dates: string[] = [];
  for (let date = parseLocalDate(start); date <= parseLocalDate(end); date = addDays(date, 1)) {
    dates.push(formatDateInput(date));
  }
  return dates;
}

function getMondayInputValue(date: Date) {
  const copy = parseLocalDate(date);
  const day = copy.getDay() === 0 ? 7 : copy.getDay();
  copy.setDate(copy.getDate() - day + 1);
  return formatDateInput(copy);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLateness(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours}h` : `${hours}h${remaining}`;
}

async function planningApiError(response: Response) {
  if (response.status === 401) {
    return "Votre session n'a pas été reconnue. Actualisez la page puis réessayez.";
  }
  if (response.status === 503) {
    return "Le service de planning est indisponible. Verifiez que planning-service est demarre.";
  }
  if (response.status >= 500) {
    return "Le backend planning ne repond pas correctement. Verifiez api-gateway et planning-service, puis reessayez.";
  }
  try {
    const payload = (await response.json()) as {
      message?: string;
      problems?: PlanningProblem[];
    };
    const firstProblem = payload.problems?.find((problem) => problem.severity === "ERROR");
    return firstProblem
      ? formatProblemForSupervisor(firstProblem).summary
      : payload.message || `Erreur HTTP ${response.status}`;
  } catch {
    return `Erreur HTTP ${response.status}`;
  }
}

function formatPlanningLoadError(cause: unknown, fallback: string) {
  if (cause instanceof Error) {
    if (/failed to fetch|network|econnrefused|load failed/i.test(cause.message)) {
      return "Impossible de joindre le backend planning. Verifiez que api-gateway tourne sur 8087 et que planning-service tourne sur 8086.";
    }
    return cause.message;
  }
  return fallback;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
