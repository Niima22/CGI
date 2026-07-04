package com.cgi.intranet.planning.dto.request;

import com.cgi.intranet.planning.enums.ValidationMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record SaveWeeklyPlanningRequest(
        @NotNull LocalDate weekStartDate,
        @NotEmpty List<@Valid AssignmentDraftRequest> assignments,
        boolean publish,
        ValidationMode validationMode,
        boolean overrideConfirmed,
        String overrideReason
) {
    public SaveWeeklyPlanningRequest(
            LocalDate weekStartDate,
            List<AssignmentDraftRequest> assignments,
            boolean publish
    ) {
        this(weekStartDate, assignments, publish, ValidationMode.STRICT, false, null);
    }

    public ValidationMode effectiveValidationMode() {
        return validationMode == null ? ValidationMode.STRICT : validationMode;
    }
}
