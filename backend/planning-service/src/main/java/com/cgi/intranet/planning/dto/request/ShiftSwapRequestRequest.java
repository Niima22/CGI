package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ShiftSwapRequestRequest(
        @NotNull Long targetAgentId,
        @NotNull LocalDate requesterDate,
        @NotNull LocalDate targetDate,
        String reason
) {
}
