package com.cgi.intranet.employee.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateDepartmentStatusRequest(
        @NotNull(message = "Department active status is required")
        Boolean active
) {
}
