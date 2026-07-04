package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AssignmentDraftRequest(
        Long id,
        @NotNull Long agentId,
        @NotNull Long shiftId,
        @NotNull LocalDate assignmentDate,
        boolean locked,
        boolean generated
) {
}
