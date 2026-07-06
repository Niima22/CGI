package com.cgi.intranet.ticket.dto.response;

import java.time.LocalDateTime;

public record KpiEmployeeSummaryResponse(
        long totalAgentsWithTickets,
        long totalActiveAssignedTickets,
        Double averageWorkloadScore,
        Double bestSlaComplianceRate,
        Double lowestSlaComplianceRate,
        LocalDateTime generatedAt
) {
}
