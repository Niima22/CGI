package com.cgi.intranet.planning.dto.response;

import com.cgi.intranet.planning.enums.PlanningStatus;

import java.time.LocalDate;
import java.util.List;

public record WeeklyPlanningResponse(
        Long planningWeekId,
        PlanningStatus status,
        LocalDate weekStartDate,
        LocalDate weekEndDate,
        List<ShiftResponse> shifts,
        List<PlanningAssignmentResponse> assignments,
        List<PlanningProblemResponse> problems,
        List<PlanningAgentSummaryResponse> agentSummaries,
        List<String> lockedOffDays,
        List<PlanningFreezeResponse> freezes,
        List<AgentUnavailabilityResponse> unavailableDays,
        boolean manuallyOverridden
) {
}
