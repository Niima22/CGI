package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AgentUnavailabilityRequest(
        @NotNull Long agentId,
        @NotNull LocalDate date,
        String reason
) {
}
