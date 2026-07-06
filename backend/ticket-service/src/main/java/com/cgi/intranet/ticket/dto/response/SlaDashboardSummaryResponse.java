package com.cgi.intranet.ticket.dto.response;

import java.time.LocalDateTime;

public record SlaDashboardSummaryResponse(
        long totalTrackedTickets,
        long respectedTickets,
        long atRiskTickets,
        long breachedTickets,
        long pausedTickets,
        long notApplicableTickets,
        long criticalBreachedTickets,
        Double averageResolutionMinutes,
        Double averageResponseMinutes,
        Double slaComplianceRate,
        LocalDateTime generatedAt
) {
}
