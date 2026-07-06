package com.cgi.intranet.employee.security;

import com.cgi.intranet.employee.controller.DepartmentController;
import com.cgi.intranet.employee.dto.response.DepartmentResponse;
import com.cgi.intranet.employee.service.DepartmentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DepartmentController.class)
@Import(SecurityConfig.class)
class DepartmentEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DepartmentService departmentService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void adminCanCreateAndUpdateDepartment() throws Exception {
        when(departmentService.getDepartments(true)).thenReturn(List.of(response()));
        when(departmentService.createDepartment(org.mockito.ArgumentMatchers.any())).thenReturn(response());
        when(departmentService.updateDepartment(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(response());
        when(departmentService.updateDepartmentStatus(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.any()))
                .thenReturn(response());

        mockMvc.perform(get("/api/departments")
                        .with(adminJwt()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/departments")
                        .with(adminJwt())
                        .contentType("application/json")
                        .content("{\"name\":\"Support\",\"description\":\"Support department\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(patch("/api/departments/1")
                        .with(adminJwt())
                        .contentType("application/json")
                        .content("{\"name\":\"Support\",\"description\":\"Updated\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/departments/1/status")
                        .with(adminJwt())
                        .contentType("application/json")
                        .content("{\"active\":false}"))
                .andExpect(status().isOk());
    }

    @Test
    void managerCanReadButCannotManageDepartments() throws Exception {
        when(departmentService.getDepartments(true)).thenReturn(List.of(response()));

        mockMvc.perform(get("/api/departments").with(managerJwt()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/departments")
                        .with(managerJwt())
                        .contentType("application/json")
                        .content("{\"name\":\"Support\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void employeeCannotAccessDepartmentEndpoints() throws Exception {
        mockMvc.perform(get("/api/departments").with(employeeJwt()))
                .andExpect(status().isForbidden());
    }

    private static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor adminJwt() {
        return jwt().jwt(jwt -> jwt
                        .subject("admin-id")
                        .claim("email", "admin@test.com")
                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("ADMIN"))))
                .authorities(() -> "ROLE_ADMIN");
    }

    private static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor managerJwt() {
        return jwt().jwt(jwt -> jwt
                        .subject("manager-id")
                        .claim("email", "manager@test.com")
                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("MANAGER"))))
                .authorities(() -> "ROLE_MANAGER");
    }

    private static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor employeeJwt() {
        return jwt().jwt(jwt -> jwt
                        .subject("employee-id")
                        .claim("email", "employee@test.com")
                        .claim("realm_access", java.util.Map.of("roles", java.util.List.of("EMPLOYEE"))))
                .authorities(() -> "ROLE_EMPLOYEE");
    }

    private DepartmentResponse response() {
        return new DepartmentResponse(
                1L,
                "Support",
                "Support department",
                true,
                "manager-1",
                LocalDateTime.parse("2026-06-24T09:00:00"),
                LocalDateTime.parse("2026-06-24T09:00:00")
        );
    }
}
