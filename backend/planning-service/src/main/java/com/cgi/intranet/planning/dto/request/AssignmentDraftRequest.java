package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AssignmentDraftRequest(
        Long id,
        @NotNull Long agentId,
        @NotNull Long shiftId,
        @NotNull LocalDate assignmentDate,
        boolean locked,
        boolean generated,
        int latenessMinutes
) {
    public AssignmentDraftRequest(
            Long id,
            Long agentId,
            Long shiftId,
            LocalDate assignmentDate,
            boolean locked,
            boolean generated
    ) {
        this(id, agentId, shiftId, assignmentDate, locked, generated, 0);
    }

    public int safeLatenessMinutes() {
        return Math.max(0, latenessMinutes);
    }
}
