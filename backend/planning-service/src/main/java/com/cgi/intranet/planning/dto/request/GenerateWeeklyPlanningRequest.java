package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.Set;

public record GenerateWeeklyPlanningRequest(
        @NotNull LocalDate weekStartDate,
        Set<LocalDate> datesToRegenerate
) {
    public GenerateWeeklyPlanningRequest(LocalDate weekStartDate) {
        this(weekStartDate, Set.of());
    }
}
