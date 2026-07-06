package com.cgi.intranet.employee.dto.response;

import java.util.List;

public record EmployeeImportPreviewResponse(
        int count,
        List<EmployeeImportPreviewItem> employees
) {
}
