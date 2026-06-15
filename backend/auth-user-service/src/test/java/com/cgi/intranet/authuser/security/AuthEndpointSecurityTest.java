package com.cgi.intranet.authuser.security;

import com.cgi.intranet.authuser.controller.HealthController;
import com.cgi.intranet.authuser.controller.UserProfileController;
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

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    void meReturnsJwtIdentityAndRoles() throws Exception {
        when(userProfileService.findUserProfile(anyString(), anyString()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/me").with(jwt()
                        .jwt(jwt -> jwt
                                .subject("keycloak-user-id")
                                .claim("email", "admin@test.com")
                                .claim("name", "Admin User")
                                .claim("preferred_username", "admin@test.com")
                                .claim("realm_access", Map.of("roles", List.of("ADMIN"))))
                        .authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keycloakId").value("keycloak-user-id"))
                .andExpect(jsonPath("$.email").value("admin@test.com"))
                .andExpect(jsonPath("$.fullName").value("Admin User"))
                .andExpect(jsonPath("$.roles[0]").value("ADMIN"))
                .andExpect(jsonPath("$.localProfile").doesNotExist());
    }

    @Test
    void employeeCannotListUsers() throws Exception {
        mockMvc.perform(get("/api/auth/users").with(jwt().authorities(() -> "ROLE_EMPLOYEE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCanListUsers() throws Exception {
        when(userProfileService.getAllUsers()).thenReturn(List.of());

        mockMvc.perform(get("/api/auth/users").with(jwt().authorities(() -> "ROLE_MANAGER")))
                .andExpect(status().isOk());
    }

    @Test
    void managerCannotPatchRoleOrStatus() throws Exception {
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
    }

    @Test
    void employeeAndManagerCannotCreateUsers() throws Exception {
        String request = """
                {
                  "fullName": "New User",
                  "email": "new.user@test.com",
                  "role": "EMPLOYEE",
                  "temporaryPassword": "Test1234",
                  "active": true
                }
                """;

        mockMvc.perform(post("/api/auth/users")
                        .with(jwt().authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType("application/json")
                        .content(request))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/auth/users")
                        .with(jwt().authorities(() -> "ROLE_MANAGER"))
                        .contentType("application/json")
                        .content(request))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanCreateUsers() throws Exception {
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
    }

    @Test
    void adminCanPatchRoleAndStatus() throws Exception {
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
    }
}
