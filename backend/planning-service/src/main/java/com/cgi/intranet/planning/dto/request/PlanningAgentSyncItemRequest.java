package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PlanningAgentSyncItemRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        Boolean active
) {
    public boolean effectiveActive() {
        return active == null || active;
    }

    public String normalizedEmail() {
        return email.trim().toLowerCase();
    }

    public String normalizedFullName() {
        return fullName.trim();
    }
}
