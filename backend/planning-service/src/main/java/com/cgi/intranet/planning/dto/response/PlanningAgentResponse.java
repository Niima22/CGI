package com.cgi.intranet.planning.dto.response;

public record PlanningAgentResponse(
        Long id,
        String fullName,
        String email,
        boolean active,
        boolean fixedSco
) {
}
