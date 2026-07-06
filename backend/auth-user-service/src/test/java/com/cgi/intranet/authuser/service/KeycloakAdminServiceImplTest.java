package com.cgi.intranet.authuser.service;

import com.cgi.intranet.authuser.config.KeycloakAdminProperties;
import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.enums.Role;
import com.cgi.intranet.authuser.service.impl.KeycloakAdminServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.net.URI;

class KeycloakAdminServiceImplTest {

    private static final String BASE_URL = "http://localhost:8085";
    private static final String ACCESS_TOKEN = "admin-token";

    private MockRestServiceServer server;
    private KeycloakAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new KeycloakAdminServiceImpl(
                new KeycloakAdminProperties(
                        BASE_URL,
                        "cgi-flow",
                        "master",
                        "admin-cli",
                        "admin",
                        "admin"
                ),
                builder
        );
    }

    @Test
    void assignRealmRoleRemovesExistingBusinessRolesBeforeAssigningRequestedRole() {
        expectAdminToken();
        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users/keycloak-user-id/role-mappings/realm"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andRespond(withSuccess("""
                        [
                          {"id":"r1","name":"EMPLOYEE"},
                          {"id":"r2","name":"MANAGER"},
                          {"id":"r3","name":"offline_access"}
                        ]
                        """, MediaType.APPLICATION_JSON));

        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users/keycloak-user-id/role-mappings/realm"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        [
                          {"id":"r1","name":"EMPLOYEE"},
                          {"id":"r2","name":"MANAGER"}
                        ]
                        """, true))
                .andRespond(withSuccess());

        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/roles/ADMIN"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andRespond(withSuccess("""
                        {"id":"r4","name":"ADMIN"}
                        """, MediaType.APPLICATION_JSON));

        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users/keycloak-user-id/role-mappings/realm"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        [
                          {"id":"r4","name":"ADMIN"}
                        ]
                        """, true))
                .andRespond(withSuccess());

        service.assignRealmRole("keycloak-user-id", Role.ADMIN);

        server.verify();
    }

    @Test
    void updateUserEnabledSendsEnabledStateToKeycloak() {
        expectAdminToken();
        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users/keycloak-user-id"))
                .andExpect(method(HttpMethod.PUT))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        {"enabled":false}
                        """, true))
                .andRespond(withSuccess());

        service.updateUserEnabled("keycloak-user-id", false);

        server.verify();
    }

    @Test
    void resetTemporaryPasswordSendsTemporaryFlagToKeycloak() {
        expectAdminToken();
        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users/keycloak-user-id/reset-password"))
                .andExpect(method(HttpMethod.PUT))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        {
                          "type":"password",
                          "value":"Temp1234!",
                          "temporary":true
                        }
                        """, true))
                .andRespond(withSuccess());

        service.resetTemporaryPassword("keycloak-user-id", "Temp1234!");

        server.verify();
    }

    @Test
    void createUserSendsTemporaryCredentialForNewUser() {
        CreateUserRequest request = new CreateUserRequest(
                "New User",
                "new.user@test.com",
                Role.EMPLOYEE,
                "Temp1234!",
                true
        );

        expectAdminToken();
        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users?email=new.user@test.com&exact=true"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        {
                          "username":"new.user@test.com",
                          "email":"new.user@test.com",
                          "firstName":"New",
                          "lastName":"User",
                          "emailVerified":true,
                          "enabled":true,
                          "credentials":[
                            {
                              "type":"password",
                              "value":"Temp1234!",
                              "temporary":true
                            }
                          ]
                        }
                        """, true))
                .andRespond(withSuccess().location(URI.create(BASE_URL + "/admin/realms/cgi-flow/users/keycloak-user-id")));

        String userId = service.createUser(request);

        org.junit.jupiter.api.Assertions.assertEquals("keycloak-user-id", userId);
        server.verify();
    }

    @Test
    void createUserResetsTemporaryPasswordWhenUserAlreadyExists() {
        CreateUserRequest request = new CreateUserRequest(
                "Existing User",
                "existing.user@test.com",
                Role.MANAGER,
                "Temp1234!",
                false
        );

        expectAdminToken();
        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users?email=existing.user@test.com&exact=true"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andRespond(withSuccess("""
                        [
                          {"id":"existing-user-id","email":"existing.user@test.com","username":"existing.user@test.com"}
                        ]
                        """, MediaType.APPLICATION_JSON));

        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users/existing-user-id"))
                .andExpect(method(HttpMethod.PUT))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        {
                          "username":"existing.user@test.com",
                          "email":"existing.user@test.com",
                          "firstName":"Existing",
                          "lastName":"User",
                          "emailVerified":true,
                          "enabled":false
                        }
                        """, true))
                .andRespond(withSuccess());

        server.expect(requestTo(BASE_URL + "/admin/realms/cgi-flow/users/existing-user-id/reset-password"))
                .andExpect(method(HttpMethod.PUT))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("""
                        {
                          "type":"password",
                          "value":"Temp1234!",
                          "temporary":true
                        }
                        """, true))
                .andRespond(withSuccess());

        String userId = service.createUser(request);

        org.junit.jupiter.api.Assertions.assertEquals("existing-user-id", userId);
        server.verify();
    }

    private void expectAdminToken() {
        server.expect(requestTo(BASE_URL + "/realms/master/protocol/openid-connect/token"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"access_token":"%s"}
                        """.formatted(ACCESS_TOKEN), MediaType.APPLICATION_JSON));
    }
}
