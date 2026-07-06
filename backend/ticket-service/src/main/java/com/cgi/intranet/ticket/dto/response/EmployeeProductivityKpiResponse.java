package com.cgi.intranet.ticket.dto.response;

public record EmployeeProductivityKpiResponse(
        Long assignedUserId,
        String assignedUserLabel,
        long resolvedTickets,
        long closedTickets,
        long processedTickets,
        Double averageTreatmentMinutes,
        long slaRespectedTickets,
        long slaBreachedTickets,
        Double slaComplianceRate
) {
}
