package com.cgi.intranet.employee.security;

import com.cgi.intranet.employee.controller.EmployeeController;
import com.cgi.intranet.employee.dto.response.EmployeeResponse;
import com.cgi.intranet.employee.enums.AvailabilityStatus;
import com.cgi.intranet.employee.enums.EmployeeStatus;
import com.cgi.intranet.employee.service.EmployeeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = EmployeeController.class)
@Import(SecurityConfig.class)
class EmployeeEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EmployeeService employeeService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void availabilityStatusUpdateRequiresAuthentication() throws Exception {
        mockMvc.perform(patch("/api/employees/me/availability-status")
                        .contentType("application/json")
                        .content("{\"availabilityStatus\":\"AVAILABLE\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminManagerAndEmployeeCanUpdateOwnAvailabilityStatus() throws Exception {
        when(employeeService.updateCurrentAvailabilityStatus(anyString(), anyString(), any()))
                .thenReturn(employeeResponse(AvailabilityStatus.AVAILABLE));

        mockMvc.perform(patch("/api/employees/me/availability-status")
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("admin-id")
                                        .claim("email", "admin@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("ADMIN"))))
                                .authorities(() -> "ROLE_ADMIN"))
                        .contentType("application/json")
                        .content("{\"availabilityStatus\":\"AVAILABLE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availabilityStatus").value("AVAILABLE"));

        mockMvc.perform(patch("/api/employees/me/availability-status")
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("manager-id")
                                        .claim("email", "manager@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("MANAGER"))))
                                .authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content("{\"availabilityStatus\":\"AVAILABLE\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/employees/me/availability-status")
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("employee-id")
                                        .claim("email", "employee@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("EMPLOYEE"))))
                                .authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content("{\"availabilityStatus\":\"AVAILABLE\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void invalidAvailabilityStatusIsRejected() throws Exception {
        mockMvc.perform(patch("/api/employees/me/availability-status")
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("employee-id")
                                        .claim("email", "employee@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("EMPLOYEE"))))
                                .authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content("{\"availabilityStatus\":\"UNKNOWN\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void profileUpdateRequiresAuthentication() throws Exception {
        mockMvc.perform(patch("/api/employees/me/profile")
                        .contentType("application/json")
                        .content("{\"phone\":\"0600000000\",\"address\":\"123 Main St\",\"bio\":\"Bio\",\"profilePhotoUrl\":\"https://example.com/avatar.jpg\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedUserCanUpdateOwnProfile() throws Exception {
        when(employeeService.updateCurrentProfile(anyString(), anyString(), any()))
                .thenReturn(employeeResponse(AvailabilityStatus.AVAILABLE));

        mockMvc.perform(patch("/api/employees/me/profile")
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("employee-id")
                                        .claim("email", "employee@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("EMPLOYEE"))))
                                .authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content("{\"phone\":\"0600000000\",\"address\":\"123 Main St\",\"bio\":\"Bio\",\"profilePhotoUrl\":\"https://example.com/avatar.jpg\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.profilePhotoUrl").value("https://example.com/avatar.jpg"));
    }

    @Test
    void employeeCannotAccessDepartmentManagementEndpoints() throws Exception {
        mockMvc.perform(get("/api/departments")
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("employee-id")
                                        .claim("email", "employee@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("EMPLOYEE"))))
                                .authorities(() -> "ROLE_EMPLOYEE")))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/departments")
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("employee-id")
                                        .claim("email", "employee@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("EMPLOYEE"))))
                                .authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content("{\"name\":\"Support\",\"description\":\"Support department\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCannotManageDepartmentsOrAssignEmployeeDepartment() throws Exception {
        mockMvc.perform(post("/api/departments")
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("manager-id")
                                        .claim("email", "manager@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("MANAGER"))))
                                .authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content("{\"name\":\"Support\",\"description\":\"Support department\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/employees/1/department")
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("manager-id")
                                        .claim("email", "manager@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("MANAGER"))))
                                .authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content("{\"departmentId\":5}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void profilePhotoUploadRequiresAuthentication() throws Exception {
        mockMvc.perform(multipart("/api/employees/me/profile-photo")
                        .file("file", new byte[] {1, 2, 3}))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void profilePhotoStaticPathIsPublic() throws Exception {
        mockMvc.perform(get("/uploads/profiles/test.png"))
                .andExpect(status().isNotFound());
    }

    @Test
    void authenticatedUserCanUploadProfilePhoto() throws Exception {
        when(employeeService.updateCurrentProfilePhoto(anyString(), anyString(), any()))
                .thenReturn(employeeResponse(AvailabilityStatus.AVAILABLE));

        mockMvc.perform(multipart("/api/employees/me/profile-photo")
                        .file("file", "png".getBytes())
                        .with(jwt().jwt(jwt -> jwt
                                        .subject("employee-id")
                                        .claim("email", "employee@test.com")
                                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("EMPLOYEE"))))
                                .authorities(() -> "ROLE_EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePhotoUrl").value("https://example.com/avatar.jpg"));
    }

    private EmployeeResponse employeeResponse(AvailabilityStatus availabilityStatus) {
        return new EmployeeResponse(
                1L,
                "employee-id",
                "Employee User",
                "employee@test.com",
                "Developer",
                "Engineering",
                "FO",
                null,
                null,
                "manager-id",
                "0600000000",
                "123 Main St",
                "Bio",
                "https://example.com/avatar.jpg",
                0.0,
                0.0,
                EmployeeStatus.ACTIVE,
                availabilityStatus,
                LocalDateTime.parse("2026-06-23T11:00:00"),
                LocalDateTime.parse("2026-06-23T11:00:00")
        );
    }
}
