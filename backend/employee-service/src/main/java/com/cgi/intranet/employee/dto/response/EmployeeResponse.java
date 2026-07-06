package com.cgi.intranet.employee.dto.response;

import com.cgi.intranet.employee.enums.AvailabilityStatus;
import com.cgi.intranet.employee.enums.EmployeeStatus;

import java.time.LocalDateTime;

public record EmployeeResponse(
        Long id,
        String userKeycloakId,
        String fullName,
        String email,
        String jobTitle,
        String department,
        String bannette,
        String operationalStatus,
        String activityStatus,
        String managerKeycloakId,
        String phone,
        String address,
        String bio,
        String profilePhotoUrl,
        Double latitude,
        Double longitude,
        EmployeeStatus status,
        AvailabilityStatus availabilityStatus,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
