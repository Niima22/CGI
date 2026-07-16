package com.cgi.intranet.planning.dto.response;

import java.util.List;

public record PlanningErrorResponse(
        String message,
        List<PlanningProblemResponse> problems
) {
}
