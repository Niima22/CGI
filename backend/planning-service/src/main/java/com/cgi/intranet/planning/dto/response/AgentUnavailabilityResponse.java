package com.cgi.intranet.planning.dto.response;

public record AgentUnavailabilityResponse(
        Long agentId,
        String date,
        String reason
) {
}
