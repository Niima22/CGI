package com.cgi.intranet.employee.dto.request;

import com.cgi.intranet.employee.enums.AvailabilityStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateMyAvailabilityStatusRequest(
        @NotNull AvailabilityStatus availabilityStatus
) {
}
