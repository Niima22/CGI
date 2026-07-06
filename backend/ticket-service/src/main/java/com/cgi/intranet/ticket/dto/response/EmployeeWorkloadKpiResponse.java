package com.cgi.intranet.ticket.dto.response;

public record EmployeeWorkloadKpiResponse(
        Long assignedUserId,
        String assignedUserLabel,
        long totalAssignedTickets,
        long todoTickets,
        long assignedTickets,
        long inProgressTickets,
        long waitingTickets,
        long atRiskTickets,
        long breachedTickets,
        long criticalTickets,
        long workloadScore
) {
}
