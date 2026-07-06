package com.cgi.intranet.employee.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateEmployeeRequest(
        @NotBlank String fullName,
        @Email String email,
        String jobTitle,
        @NotBlank String department,
        String bannette,
        String operationalStatus,
        String activityStatus,
        String managerKeycloakId,
        String address,
        Double latitude,
        Double longitude
) {
}
