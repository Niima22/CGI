package com.cgi.intranet.employee.dto.response;

public record EmployeeImportPreviewItem(
        String fullName,
        String department,
        String bannette,
        String operationalStatus,
        String activityStatus,
        String email,
        String userKeycloakId,
        String managerKeycloakId,
        String address,
        Double latitude,
        Double longitude
) {
}
