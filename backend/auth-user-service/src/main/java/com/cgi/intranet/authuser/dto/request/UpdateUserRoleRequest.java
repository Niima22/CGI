package com.cgi.intranet.authuser.dto.request;

import com.cgi.intranet.authuser.enums.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(
        @NotNull Role role
) {
}
