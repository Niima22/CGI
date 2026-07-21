package com.cgi.intranet.employee.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    @Test
    void convertsOnlyBusinessRealmRolesToSpringAuthorities() {
        Jwt jwt = new Jwt(
                "token-value",
                Instant.now(),
                Instant.now().plusSeconds(300),
                Map.of("alg", "none"),
                Map.of(
                        "sub", "keycloak-user-id",
                        "preferred_username", "agent@test.com",
                        "realm_access", Map.of("roles", List.of(
                                "EMPLOYEE",
                                "offline_access",
                                "default-roles-cgi-flow"
                        ))
                )
        );

        AbstractAuthenticationToken authentication =
                new SecurityConfig().keycloakJwtAuthenticationConverter().convert(jwt);

        assertThat(authentication).isNotNull();
        assertThat(authentication.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_EMPLOYEE");
    }
}
