package com.cgi.intranet.planning.service.impl;

import com.cgi.intranet.planning.entity.Shift;
import com.cgi.intranet.planning.enums.ShiftCategory;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PlanningDraftAssignment(
        Long id,
        Long agentId,
        String agentName,
        Long shiftId,
        String shiftCode,
        ShiftCategory shiftCategory,
        LocalDate assignmentDate,
        LocalDateTime startAt,
        LocalDateTime endAt,
        int paidHours,
        boolean locked,
        boolean generated
) {

    public static PlanningDraftAssignment of(Long id, Long agentId, String agentName, Shift shift, LocalDate date, boolean locked, boolean generated) {
        return new PlanningDraftAssignment(
                id,
                agentId,
                agentName,
                shift.getId(),
                shift.getCode(),
                shift.getCategory(),
                date,
                date.atTime(shift.getStartTime()),
                date.atTime(shift.getEndTime()),
                shift.getPaidHours(),
                locked,
                generated
        );
    }

    public String key() {
        return agentId + "|" + assignmentDate + "|" + shiftId;
    }
}
