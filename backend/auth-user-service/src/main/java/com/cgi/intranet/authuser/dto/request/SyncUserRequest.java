package com.cgi.intranet.authuser.dto.request;

import com.cgi.intranet.authuser.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SyncUserRequest(
        @NotBlank String keycloakId,
        @NotBlank String fullName,
        @NotBlank @Email String email,
        @NotNull Role role
) {
}
