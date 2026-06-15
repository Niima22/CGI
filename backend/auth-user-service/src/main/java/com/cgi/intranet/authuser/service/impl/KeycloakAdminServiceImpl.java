package com.cgi.intranet.authuser.service.impl;

import com.cgi.intranet.authuser.config.KeycloakAdminProperties;
import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.enums.Role;
import com.cgi.intranet.authuser.service.KeycloakAdminService;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Service
public class KeycloakAdminServiceImpl implements KeycloakAdminService {

    private final KeycloakAdminProperties properties;
    private final RestClient restClient;

    public KeycloakAdminServiceImpl(KeycloakAdminProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        this.restClient = builder.baseUrl(properties.authServerUrl()).build();
    }

    @Override
    public String createUser(CreateUserRequest request) {
        String accessToken = getAdminAccessToken();
        List<KeycloakUser> existingUsers = findUsersByEmail(request.email(), accessToken);
        if (!existingUsers.isEmpty()) {
            KeycloakUser existingUser = existingUsers.get(0);
            updateUser(existingUser.id(), request, accessToken);
            return existingUser.id();
        }

        URI location = restClient.post()
                .uri("/admin/realms/{realm}/users", properties.realm())
                .headers(headers -> setBearer(headers, accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(toUserRepresentation(request, true))
                .retrieve()
                .toBodilessEntity()
                .getHeaders()
                .getLocation();

        if (location != null && location.getPath() != null) {
            return location.getPath().substring(location.getPath().lastIndexOf('/') + 1);
        }

        return findUsersByEmail(request.email(), accessToken).stream()
                .findFirst()
                .map(KeycloakUser::id)
                .orElseThrow(() -> new IllegalStateException("Keycloak user was created without an ID"));
    }

    @Override
    public void assignRealmRole(String keycloakUserId, Role role) {
        String accessToken = getAdminAccessToken();
        Map<String, Object> roleRepresentation = restClient.get()
                .uri("/admin/realms/{realm}/roles/{role}", properties.realm(), role.name())
                .headers(headers -> setBearer(headers, accessToken))
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });

        if (roleRepresentation == null) {
            throw new IllegalStateException("Keycloak realm role not found: " + role.name());
        }

        restClient.post()
                .uri(
                        "/admin/realms/{realm}/users/{userId}/role-mappings/realm",
                        properties.realm(),
                        keycloakUserId
                )
                .headers(headers -> setBearer(headers, accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(List.of(roleRepresentation))
                .retrieve()
                .toBodilessEntity();
    }

    private String getAdminAccessToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", properties.adminClientId());
        form.add("grant_type", "password");
        form.add("username", properties.adminUsername());
        form.add("password", properties.adminPassword());

        AdminTokenResponse response = restClient.post()
                .uri(
                        "/realms/{adminRealm}/protocol/openid-connect/token",
                        properties.adminRealm()
                )
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(AdminTokenResponse.class);

        if (response == null || response.accessToken() == null || response.accessToken().isBlank()) {
            throw new IllegalStateException("Keycloak admin token response did not contain an access token");
        }
        return response.accessToken();
    }

    private List<KeycloakUser> findUsersByEmail(String email, String accessToken) {
        List<KeycloakUser> users = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/admin/realms/{realm}/users")
                        .queryParam("email", email)
                        .queryParam("exact", true)
                        .build(properties.realm()))
                .headers(headers -> setBearer(headers, accessToken))
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
        return users == null ? List.of() : users;
    }

    private void updateUser(String userId, CreateUserRequest request, String accessToken) {
        restClient.put()
                .uri("/admin/realms/{realm}/users/{userId}", properties.realm(), userId)
                .headers(headers -> setBearer(headers, accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(toUserRepresentation(request, false))
                .retrieve()
                .toBodilessEntity();
    }

    private Map<String, Object> toUserRepresentation(
            CreateUserRequest request,
            boolean includeCredential
    ) {
        NameParts name = splitName(request.fullName());
        Map<String, Object> user = new java.util.LinkedHashMap<>();
        user.put("username", request.email());
        user.put("email", request.email());
        user.put("firstName", name.firstName());
        user.put("lastName", name.lastName());
        user.put("emailVerified", true);
        user.put("enabled", request.active());
        if (includeCredential) {
            user.put("credentials", List.of(Map.of(
                    "type", "password",
                    "value", request.temporaryPassword(),
                    "temporary", false
            )));
        }
        return user;
    }

    private NameParts splitName(String fullName) {
        String[] parts = fullName.trim().split("\\s+", 2);
        return new NameParts(parts[0], parts.length > 1 ? parts[1] : "");
    }

    private void setBearer(HttpHeaders headers, String accessToken) {
        headers.setBearerAuth(accessToken);
    }

    private record AdminTokenResponse(
            @com.fasterxml.jackson.annotation.JsonProperty("access_token") String accessToken
    ) {
    }

    private record KeycloakUser(String id, String email, String username) {
    }

    private record NameParts(String firstName, String lastName) {
    }
}
