package com.cgi.intranet.authuser.security;

import com.cgi.intranet.authuser.controller.HealthController;
import com.cgi.intranet.authuser.controller.UserProfileController;
import com.cgi.intranet.authuser.service.AuditLogService;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;
import com.cgi.intranet.authuser.enums.AccountStatus;
import com.cgi.intranet.authuser.enums.Role;
import com.cgi.intranet.authuser.service.UserAdministrationService;
import com.cgi.intranet.authuser.service.UserProfileService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {HealthController.class, UserProfileController.class})
@Import(SecurityConfig.class)
class AuthEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserProfileService userProfileService;

    @MockitoBean
    private UserAdministrationService userAdministrationService;

    @MockitoBean
    private AuditLogService auditLogService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/api/auth/health"))
                .andExpect(status().isOk());
    }

    @Test
    void meRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void devMeEndpointIsUnavailableWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/auth/me/dev/keycloak-user-id"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meReturnsJwtIdentityAndRoles() throws Exception {
        when(userProfileService.findUserProfile(anyString(), anyString()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/me").with(jwt()
                        .jwt(jwt -> jwt
                                .subject("keycloak-user-id")
                                .claim("email", "admin@test.com")
                                .claim("name", "Admin User")
                                .claim("preferred_username", "admin@test.com")
                                .claim("realm_access", Map.of("roles", List.of("ADMIN", "offline_access"))))
                        .authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keycloakId").value("keycloak-user-id"))
                .andExpect(jsonPath("$.email").value("admin@test.com"))
                .andExpect(jsonPath("$.fullName").value("Admin User"))
                .andExpect(jsonPath("$.roles[0]").value("ADMIN"))
                .andExpect(jsonPath("$.roles.length()").value(1))
                .andExpect(jsonPath("$.primaryRole").value("ADMIN"))
                .andExpect(jsonPath("$.accountStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.localProfileLinked").value(false))
                .andExpect(jsonPath("$.warnings[0]").value("LOCAL_PROFILE_MISSING"))
                .andExpect(jsonPath("$.localProfile").isEmpty());
    }

    @Test
    void managerCanAccessMe() throws Exception {
        when(userProfileService.findUserProfile(anyString(), anyString()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/me").with(jwt()
                        .jwt(jwt -> jwt
                                .subject("manager-keycloak-id")
                                .claim("email", "manager@test.com")
                                .claim("name", "Manager User")
                                .claim("realm_access", Map.of("roles", List.of("MANAGER"))))
                        .authorities(() -> "ROLE_MANAGER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryRole").value("MANAGER"));
    }

    @Test
    void employeeCanAccessMe() throws Exception {
        when(userProfileService.findUserProfile(anyString(), anyString()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/me").with(jwt()
                        .jwt(jwt -> jwt
                                .subject("employee-keycloak-id")
                                .claim("email", "employee@test.com")
                                .claim("name", "Employee User")
                                .claim("realm_access", Map.of("roles", List.of("EMPLOYEE"))))
                        .authorities(() -> "ROLE_EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryRole").value("EMPLOYEE"));
    }

    @Test
    void meIncludesLocalProfileWhenPresent() throws Exception {
        when(userProfileService.findUserProfile(anyString(), anyString()))
                .thenReturn(Optional.of(new UserProfileResponse(
                        12L,
                        "keycloak-user-id",
                        "Manager User",
                        "manager@test.com",
                        Role.MANAGER,
                        true,
                        AccountStatus.ACTIVE,
                        LocalDateTime.parse("2026-06-23T10:15:30"),
                        LocalDateTime.parse("2026-06-23T10:20:30")
                )));

        mockMvc.perform(get("/api/auth/me").with(jwt()
                        .jwt(jwt -> jwt
                                .subject("keycloak-user-id")
                                .claim("email", "manager@test.com")
                                .claim("name", "Manager User")
                                .claim("realm_access", Map.of("roles", List.of("MANAGER", "offline_access"))))
                        .authorities(() -> "ROLE_MANAGER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[0]").value("MANAGER"))
                .andExpect(jsonPath("$.primaryRole").value("MANAGER"))
                .andExpect(jsonPath("$.accountStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.localProfileLinked").value(true))
                .andExpect(jsonPath("$.warnings.length()").value(0))
                .andExpect(jsonPath("$.localProfile.id").value(12))
                .andExpect(jsonPath("$.localProfile.role").value("MANAGER"))
                .andExpect(jsonPath("$.localProfile.active").value(true))
                .andExpect(jsonPath("$.localProfile.accountStatus").value("ACTIVE"));
    }

    @Test
    void meRejectsInactiveLocalProfile() throws Exception {
        when(userProfileService.findUserProfile(anyString(), anyString()))
                .thenReturn(Optional.of(new UserProfileResponse(
                        12L,
                        "keycloak-user-id",
                        "Inactive User",
                        "inactive@test.com",
                        Role.EMPLOYEE,
                        false,
                        AccountStatus.INACTIVE,
                        LocalDateTime.parse("2026-06-23T10:15:30"),
                        LocalDateTime.parse("2026-06-23T10:20:30")
                )));

        mockMvc.perform(get("/api/auth/me").with(jwt()
                        .jwt(jwt -> jwt
                                .subject("keycloak-user-id")
                                .claim("email", "inactive@test.com")
                                .claim("name", "Inactive User")
                                .claim("realm_access", Map.of("roles", List.of("EMPLOYEE"))))
                        .authorities(() -> "ROLE_EMPLOYEE")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_INACTIVE"))
                .andExpect(jsonPath("$.message").value("Current user profile is inactive."));
    }

    @Test
    void employeeCannotListUsers() throws Exception {
        mockMvc.perform(get("/api/auth/users").with(jwt().authorities(() -> "ROLE_EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void employeeCannotListAuditLogs() throws Exception {
        mockMvc.perform(get("/api/auth/audit-logs").with(jwt().authorities(() -> "ROLE_EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCannotListUsers() throws Exception {
        mockMvc.perform(get("/api/auth/users").with(jwt().authorities(() -> "ROLE_MANAGER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCannotListAuditLogs() throws Exception {
        mockMvc.perform(get("/api/auth/audit-logs").with(jwt().authorities(() -> "ROLE_MANAGER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCannotAccessAdminUserManagementEndpoints() throws Exception {
        mockMvc.perform(get("/api/auth/users/1").with(jwt().authorities(() -> "ROLE_MANAGER")))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/auth/users")
                        .with(jwt().authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "New User",
                                  "email": "new.user@test.com",
                                  "role": "EMPLOYEE",
                                  "temporaryPassword": "Test1234",
                                  "active": true
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/auth/users/sync")
                        .with(jwt().authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "keycloakId": "keycloak-user-id",
                                  "fullName": "Existing User",
                                  "email": "existing.user@test.com",
                                  "role": "EMPLOYEE"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/auth/users/1/role")
                        .with(jwt().authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content("{\"role\":\"EMPLOYEE\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/auth/users/1/status")
                        .with(jwt().authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content("{\"active\":true}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/auth/users/1/password")
                        .with(jwt().authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content("{\"temporaryPassword\":\"Temp1234!\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/auth/users/1")
                        .with(jwt().authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void authenticatedUsersCannotAccessDevMeEndpoint() throws Exception {
        mockMvc.perform(get("/api/auth/me/dev/keycloak-user-id")
                        .with(jwt().authorities(() -> "ROLE_EMPLOYEE")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/auth/me/dev/keycloak-user-id")
                        .with(jwt().authorities(() -> "ROLE_MANAGER")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/auth/me/dev/keycloak-user-id")
                        .with(jwt().authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isForbidden());
    }

    @Test
    void employeeCannotAccessAdminUserManagementEndpoints() throws Exception {
        String request = """
                {
                  "fullName": "New User",
                  "email": "new.user@test.com",
                  "role": "EMPLOYEE",
                  "temporaryPassword": "Test1234",
                  "active": true
                }
                """;

        mockMvc.perform(get("/api/auth/users/1").with(jwt().authorities(() -> "ROLE_EMPLOYEE")))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/auth/users")
                        .with(jwt().authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content(request))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/auth/users/sync")
                        .with(jwt().authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "keycloakId": "keycloak-user-id",
                                  "fullName": "Existing User",
                                  "email": "existing.user@test.com",
                                  "role": "EMPLOYEE"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/auth/users/1/role")
                        .with(jwt().authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content("{\"role\":\"MANAGER\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/auth/users/1/status")
                        .with(jwt().authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content("{\"active\":false}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/auth/users/1/password")
                        .with(jwt().authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content("{\"temporaryPassword\":\"Temp1234!\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/auth/users/1")
                        .with(jwt().authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanAccessEveryAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/auth/users")
                        .with(jwt().authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/audit-logs")
                        .with(jwt().authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/users/1")
                        .with(jwt().authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/users")
                        .with(jwt().authorities(() -> "ROLE_ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "New User",
                                  "email": "new.user@test.com",
                                  "role": "EMPLOYEE",
                                  "temporaryPassword": "Test1234",
                                  "active": true
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/users/sync")
                        .with(jwt().authorities(() -> "ROLE_ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "keycloakId": "keycloak-user-id",
                                  "fullName": "Existing User",
                                  "email": "existing.user@test.com",
                                  "role": "EMPLOYEE"
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(patch("/api/auth/users/1/role")
                        .with(jwt().authorities(() -> "ROLE_ADMIN"))
                        .contentType("application/json")
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/auth/users/1/status")
                        .with(jwt().authorities(() -> "ROLE_ADMIN"))
                        .contentType("application/json")
                        .content("{\"active\":true}"))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/auth/users/1/password")
                        .with(jwt().authorities(() -> "ROLE_ADMIN"))
                        .contentType("application/json")
                        .content("{\"temporaryPassword\":\"Temp1234!\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(put("/api/auth/users/1")
                        .with(jwt().authorities(() -> "ROLE_ADMIN"))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void unauthenticatedCannotAccessProtectedEndpoints() throws Exception {
        mockMvc.perform(get("/api/auth/users"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/auth/audit-logs"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/auth/users/1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/users")
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "New User",
                                  "email": "new.user@test.com",
                                  "role": "EMPLOYEE",
                                  "temporaryPassword": "Test1234",
                                  "active": true
                                }
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/users/sync")
                        .contentType("application/json")
                        .content("""
                                {
                                  "keycloakId": "keycloak-user-id",
                                  "fullName": "Existing User",
                                  "email": "existing.user@test.com",
                                  "role": "EMPLOYEE"
                                }
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/auth/users/1/role")
                        .contentType("application/json")
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/auth/users/1/status")
                        .contentType("application/json")
                        .content("{\"active\":true}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/auth/users/1/password")
                        .contentType("application/json")
                        .content("{\"temporaryPassword\":\"Temp1234!\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/auth/users/1")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
