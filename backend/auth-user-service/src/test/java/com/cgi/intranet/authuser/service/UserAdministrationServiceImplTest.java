package com.cgi.intranet.authuser.service;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;
import com.cgi.intranet.authuser.enums.Role;
import com.cgi.intranet.authuser.service.impl.UserAdministrationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAdministrationServiceImplTest {

    @Mock
    private KeycloakAdminService keycloakAdminService;

    @Mock
    private UserProfileService userProfileService;

    @InjectMocks
    private UserAdministrationServiceImpl userAdministrationService;

    @Test
    void createsKeycloakUserAssignsRoleAndSyncsLocalProfile() {
        CreateUserRequest request = new CreateUserRequest(
                "New User",
                "new.user@test.com",
                Role.MANAGER,
                "Test1234",
                true
        );
        UserProfileResponse expected = new UserProfileResponse(
                10L,
                "keycloak-user-id",
                request.fullName(),
                request.email(),
                request.role(),
                request.active(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(keycloakAdminService.createUser(request)).thenReturn("keycloak-user-id");
        when(userProfileService.syncProvisionedUser("keycloak-user-id", request))
                .thenReturn(expected);

        UserProfileResponse result = userAdministrationService.createUser(request);

        assertThat(result).isEqualTo(expected);
        var ordered = inOrder(keycloakAdminService, userProfileService);
        ordered.verify(keycloakAdminService).createUser(request);
        ordered.verify(keycloakAdminService).assignRealmRole("keycloak-user-id", Role.MANAGER);
        ordered.verify(userProfileService).syncProvisionedUser("keycloak-user-id", request);
    }
}
