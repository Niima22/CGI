package com.cgi.intranet.authuser.dto.response;

import com.cgi.intranet.authuser.enums.Role;

public record CurrentUserResponse(
        Long id,
        String keycloakId,
        String fullName,
        String email,
        Role role,
        boolean active
) {
}
