package com.cgi.intranet.employee.service;

import com.cgi.intranet.employee.dto.request.CreateDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateDepartmentStatusRequest;
import com.cgi.intranet.employee.dto.response.DepartmentResponse;

import java.util.List;

public interface DepartmentService {

    List<DepartmentResponse> getDepartments(boolean includeInactive);

    DepartmentResponse getDepartmentById(Long id);

    DepartmentResponse createDepartment(CreateDepartmentRequest request);

    DepartmentResponse updateDepartment(Long id, UpdateDepartmentRequest request);

    DepartmentResponse updateDepartmentStatus(Long id, UpdateDepartmentStatusRequest request);
}
