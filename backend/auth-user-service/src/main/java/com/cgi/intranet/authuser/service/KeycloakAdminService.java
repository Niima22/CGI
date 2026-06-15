package com.cgi.intranet.authuser.service;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.enums.Role;

public interface KeycloakAdminService {

    String createUser(CreateUserRequest request);

    void assignRealmRole(String keycloakUserId, Role role);
}
