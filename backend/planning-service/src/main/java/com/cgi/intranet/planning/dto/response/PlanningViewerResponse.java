package com.cgi.intranet.planning.dto.response;

public record PlanningViewerResponse(
        boolean supervisor,
        boolean linkedToPlanningAgent,
        Long agentId,
        String agentName
) {
}
