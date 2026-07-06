package com.cgi.intranet.employee.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateEmployeeDepartmentRequest(
        @NotNull(message = "Department ID is required")
        Long departmentId
) {
}
