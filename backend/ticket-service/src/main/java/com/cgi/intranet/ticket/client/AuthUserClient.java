package com.cgi.intranet.ticket.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AuthUserClient {

    private final RestClient restClient;

    public AuthUserClient(
            RestClient.Builder builder,
            @Value("${services.auth-user.base-url}") String authUserBaseUrl
    ) {
        this.restClient = builder.baseUrl(authUserBaseUrl).build();
    }

    public AuthenticatedUserSnapshot getCurrentUser(String bearerToken) {
        try {
            return restClient.get()
                    .uri("/api/auth/me")
                    .header(HttpHeaders.AUTHORIZATION, bearerToken)
                    .retrieve()
                    .body(AuthenticatedUserSnapshot.class);
        } catch (org.springframework.web.client.HttpStatusCodeException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to resolve current user from auth-user-service",
                    exception
            );
        }
    }

    public record AuthenticatedUserSnapshot(
            String keycloakId,
            UserProfileSnapshot localProfile
    ) {
    }

    public record UserProfileSnapshot(
            Long id
    ) {
    }
}
