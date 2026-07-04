package com.cgi.intranet.planning.dto.response;

import java.time.LocalDate;

public record PlanningAgentSummaryResponse(
        Long agentId,
        String fullName,
        int assignedHours,
        long openingCount,
        long closingCount,
        long offDays,
        long lateClosingCount,
        long saturdayOffCount,
        long sundayOffCount,
        long completeWeekendOffCount,
        LocalDate lastCompleteWeekendOff,
        long weekendsWorkedCount,
        long scoCount
) {
}
