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
        int latenessMinutes,
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
                0,
                locked,
                generated
        );
    }

    public PlanningDraftAssignment withLatenessMinutes(int latenessMinutes) {
        return new PlanningDraftAssignment(
                id,
                agentId,
                agentName,
                shiftId,
                shiftCode,
                shiftCategory,
                assignmentDate,
                startAt,
                endAt,
                paidHours,
                Math.max(0, latenessMinutes),
                locked,
                generated
        );
    }

    public String key() {
        return agentId + "|" + assignmentDate + "|" + shiftId;
    }
}
