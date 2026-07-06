package com.cgi.intranet.employee.dto.response;

import java.time.LocalDateTime;

public record DepartmentResponse(
        Long id,
        String name,
        String description,
        boolean active,
        String managerKeycloakId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
