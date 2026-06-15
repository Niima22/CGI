package com.cgi.intranet.authuser.dto.response;

import java.util.List;

public record AuthenticatedUserResponse(
        String keycloakId,
        String email,
        String fullName,
        List<String> roles,
        UserProfileResponse localProfile
) {
}
