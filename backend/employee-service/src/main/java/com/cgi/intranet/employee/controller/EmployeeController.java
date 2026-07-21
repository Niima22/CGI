package com.cgi.intranet.employee.controller;

import com.cgi.intranet.employee.dto.request.ConfirmEmployeeImportRequest;
import com.cgi.intranet.employee.dto.request.CreateEmployeeRequest;
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
import com.cgi.intranet.employee.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping
    public ResponseEntity<List<EmployeeResponse>> getAllEmployees(
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication
    ) {
        return ResponseEntity.ok(employeeService.getEmployeesForRequester(
                jwt.getSubject(),
                hasRole(authentication, "ADMIN")
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponse> getEmployeeById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication
    ) {
        return ResponseEntity.ok(employeeService.getEmployeeByIdForRequester(
                id,
                jwt.getSubject(),
                hasRole(authentication, "ADMIN")
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<EmployeeResponse> getCurrentEmployee(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(employeeService.getCurrentEmployee(
                jwt.getSubject(),
                jwt.getClaimAsString("email")
        ));
    }

    @PatchMapping("/me/availability-status")
    public ResponseEntity<EmployeeResponse> updateCurrentAvailabilityStatus(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateMyAvailabilityStatusRequest request
    ) {
        return ResponseEntity.ok(employeeService.updateCurrentAvailabilityStatus(
                jwt.getSubject(),
                jwt.getClaimAsString("email"),
                request
        ));
    }

    @PatchMapping("/me/profile")
    public ResponseEntity<EmployeeResponse> updateCurrentProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateMyProfileRequest request
    ) {
        return ResponseEntity.ok(employeeService.updateCurrentProfile(
                jwt.getSubject(),
                jwt.getClaimAsString("email"),
                request
        ));
    }

    @PostMapping("/me/profile-photo")
    public ResponseEntity<EmployeeResponse> uploadCurrentProfilePhoto(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(employeeService.updateCurrentProfilePhoto(
                jwt.getSubject(),
                jwt.getClaimAsString("email"),
                file
        ));
    }

    @PostMapping
    public ResponseEntity<EmployeeResponse> createEmployee(@Valid @RequestBody CreateEmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(employeeService.createEmployee(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponse> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployeeRequest request
    ) {
        return ResponseEntity.ok(employeeService.updateEmployee(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<EmployeeResponse> updateEmployeeStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployeeStatusRequest request
    ) {
        return ResponseEntity.ok(employeeService.updateEmployeeStatus(id, request));
    }

    @PatchMapping("/{id}/availability-status")
    public ResponseEntity<EmployeeResponse> updateEmployeeAvailabilityStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMyAvailabilityStatusRequest request
    ) {
        return ResponseEntity.ok(employeeService.updateEmployeeAvailabilityStatus(id, request));
    }

    @PatchMapping("/{id}/bannette")
    public ResponseEntity<EmployeeResponse> updateEmployeeBannette(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployeeBannetteRequest request,
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication
    ) {
        return ResponseEntity.ok(employeeService.updateEmployeeBannette(
                id,
                request,
                jwt.getSubject(),
                hasRole(authentication, "ADMIN")
        ));
    }

    @PatchMapping("/{id}/department")
    public ResponseEntity<EmployeeResponse> updateEmployeeDepartment(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployeeDepartmentRequest request
    ) {
        return ResponseEntity.ok(employeeService.updateEmployeeDepartment(id, request));
    }

    @PatchMapping("/{id}/link-user")
    public ResponseEntity<EmployeeResponse> linkEmployeeUser(
            @PathVariable Long id,
            @Valid @RequestBody LinkEmployeeUserRequest request
    ) {
        return ResponseEntity.ok(employeeService.linkEmployeeUser(id, request));
    }

    @PatchMapping("/{id}/manager")
    public ResponseEntity<EmployeeResponse> updateEmployeeManager(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployeeManagerRequest request
    ) {
        return ResponseEntity.ok(employeeService.updateEmployeeManager(id, request));
    }

    @PostMapping("/import/preview")
    public ResponseEntity<EmployeeImportPreviewResponse> previewImport(
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        return ResponseEntity.ok(employeeService.previewImport(file));
    }

    @PostMapping("/import/confirm")
    public ResponseEntity<List<EmployeeResponse>> confirmImport(
            @Valid @RequestBody ConfirmEmployeeImportRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.confirmImport(request));
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }
}
