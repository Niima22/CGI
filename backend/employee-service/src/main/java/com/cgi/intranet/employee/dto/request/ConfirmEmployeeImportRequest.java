package com.cgi.intranet.employee.dto.request;

import com.cgi.intranet.employee.dto.response.EmployeeImportPreviewItem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ConfirmEmployeeImportRequest(
        @NotEmpty List<@Valid EmployeeImportPreviewItem> employees
) {
}
