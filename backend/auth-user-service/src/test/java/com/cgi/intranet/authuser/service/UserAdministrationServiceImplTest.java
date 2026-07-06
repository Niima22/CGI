package com.cgi.intranet.authuser.service;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.request.ResetPasswordRequest;
import com.cgi.intranet.authuser.dto.request.SyncUserRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserRoleRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserStatusRequest;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;
import com.cgi.intranet.authuser.enums.AuditAction;
import com.cgi.intranet.authuser.enums.AccountStatus;
import com.cgi.intranet.authuser.enums.Role;
import com.cgi.intranet.authuser.exception.KeycloakSyncException;
import com.cgi.intranet.authuser.exception.UserSynchronizationException;
import com.cgi.intranet.authuser.service.impl.UserAdministrationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAdministrationServiceImplTest {

    @Mock
    private KeycloakAdminService keycloakAdminService;

    @Mock
    private UserProfileService userProfileService;

    @Mock
    private AuditLogService auditLogService;

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
                AccountStatus.ACTIVE,
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
        verify(auditLogService).log(
                AuditAction.USER_CREATED,
                "new.user@test.com (id=10, keycloakId=keycloak-user-id)",
                null,
                "role=MANAGER, accountStatus=ACTIVE"
        );
    }

    @Test
    void syncUserStoresAuditEvent() {
        SyncUserRequest request = new SyncUserRequest(
                "keycloak-user-id",
                "Existing User",
                "existing.user@test.com",
                Role.EMPLOYEE
        );
        UserProfileResponse expected = new UserProfileResponse(
                15L,
                "keycloak-user-id",
                request.fullName(),
                request.email(),
                request.role(),
                true,
                AccountStatus.ACTIVE,
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(userProfileService.syncUser(request)).thenReturn(expected);

        UserProfileResponse result = userAdministrationService.syncUser(request);

        assertThat(result).isEqualTo(expected);
        verify(userProfileService).syncUser(request);
        verify(auditLogService).log(
                AuditAction.USER_SYNC_TRIGGERED,
                "existing.user@test.com (id=15, keycloakId=keycloak-user-id)",
                null,
                "role=EMPLOYEE, accountStatus=ACTIVE"
        );
    }

    @Test
    void updateRoleSynchronizesKeycloakBeforeLocalProfile() {
        UserProfileResponse current = new UserProfileResponse(
                10L,
                "keycloak-user-id",
                "Existing User",
                "existing.user@test.com",
                Role.EMPLOYEE,
                true,
                AccountStatus.ACTIVE,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        UserProfileResponse updated = new UserProfileResponse(
                10L,
                "keycloak-user-id",
                "Existing User",
                "existing.user@test.com",
                Role.MANAGER,
                true,
                AccountStatus.ACTIVE,
                current.createdAt(),
                LocalDateTime.now()
        );
        UpdateUserRoleRequest request = new UpdateUserRoleRequest(Role.MANAGER);

        when(userProfileService.getUserById(10L)).thenReturn(current);
        when(userProfileService.updateUserRole(10L, request)).thenReturn(updated);

        UserProfileResponse result = userAdministrationService.updateUserRole(10L, request);

        assertThat(result).isEqualTo(updated);
        var ordered = inOrder(userProfileService, keycloakAdminService);
        ordered.verify(userProfileService).getUserById(10L);
        ordered.verify(keycloakAdminService).assignRealmRole("keycloak-user-id", Role.MANAGER);
        ordered.verify(userProfileService).updateUserRole(10L, request);
        verify(auditLogService).log(
                AuditAction.USER_ROLE_CHANGED,
                "existing.user@test.com (id=10, keycloakId=keycloak-user-id)",
                "EMPLOYEE",
                "MANAGER"
        );
    }

    @Test
    void updateRoleDoesNotTouchLocalProfileWhenKeycloakFails() {
        UserProfileResponse current = new UserProfileResponse(
                10L,
                "keycloak-user-id",
                "Existing User",
                "existing.user@test.com",
                Role.EMPLOYEE,
                true,
                AccountStatus.ACTIVE,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        UpdateUserRoleRequest request = new UpdateUserRoleRequest(Role.ADMIN);

        when(userProfileService.getUserById(10L)).thenReturn(current);
        org.mockito.Mockito.doThrow(new KeycloakSyncException("boom"))
                .when(keycloakAdminService)
                .assignRealmRole("keycloak-user-id", Role.ADMIN);

        assertThatThrownBy(() -> userAdministrationService.updateUserRole(10L, request))
                .isInstanceOf(KeycloakSyncException.class)
                .hasMessage("boom");

        verify(userProfileService).getUserById(10L);
        verify(keycloakAdminService).assignRealmRole("keycloak-user-id", Role.ADMIN);
        verify(userProfileService, never()).updateUserRole(10L, request);
    }

    @Test
    void updateStatusSynchronizesKeycloakBeforeLocalProfile() {
        UserProfileResponse current = new UserProfileResponse(
                10L,
                "keycloak-user-id",
                "Existing User",
                "existing.user@test.com",
                Role.EMPLOYEE,
                true,
                AccountStatus.ACTIVE,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        UserProfileResponse updated = new UserProfileResponse(
                10L,
                "keycloak-user-id",
                "Existing User",
                "existing.user@test.com",
                Role.EMPLOYEE,
                false,
                AccountStatus.INACTIVE,
                current.createdAt(),
                LocalDateTime.now()
        );
        UpdateUserStatusRequest request = new UpdateUserStatusRequest(false);

        when(userProfileService.getUserById(10L)).thenReturn(current);
        when(userProfileService.updateUserStatus(10L, request)).thenReturn(updated);

        UserProfileResponse result = userAdministrationService.updateUserStatus(10L, request);

        assertThat(result).isEqualTo(updated);
        var ordered = inOrder(userProfileService, keycloakAdminService);
        ordered.verify(userProfileService).getUserById(10L);
        ordered.verify(keycloakAdminService).updateUserEnabled("keycloak-user-id", false);
        ordered.verify(userProfileService).updateUserStatus(10L, request);
        verify(auditLogService).log(
                AuditAction.USER_STATUS_CHANGED,
                "existing.user@test.com (id=10, keycloakId=keycloak-user-id)",
                "ACTIVE",
                "INACTIVE"
        );
    }

    @Test
    void createUserFailsClearlyWhenLocalSyncFailsAfterKeycloakUpdate() {
        CreateUserRequest request = new CreateUserRequest(
                "New User",
                "new.user@test.com",
                Role.MANAGER,
                "Test1234",
                true
        );

        when(keycloakAdminService.createUser(request)).thenReturn("keycloak-user-id");
        when(userProfileService.syncProvisionedUser("keycloak-user-id", request))
                .thenThrow(new RuntimeException("db failure"));

        assertThatThrownBy(() -> userAdministrationService.createUser(request))
                .isInstanceOf(UserSynchronizationException.class)
                .hasMessageContaining("local profile synchronization failed");
    }

    @Test
    void resetPasswordUsesLocalUserToFindKeycloakUserAndResetsTemporaryPassword() {
        UserProfileResponse current = new UserProfileResponse(
                10L,
                "keycloak-user-id",
                "Existing User",
                "existing.user@test.com",
                Role.EMPLOYEE,
                true,
                AccountStatus.ACTIVE,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        ResetPasswordRequest request = new ResetPasswordRequest("Temp1234!");

        when(userProfileService.getUserById(10L)).thenReturn(current);

        userAdministrationService.resetUserPassword(10L, request);

        var ordered = inOrder(userProfileService, keycloakAdminService);
        ordered.verify(userProfileService).getUserById(10L);
        ordered.verify(keycloakAdminService).resetTemporaryPassword("keycloak-user-id", "Temp1234!");
        verify(auditLogService).log(
                AuditAction.USER_PASSWORD_RESET,
                "existing.user@test.com (id=10, keycloakId=keycloak-user-id)",
                null,
                "temporary_password_reset"
        );
    }
}
