package com.cgi.intranet.planning.dto.response;

public record LeaveRequestResponse(
        Long id,
        Long agentId,
        String agentName,
        String startDate,
        String endDate,
        String status,
        String reason,
        String createdAt
) {
}
