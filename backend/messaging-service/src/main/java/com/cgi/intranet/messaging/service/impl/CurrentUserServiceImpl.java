package com.cgi.intranet.messaging.service.impl;

import com.cgi.intranet.messaging.client.AuthUserClient;
import com.cgi.intranet.messaging.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurrentUserServiceImpl implements CurrentUserService {

    private final AuthUserClient authUserClient;

    public CurrentUserServiceImpl(AuthUserClient authUserClient) {
        this.authUserClient = authUserClient;
    }

    @Override
    public CurrentUser getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthenticationToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }

        String tokenValue = jwtAuthenticationToken.getToken().getTokenValue();
        AuthUserClient.AuthenticatedUserSnapshot snapshot =
                authUserClient.getCurrentUser("Bearer " + tokenValue);

        if (snapshot == null || snapshot.localProfile() == null || snapshot.localProfile().id() == null) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Current user is not linked to a local user profile"
            );
        }

        return new CurrentUser(
                snapshot.localProfile().id(),
                snapshot.keycloakId(),
                hasRole(authentication, "ADMIN"),
                hasRole(authentication, "MANAGER"),
                hasRole(authentication, "EMPLOYEE")
        );
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }
}
