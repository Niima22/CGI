package com.cgi.intranet.authuser.dto.request;

import com.cgi.intranet.authuser.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        @NotNull Role role,
        @NotBlank @Size(min = 8) String temporaryPassword,
        boolean active
) {
}
