package com.cgi.intranet.planning.dto.response;

public record PlanningFreezeResponse(
        Long agentId,
        String date,
        Long shiftId,
        String startDate,
        String endDate
) {
}
