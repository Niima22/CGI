package com.cgi.intranet.planning.dto.response;

import com.cgi.intranet.planning.enums.ProblemSeverity;

public record PlanningProblemResponse(
        ProblemSeverity severity,
        String code,
        String message,
        Long agentId,
        String date
) {
}
