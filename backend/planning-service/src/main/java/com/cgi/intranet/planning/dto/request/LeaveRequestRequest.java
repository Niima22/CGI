package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record LeaveRequestRequest(
        @NotNull LocalDate startDate,
        LocalDate endDate,
        String reason
) {
}
