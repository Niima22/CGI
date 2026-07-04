package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AssignmentLockRequest(
        @NotNull Long agentId,
        @NotNull LocalDate assignmentDate,
        Long shiftId,
        @NotNull Boolean locked,
        LocalDate endDate
) {
    public AssignmentLockRequest(Long agentId, LocalDate assignmentDate, Boolean locked) {
        this(agentId, assignmentDate, null, locked, null);
    }

    public AssignmentLockRequest(Long agentId, LocalDate assignmentDate, Long shiftId, Boolean locked) {
        this(agentId, assignmentDate, shiftId, locked, null);
    }
}
