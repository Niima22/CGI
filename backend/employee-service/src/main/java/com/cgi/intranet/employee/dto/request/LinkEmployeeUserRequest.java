package com.cgi.intranet.employee.dto.request;

public record LinkEmployeeUserRequest(
        String userKeycloakId,
        String email
) {
}
