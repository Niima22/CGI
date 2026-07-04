package com.cgi.intranet.authuser.dto.request;

import com.cgi.intranet.authuser.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        @NotNull Role role,
        @NotBlank
        @Size(min = 12, message = "Le mot de passe doit contenir au moins 12 caracteres.")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
                message = "Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractere special."
        )
        String temporaryPassword,
        boolean active
) {
}
