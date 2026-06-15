package com.cgi.intranet.authuser.service.impl;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;
import com.cgi.intranet.authuser.service.KeycloakAdminService;
import com.cgi.intranet.authuser.service.UserAdministrationService;
import com.cgi.intranet.authuser.service.UserProfileService;
import org.springframework.stereotype.Service;

@Service
public class UserAdministrationServiceImpl implements UserAdministrationService {

    private final KeycloakAdminService keycloakAdminService;
    private final UserProfileService userProfileService;

    public UserAdministrationServiceImpl(
            KeycloakAdminService keycloakAdminService,
            UserProfileService userProfileService
    ) {
        this.keycloakAdminService = keycloakAdminService;
        this.userProfileService = userProfileService;
    }

    @Override
    public UserProfileResponse createUser(CreateUserRequest request) {
        String keycloakUserId = keycloakAdminService.createUser(request);
        keycloakAdminService.assignRealmRole(keycloakUserId, request.role());
        return userProfileService.syncProvisionedUser(keycloakUserId, request);
    }
}
