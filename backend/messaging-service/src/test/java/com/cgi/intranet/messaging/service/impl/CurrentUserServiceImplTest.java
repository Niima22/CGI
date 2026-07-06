package com.cgi.intranet.messaging.service.impl;

import com.cgi.intranet.messaging.client.AuthUserClient;
import com.cgi.intranet.messaging.service.CurrentUserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrentUserServiceImplTest {

    @Mock
    private AuthUserClient authUserClient;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void resolvesCurrentUserFromJwtAndAuthUserProfile() {
        CurrentUserServiceImpl service = new CurrentUserServiceImpl(authUserClient);
        Jwt jwt = Jwt.withTokenValue("token-1")
                .header("alg", "none")
                .claim("preferred_username", "agent@cgi.local")
                .build();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(
                jwt,
                List.of(() -> "ROLE_EMPLOYEE", () -> "ROLE_MANAGER")
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        when(authUserClient.getCurrentUser("Bearer token-1"))
                .thenReturn(new AuthUserClient.AuthenticatedUserSnapshot(
                        "kc-1",
                        new AuthUserClient.UserProfileSnapshot(42L)
                ));

        CurrentUserService.CurrentUser currentUser = service.getCurrentUser();

        assertThat(currentUser.userId()).isEqualTo(42L);
        assertThat(currentUser.keycloakId()).isEqualTo("kc-1");
        assertThat(currentUser.employee()).isTrue();
        assertThat(currentUser.manager()).isTrue();
        assertThat(currentUser.admin()).isFalse();
    }

    @Test
    void rejectsMissingAuthentication() {
        CurrentUserServiceImpl service = new CurrentUserServiceImpl(authUserClient);
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("user", "pwd"));

        assertThatThrownBy(service::getCurrentUser)
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("401 UNAUTHORIZED");
    }
}
