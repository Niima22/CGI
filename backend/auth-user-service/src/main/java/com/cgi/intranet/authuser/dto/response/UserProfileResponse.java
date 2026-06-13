package com.cgi.intranet.authuser.dto.response;

import com.cgi.intranet.authuser.enums.Role;

import java.time.LocalDateTime;

public record UserProfileResponse(
        Long id,
        String keycloakId,
        String fullName,
        String email,
        Role role,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
