package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RequestStatusUpdateRequest(
        @NotBlank
        @Pattern(regexp = "APPROVED|REJECTED|CANCELLED")
        String status
) {
    public String normalizedStatus() {
        return status.trim().toUpperCase();
    }
}
