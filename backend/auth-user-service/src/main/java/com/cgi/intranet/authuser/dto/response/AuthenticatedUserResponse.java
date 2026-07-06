package com.cgi.intranet.authuser.dto.response;

import com.cgi.intranet.authuser.enums.AccountStatus;
import com.cgi.intranet.authuser.enums.Role;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record AuthenticatedUserResponse(
        String keycloakId,
        String email,
        String fullName,
        List<Role> roles,
        Role primaryRole,
        AccountStatus accountStatus,
        boolean localProfileLinked,
        List<String> warnings,
        UserProfileResponse localProfile
) {
}
