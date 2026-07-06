package com.cgi.intranet.authuser.dto.response;

import com.cgi.intranet.authuser.enums.Role;

public record MessagingDirectoryUserResponse(
        Long id,
        String fullName,
        String email,
        Role role
) {
}
