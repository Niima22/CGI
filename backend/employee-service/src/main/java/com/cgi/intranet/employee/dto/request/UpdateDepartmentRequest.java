package com.cgi.intranet.employee.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDepartmentRequest(
        @NotBlank(message = "Department name is required")
        @Size(max = 120, message = "Department name must be 120 characters or fewer")
        String name,

        @Size(max = 500, message = "Department description must be 500 characters or fewer")
        String description,

        String managerKeycloakId
) {
}
