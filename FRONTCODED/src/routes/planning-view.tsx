import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Download, Eye, LoaderCircle, RefreshCcw, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export const Route = createFileRoute("/planning-view")({
  head: () => ({
    meta: [{ title: "Visualiser le planning - CGI Intranet" }],
  }),
  component: PlanningViewPage,
});

type Assignment = {
  agentId: number;
  agentName: string;
  shiftCode: string;
  assignmentDate: string;
  startTime: string;
  endTime: string;
};

type AgentSummary = {
  agentId: number;
  fullName: string;
};

type PlanningAgent = {
  id: number;
  fullName: string;
};

type Unavailability = {
  agentId: number;
  date: string;
  reason: string;
};

type PlanningResponse = {
  planningWeekId: number | null;
  status: "DRAFT" | "PUBLISHED";
  assignments: Assignment[];
  agentSummaries: AgentSummary[];
  unavailableDays: Unavailability[];
};

type ViewerResponse = {
  supervisor: boolean;
  linkedToPlanningAgent: boolean;
  agentId: number | null;
  agentName: string | null;
};

type TeleworkRequest = {
  id: number;
  agentId: number;
  agentName: string;
  date: string;
  status: string;
  reason: string | null;
};

type LeaveRequest = {
  id: number;
  agentId: number;
  agentName: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string | null;
};

type SwapRequest = {
  id: number;
  requesterAgentId: number;
  requesterAgentName: string;
  targetAgentId: number;
  targetAgentName: string;
  requesterDate: string;
  targetDate: string;
  status: string;
  reason: string | null;
};

type RequestType = "telework" | "leave" | "swap";
type RequestStatus = "APPROVED" | "REJECTED" | "CANCELLED";

function PlanningViewPage() {
  const { authenticatedFetch, isReady, isAuthenticated } = useAuth();
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [planning, setPlanning] = useState<PlanningResponse | null>(null);
  const [viewer, setViewer] = useState<ViewerResponse | null>(null);
  const [availableAgents, setAvailableAgents] = useState<PlanningAgent[]>([]);
  const [teleworkRequests, setTeleworkRequests] = useState<TeleworkRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [requestType, setRequestType] = useState<RequestType>("telework");
  const [ttDate, setTtDate] = useState("");
  const [ttReason, setTtReason] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [swapTargetAgentId, setSwapTargetAgentId] = useState("");
  const [swapRequesterDate, setSwapRequesterDate] = useState("");
  const [swapTargetDate, setSwapTargetDate] = useState("");
  const [swapReason, setSwapReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(parseDate(weekStart), index)),
    [weekStart],
  );

  const loadPlanningView = useCallback(async () => {
    if (!isReady || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const viewerResponse = await authenticatedFetch("/api/plannings/viewer").then(
        async (response) => readPlanningResponse<ViewerResponse>(response),
      );
      const planningResponse = await authenticatedFetch(`/api/plannings/week/${weekStart}`).then(
        async (response) => readPlanningResponse<PlanningResponse>(response),
      );
      setViewer(viewerResponse);
      setPlanning(planningResponse);
      if (viewerResponse.supervisor || viewerResponse.linkedToPlanningAgent) {
        const [agentResponse, teleworkResponse, leaveResponse, swapResponse] = await Promise.all([
          authenticatedFetch("/api/plannings/agents/swap-options").then(async (response) =>
            readPlanningResponse<PlanningAgent[]>(response),
          ),
          authenticatedFetch(`/api/plannings/week/${weekStart}/telework-requests`).then(
            async (response) => readPlanningResponse<TeleworkRequest[]>(response),
          ),
          authenticatedFetch(`/api/plannings/week/${weekStart}/leave-requests`).then(
            async (response) => readPlanningResponse<LeaveRequest[]>(response),
          ),
          authenticatedFetch("/api/plannings/swap-requests").then(async (response) =>
            readPlanningResponse<SwapRequest[]>(response),
          ),
        ]);
        setAvailableAgents(agentResponse);
        setTeleworkRequests(teleworkResponse);
        setLeaveRequests(leaveResponse);
        setSwapRequests(swapResponse);
      } else {
        setAvailableAgents([]);
        setTeleworkRequests([]);
        setLeaveRequests([]);
        setSwapRequests([]);
      }
      setTtDate((current) => current || weekStart);
      setLeaveStartDate((current) => current || weekStart);
      setLeaveEndDate((current) => current || weekStart);
      setSwapRequesterDate((current) => current || weekStart);
      setSwapTargetDate((current) => current || weekStart);
    } catch (cause) {
      setPlanning(null);
      setAvailableAgents([]);
      setTeleworkRequests([]);
      setLeaveRequests([]);
      setSwapRequests([]);
      setError(formatPlanningViewLoadError(cause));
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, isAuthenticated, isReady, weekStart]);

  useEffect(() => {
    void loadPlanningView();
  }, [loadPlanningView]);

  const agents = planning?.agentSummaries ?? [];
  const otherAgents = availableAgents.filter((agent) => agent.id !== viewer?.agentId);

  async function submitTeleworkRequest() {
    setNotice(null);
    setError(null);
    try {
      const response = await authenticatedFetch("/api/plannings/telework-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: ttDate, reason: ttReason }),
      });
      if (!response.ok) throw new Error();
      const created = (await response.json()) as TeleworkRequest;
      setTeleworkRequests((current) => [created, ...current]);
      setTtReason("");
      setNotice("Demande de teletravail envoyee.");
    } catch {
      setError("Impossible d'envoyer la demande de teletravail.");
    }
  }

  async function submitLeaveRequest() {
    setNotice(null);
    setError(null);
    try {
      const response = await authenticatedFetch("/api/plannings/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: leaveStartDate,
          endDate: leaveEndDate || leaveStartDate,
          reason: leaveReason,
        }),
      });
      if (!response.ok) throw new Error();
      const created = (await response.json()) as LeaveRequest;
      setLeaveRequests((current) => [created, ...current]);
      setLeaveReason("");
      setNotice("Demande de conge envoyee.");
    } catch {
      setError("Impossible d'envoyer la demande de conge.");
    }
  }

  async function submitSwapRequest() {
    if (!swapTargetAgentId) return;
    setNotice(null);
    setError(null);
    try {
      const response = await authenticatedFetch("/api/plannings/swap-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAgentId: Number(swapTargetAgentId),
          requesterDate: swapRequesterDate,
          targetDate: swapTargetDate,
          reason: swapReason,
        }),
      });
      if (!response.ok) throw new Error();
      const created = (await response.json()) as SwapRequest;
      setSwapRequests((current) => [created, ...current]);
      setSwapReason("");
      setNotice("Demande de swap envoyee.");
    } catch {
      setError("Impossible d'envoyer la demande de swap.");
    }
  }

  async function updateRequestStatus(type: RequestType, id: number, status: RequestStatus) {
    setNotice(null);
    setError(null);
    const endpoints: Record<RequestType, string> = {
      telework: `/api/plannings/telework-requests/${id}/status`,
      leave: `/api/plannings/leave-requests/${id}/status`,
      swap: `/api/plannings/swap-requests/${id}/status`,
    };
    try {
      const response = await authenticatedFetch(endpoints[type], {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error();
      if (type === "telework") {
        const updated = (await response.json()) as TeleworkRequest;
        setTeleworkRequests((current) =>
          current.map((request) => (request.id === id ? updated : request)),
        );
      } else if (type === "leave") {
        const updated = (await response.json()) as LeaveRequest;
        setLeaveRequests((current) =>
          current.map((request) => (request.id === id ? updated : request)),
        );
      } else {
        const updated = (await response.json()) as SwapRequest;
        setSwapRequests((current) =>
          current.map((request) => (request.id === id ? updated : request)),
        );
      }
      setNotice(status === "APPROVED" ? "Demande approuvee." : "Demande mise a jour.");
    } catch {
      setError("Impossible de mettre a jour la demande.");
    }
  }

  async function exportPlanning(format: "xlsx" | "pdf") {
    setExporting(format);
    setError(null);
    try {
      const response = await authenticatedFetch(
        `/api/plannings/week/${weekStart}/export?format=${format}`,
      );
      if (!response.ok) throw new Error(await planningViewApiError(response));
      const blob = await response.blob();
      downloadBlob(blob, `planning-${weekStart}.${format}`);
      setNotice(format === "xlsx" ? "Export Excel telecharge." : "Export PDF telecharge.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'exporter le planning.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Workforce · Lecture seule</p>
            <h1 className="mt-1 text-2xl font-semibold">Visualiser le planning</h1>
          </div>
          <div className="flex items-center gap-2">
            {planning?.planningWeekId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportPlanning("xlsx")}
                  disabled={exporting !== null}
                >
                  {exporting === "xlsx" ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportPlanning("pdf")}
                  disabled={exporting !== null}
                >
                  {exporting === "pdf" ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  PDF
                </Button>
              </>
            )}
            <Button variant="outline" size="icon" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
              <ChevronLeft />
            </Button>
            <div className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">
              {formatRange(days)}
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
              <ChevronRight />
            </Button>
          </div>
        </div>

        {notice && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        {error && (
          <div className="flex flex-col gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start border-rose-200 bg-white text-rose-800 hover:bg-rose-100 sm:self-auto"
              onClick={() => void loadPlanningView()}
              disabled={loading}
            >
              {loading ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Reessayer
            </Button>
          </div>
        )}

        {viewer && !viewer.supervisor && !viewer.linkedToPlanningAgent ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-10 text-center text-amber-900">
            <Eye className="mx-auto mb-3 h-8 w-8" />
            <h2 className="font-semibold">Compte non associé au planning</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm">
              Votre adresse e-mail ne correspond à aucun des 12 agents actifs. Un administrateur
              doit renseigner la même adresse e-mail sur votre agent de planning avant que vous
              puissiez consulter vos shifts.
            </p>
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-border/60 bg-white p-12 text-center text-muted-foreground shadow-card">
            <LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin text-cgi-purple" />
            Chargement du planning...
          </div>
        ) : !planning?.planningWeekId ? (
          <div className="rounded-2xl border border-border/60 bg-white p-12 text-center text-muted-foreground shadow-card">
            <Eye className="mx-auto mb-3 h-8 w-8" />
            {loading ? "Chargement…" : "Aucun planning sauvegardé pour cette semaine."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] table-fixed">
                <thead>
                  <tr className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <th className="w-32 border-r px-2 py-2 text-left">Agents</th>
                    {days.map((day) => (
                      <th key={formatDate(day)} className="border-r px-1 py-2 text-center">
                        {weekday(day)} {day.getDate()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.agentId} className="border-t">
                      <td className="border-r px-2 py-1 text-[11px] font-semibold">
                        {agent.fullName}
                      </td>
                      {days.map((day) => {
                        const date = formatDate(day);
                        const assignment = planning.assignments.find(
                          (item) => item.agentId === agent.agentId && item.assignmentDate === date,
                        );
                        const unavailability = planning.unavailableDays?.find(
                          (item) =>
                            item.agentId === agent.agentId &&
                            item.date === date &&
                            item.reason !== "TELETRAVAIL",
                        );
                        const telework = planning.unavailableDays?.some(
                          (item) =>
                            item.agentId === agent.agentId &&
                            item.date === date &&
                            item.reason === "TELETRAVAIL",
                        );
                        return (
                          <td key={date} className="border-r p-0.5">
                            <div className={`flex min-h-7 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-center text-[9px] font-semibold ${cellColor(assignment?.shiftCode, unavailability?.reason)}`}>
                              {unavailability
                                ? unavailabilityLabel(unavailability.reason)
                                : assignment
                                ? assignment.shiftCode === "SCO_11_20"
                                  ? "SCO 11:00–20:00"
                                  : `${assignment.startTime}–${assignment.endTime}`
                                : "OFF"}
                              {telework && (
                                <span className="rounded-full border border-sky-200 bg-white/80 px-1.5 py-0 text-[8px] font-semibold leading-3 text-sky-700">
                                  Teletravail
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewer?.linkedToPlanningAgent && planning?.planningWeekId && (
          <section className="rounded-2xl border border-border/60 bg-white p-4 shadow-card">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Demande</h2>
                <p className="text-xs text-muted-foreground">
                  Choisissez le type de demande, puis envoyez-la.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={requestType}
                  onValueChange={(value) => setRequestType(value as RequestType)}
                >
                  <SelectTrigger className="h-9 w-full sm:w-[220px]">
                    <SelectValue placeholder="Type de demande" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telework">Teletravail</SelectItem>
                    <SelectItem value="leave">Conge</SelectItem>
                    <SelectItem value="swap">Swap</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={
                    requestType === "telework"
                      ? submitTeleworkRequest
                      : requestType === "leave"
                        ? submitLeaveRequest
                        : submitSwapRequest
                  }
                  disabled={
                    requestType === "telework"
                      ? !ttDate
                      : requestType === "leave"
                        ? !leaveStartDate || !leaveEndDate
                        : !swapTargetAgentId || !swapRequesterDate || !swapTargetDate
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer
                </Button>
              </div>
            </div>

            {requestType === "telework" && (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr]">
                  <input
                    type="date"
                    value={ttDate}
                    onChange={(event) => setTtDate(event.target.value)}
                    className="h-9 rounded-md border px-3 text-sm"
                  />
                  <input
                    value={ttReason}
                    onChange={(event) => setTtReason(event.target.value)}
                    placeholder="Motif optionnel"
                    className="h-9 rounded-md border px-3 text-sm"
                  />
                </div>
                <RequestList
                  items={teleworkRequests.map((request) => ({
                    id: request.id,
                    title: `${formatShortDate(request.date)} - ${request.agentName}`,
                    detail: request.reason || "Teletravail",
                    status: request.status,
                  }))}
                  canManage={Boolean(viewer?.supervisor)}
                  onApprove={(id) => void updateRequestStatus("telework", id, "APPROVED")}
                  onReject={(id) => void updateRequestStatus("telework", id, "REJECTED")}
                  onCancel={(id) => void updateRequestStatus("telework", id, "CANCELLED")}
                />
              </>
            )}

            {requestType === "leave" && (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(event) => {
                      setLeaveStartDate(event.target.value);
                      if (!leaveEndDate || leaveEndDate < event.target.value) {
                        setLeaveEndDate(event.target.value);
                      }
                    }}
                    className="h-9 rounded-md border px-3 text-sm"
                  />
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(event) => setLeaveEndDate(event.target.value)}
                    className="h-9 rounded-md border px-3 text-sm"
                  />
                </div>
                <input
                  value={leaveReason}
                  onChange={(event) => setLeaveReason(event.target.value)}
                  placeholder="Motif optionnel"
                  className="mt-2 h-9 w-full rounded-md border px-3 text-sm"
                />
                <RequestList
                  items={leaveRequests.map((request) => ({
                    id: request.id,
                    title:
                      request.startDate === request.endDate
                        ? `${formatShortDate(request.startDate)} - ${request.agentName}`
                        : `${formatShortDate(request.startDate)} au ${formatShortDate(request.endDate)}`,
                    detail: request.reason || "Conge",
                    status: request.status,
                  }))}
                  canManage={Boolean(viewer?.supervisor)}
                  onApprove={(id) => void updateRequestStatus("leave", id, "APPROVED")}
                  onReject={(id) => void updateRequestStatus("leave", id, "REJECTED")}
                  onCancel={(id) => void updateRequestStatus("leave", id, "CANCELLED")}
                />
              </>
            )}

            {requestType === "swap" && (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input
                    type="date"
                    value={swapRequesterDate}
                    onChange={(event) => setSwapRequesterDate(event.target.value)}
                    className="h-9 rounded-md border px-3 text-sm"
                  />
                  <Select value={swapTargetAgentId} onValueChange={setSwapTargetAgentId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Agent cible" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherAgents.map((agent) => (
                        <SelectItem key={agent.id} value={String(agent.id)}>
                          {agent.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="date"
                    value={swapTargetDate}
                    onChange={(event) => setSwapTargetDate(event.target.value)}
                    className="h-9 rounded-md border px-3 text-sm"
                  />
                </div>
                <input
                  value={swapReason}
                  onChange={(event) => setSwapReason(event.target.value)}
                  placeholder="Motif optionnel"
                  className="mt-2 h-9 w-full rounded-md border px-3 text-sm"
                />
                <RequestList
                  items={swapRequests.map((request) => ({
                    id: request.id,
                    title: `${request.requesterAgentName} / ${request.targetAgentName}`,
                    detail: `${formatShortDate(request.requesterDate)} contre ${formatShortDate(request.targetDate)}`,
                    status: request.status,
                  }))}
                  canManage={Boolean(viewer?.supervisor)}
                  onApprove={(id) => void updateRequestStatus("swap", id, "APPROVED")}
                  onReject={(id) => void updateRequestStatus("swap", id, "REJECTED")}
                  onCancel={(id) => void updateRequestStatus("swap", id, "CANCELLED")}
                />
              </>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function RequestList({
  items,
  canManage = false,
  onApprove,
  onReject,
  onCancel,
}: {
  items: { id: number; title: string; detail: string; status: string }[];
  canManage?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onCancel?: (id: number) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Aucune demande.
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {items.slice(0, 5).map((item) => (
        <div key={item.id} className="rounded-md bg-muted/40 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{item.title}</div>
            <div className="truncate text-[11px] text-muted-foreground">{item.detail}</div>
          </div>
          <span className="rounded-full border bg-white px-2 py-1 text-[10px] font-semibold text-muted-foreground">
            {statusLabel(item.status)}
          </span>
          </div>
          {canManage && item.status === "PENDING" && (
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => onApprove?.(item.id)}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Approuver
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReject?.(item.id)}>
                <X className="mr-1 h-3.5 w-3.5" />
                Refuser
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onCancel?.(item.id)}>
                Annuler
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function cellColor(code?: string, reason?: string) {
  if (reason === "TELETRAVAIL") return "bg-sky-50 text-sky-800";
  if (reason === "ABSENT") return "bg-rose-50 text-rose-800";
  if (reason) return "bg-emerald-50 text-emerald-800";
  if (!code) return "bg-muted text-muted-foreground";
  if (code === "SCO_11_20") return "bg-fuchsia-50 text-fuchsia-800";
  if (code === "OPEN_03_12") return "bg-gradient-cgi-soft text-cgi-purple";
  if (code.startsWith("CLOSE")) return "bg-orange-50 text-orange-800";
  return "bg-indigo-50 text-indigo-800";
}

function unavailabilityLabel(reason: string) {
  if (reason === "TELETRAVAIL") return "TT";
  if (reason === "ABSENT") return "Absent";
  return "Congé";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "En attente",
    APPROVED: "Approuvee",
    REJECTED: "Refusee",
    CANCELLED: "Annulee",
  };
  return labels[status] ?? status;
}

async function readPlanningResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }
  throw new Error(await planningViewApiError(response));
}

async function planningViewApiError(response: Response) {
  if (response.status === 401) {
    return "Votre session n'a pas ete reconnue. Actualisez la page puis reessayez.";
  }
  if (response.status === 503) {
    return "Le service de planning est indisponible. Verifiez que planning-service est demarre.";
  }
  if (response.status >= 500) {
    return "Le backend planning ne repond pas correctement. Verifiez api-gateway et planning-service, puis reessayez.";
  }
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message || `Erreur HTTP ${response.status}`;
  } catch {
    return `Erreur HTTP ${response.status}`;
  }
}

function formatPlanningViewLoadError(cause: unknown) {
  if (cause instanceof Error) {
    if (/failed to fetch|network|econnrefused|load failed/i.test(cause.message)) {
      return "Impossible de joindre le backend planning. Verifiez que api-gateway tourne sur 8087 et que planning-service tourne sur 8086.";
    }
    return cause.message;
  }
  return "Impossible de charger le planning de cette semaine.";
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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(parseDate(value));
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, count: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mondayOf(date: Date) {
  const day = date.getDay() || 7;
  return formatDate(addDays(date, 1 - day));
}

function shiftWeek(value: string, count: number) {
  return formatDate(addDays(parseDate(value), count * 7));
}

function weekday(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", "");
}

function formatRange(days: Date[]) {
  const format = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return `${format.format(days[0])} – ${format.format(days[6])}`;
}
