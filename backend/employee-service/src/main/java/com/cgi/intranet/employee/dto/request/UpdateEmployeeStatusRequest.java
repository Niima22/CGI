package com.cgi.intranet.employee.dto.request;

import com.cgi.intranet.employee.enums.EmployeeStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateEmployeeStatusRequest(
        @NotNull EmployeeStatus status
) {
}
