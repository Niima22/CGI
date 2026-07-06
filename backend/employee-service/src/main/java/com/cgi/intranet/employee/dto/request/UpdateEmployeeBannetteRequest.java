package com.cgi.intranet.employee.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateEmployeeBannetteRequest(
        @NotBlank String bannette
) {
}
