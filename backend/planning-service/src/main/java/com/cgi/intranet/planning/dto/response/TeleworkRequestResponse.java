package com.cgi.intranet.planning.dto.response;

public record TeleworkRequestResponse(
        Long id,
        Long agentId,
        String agentName,
        String date,
        String status,
        String reason,
        String createdAt
) {
}
