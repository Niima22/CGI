package com.cgi.intranet.planning.dto.response;

import com.cgi.intranet.planning.enums.ShiftCategory;

public record PlanningAssignmentResponse(
        Long id,
        Long agentId,
        String agentName,
        Long shiftId,
        String shiftCode,
        ShiftCategory shiftCategory,
        String assignmentDate,
        String startTime,
        String endTime,
        int paidHours,
        int latenessMinutes,
        boolean locked,
        boolean generated,
        boolean manuallyOverridden
) {
}
