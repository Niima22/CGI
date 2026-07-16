package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record TeleworkRequestRequest(
        @NotNull LocalDate date,
        String reason
) {
}
