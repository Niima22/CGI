package com.cgi.intranet.authuser.service.impl;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.request.ResetPasswordRequest;
import com.cgi.intranet.authuser.dto.request.SyncUserRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserRoleRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserStatusRequest;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;
import com.cgi.intranet.authuser.enums.AuditAction;
import com.cgi.intranet.authuser.exception.UserSynchronizationException;
import com.cgi.intranet.authuser.service.AuditLogService;
import com.cgi.intranet.authuser.service.KeycloakAdminService;
import com.cgi.intranet.authuser.service.UserAdministrationService;
import com.cgi.intranet.authuser.service.UserProfileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class UserAdministrationServiceImpl implements UserAdministrationService {

    private static final Logger log = LoggerFactory.getLogger(UserAdministrationServiceImpl.class);

    private final KeycloakAdminService keycloakAdminService;
    private final UserProfileService userProfileService;
    private final AuditLogService auditLogService;

    public UserAdministrationServiceImpl(
            KeycloakAdminService keycloakAdminService,
            UserProfileService userProfileService,
            AuditLogService auditLogService
    ) {
        this.keycloakAdminService = keycloakAdminService;
        this.userProfileService = userProfileService;
        this.auditLogService = auditLogService;
    }

    @Override
    public UserProfileResponse createUser(CreateUserRequest request) {
        String keycloakUserId = keycloakAdminService.createUser(request);
        keycloakAdminService.assignRealmRole(keycloakUserId, request.role());
        try {
            UserProfileResponse createdUser = userProfileService.syncProvisionedUser(keycloakUserId, request);
            auditLogService.log(
                    AuditAction.USER_CREATED,
                    targetUser(createdUser),
                    null,
                    "role=" + createdUser.role() + ", accountStatus=" + createdUser.accountStatus()
            );
            return createdUser;
        } catch (RuntimeException exception) {
            log.error("Local user profile sync failed after Keycloak provisioning for {}", request.email(), exception);
            throw new UserSynchronizationException(
                    "Keycloak user was updated but local profile synchronization failed for " + request.email(),
                    exception
            );
        }
    }

    @Override
    public UserProfileResponse syncUser(SyncUserRequest request) {
        UserProfileResponse syncedUser = userProfileService.syncUser(request);
        auditLogService.log(
                AuditAction.USER_SYNC_TRIGGERED,
                targetUser(syncedUser),
                null,
                "role=" + syncedUser.role() + ", accountStatus=" + syncedUser.accountStatus()
        );
        return syncedUser;
    }

    @Override
    public UserProfileResponse updateUserRole(Long id, UpdateUserRoleRequest request) {
        UserProfileResponse currentUser = userProfileService.getUserById(id);
        keycloakAdminService.assignRealmRole(currentUser.keycloakId(), request.role());
        try {
            UserProfileResponse updatedUser = userProfileService.updateUserRole(id, request);
            auditLogService.log(
                    AuditAction.USER_ROLE_CHANGED,
                    targetUser(updatedUser),
                    currentUser.role().name(),
                    updatedUser.role().name()
            );
            return updatedUser;
        } catch (RuntimeException exception) {
            log.error("Local user role sync failed after Keycloak role update for {}", currentUser.email(), exception);
            throw new UserSynchronizationException(
                    "Keycloak role was updated but local profile synchronization failed for user " + currentUser.email(),
                    exception
            );
        }
    }

    @Override
    public UserProfileResponse updateUserStatus(Long id, UpdateUserStatusRequest request) {
        UserProfileResponse currentUser = userProfileService.getUserById(id);
        keycloakAdminService.updateUserEnabled(currentUser.keycloakId(), request.active());
        try {
            UserProfileResponse updatedUser = userProfileService.updateUserStatus(id, request);
            auditLogService.log(
                    AuditAction.USER_STATUS_CHANGED,
                    targetUser(updatedUser),
                    currentUser.accountStatus().name(),
                    updatedUser.accountStatus().name()
            );
            return updatedUser;
        } catch (RuntimeException exception) {
            log.error(
                    "Local user status sync failed after Keycloak enabled-state update for {}",
                    currentUser.email(),
                    exception
            );
            throw new UserSynchronizationException(
                    "Keycloak enabled status was updated but local profile synchronization failed for user "
                            + currentUser.email(),
                    exception
            );
        }
    }

    @Override
    public void resetUserPassword(Long id, ResetPasswordRequest request) {
        UserProfileResponse currentUser = userProfileService.getUserById(id);
        keycloakAdminService.resetTemporaryPassword(currentUser.keycloakId(), request.temporaryPassword());
        auditLogService.log(
                AuditAction.USER_PASSWORD_RESET,
                targetUser(currentUser),
                null,
                "temporary_password_reset"
        );
    }

    private String targetUser(UserProfileResponse userProfileResponse) {
        return userProfileResponse.email()
                + " (id=" + userProfileResponse.id()
                + ", keycloakId=" + userProfileResponse.keycloakId() + ")";
    }
}
