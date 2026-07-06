package com.cgi.intranet.employee.service;

import com.cgi.intranet.employee.dto.request.CreateEmployeeRequest;
import com.cgi.intranet.employee.dto.request.ConfirmEmployeeImportRequest;
import com.cgi.intranet.employee.dto.request.LinkEmployeeUserRequest;
import com.cgi.intranet.employee.dto.request.UpdateMyProfileRequest;
import com.cgi.intranet.employee.dto.request.UpdateMyAvailabilityStatusRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeBannetteRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeDepartmentRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeManagerRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeRequest;
import com.cgi.intranet.employee.dto.request.UpdateEmployeeStatusRequest;
import com.cgi.intranet.employee.dto.response.EmployeeImportPreviewResponse;
import com.cgi.intranet.employee.dto.response.EmployeeResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface EmployeeService {

    List<EmployeeResponse> getAllEmployees();

    List<EmployeeResponse> getEmployeesForRequester(String requesterKeycloakId, boolean globalAccess);

    EmployeeResponse getEmployeeById(Long id);

    EmployeeResponse getEmployeeByIdForRequester(Long id, String requesterKeycloakId, boolean globalAccess);

    EmployeeResponse getCurrentEmployee(String userKeycloakId, String email);

    EmployeeResponse updateCurrentAvailabilityStatus(
            String userKeycloakId,
            String email,
            UpdateMyAvailabilityStatusRequest request
    );

    EmployeeResponse updateCurrentProfile(
            String userKeycloakId,
            String email,
            UpdateMyProfileRequest request
    );

    EmployeeResponse updateCurrentProfilePhoto(
            String userKeycloakId,
            String email,
            MultipartFile file
    );

    EmployeeResponse createEmployee(CreateEmployeeRequest request);

    EmployeeResponse updateEmployee(Long id, UpdateEmployeeRequest request);

    EmployeeResponse updateEmployeeStatus(Long id, UpdateEmployeeStatusRequest request);

    EmployeeResponse updateEmployeeBannette(
            Long id,
            UpdateEmployeeBannetteRequest request,
            String requesterKeycloakId,
            boolean globalAccess
    );

    EmployeeResponse updateEmployeeDepartment(Long id, UpdateEmployeeDepartmentRequest request);

    EmployeeResponse linkEmployeeUser(Long id, LinkEmployeeUserRequest request);

    EmployeeResponse updateEmployeeManager(Long id, UpdateEmployeeManagerRequest request);

    EmployeeImportPreviewResponse previewImport(MultipartFile file) throws IOException;

    List<EmployeeResponse> confirmImport(ConfirmEmployeeImportRequest request);
}
