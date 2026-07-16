package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AgentUnavailabilityRequest(
        @NotNull Long agentId,
        @NotNull LocalDate date,
        LocalDate endDate,
        String reason
) {
    public AgentUnavailabilityRequest(Long agentId, LocalDate date, String reason) {
        this(agentId, date, null, reason);
    }

    public LocalDate effectiveEndDate() {
        return endDate == null ? date : endDate;
    }
}
