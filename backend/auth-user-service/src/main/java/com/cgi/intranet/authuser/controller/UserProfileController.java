package com.cgi.intranet.authuser.controller;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.request.ResetPasswordRequest;
import com.cgi.intranet.authuser.dto.request.SyncUserRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserRoleRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserStatusRequest;
import com.cgi.intranet.authuser.dto.response.AuditLogResponse;
import com.cgi.intranet.authuser.dto.response.AuthenticatedUserResponse;
import com.cgi.intranet.authuser.dto.response.MessagingDirectoryUserResponse;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;
import com.cgi.intranet.authuser.enums.AccountStatus;
import com.cgi.intranet.authuser.enums.Role;
import com.cgi.intranet.authuser.exception.InactiveUserException;
import com.cgi.intranet.authuser.service.AuditLogService;
import com.cgi.intranet.authuser.service.UserAdministrationService;
import com.cgi.intranet.authuser.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class UserProfileController {

    private static final Set<String> BUSINESS_ROLES = Set.of("ADMIN", "MANAGER", "EMPLOYEE");
    private static final List<Role> ROLE_PRIORITY = List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE);
    private static final String LOCAL_PROFILE_MISSING_WARNING = "LOCAL_PROFILE_MISSING";

    private final UserProfileService userProfileService;
    private final UserAdministrationService userAdministrationService;
    private final AuditLogService auditLogService;

    public UserProfileController(
            UserProfileService userProfileService,
            UserAdministrationService userAdministrationService,
            AuditLogService auditLogService
    ) {
        this.userProfileService = userProfileService;
        this.userAdministrationService = userAdministrationService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(userProfileService.getAllUsers());
    }

    @GetMapping("/directory")
    public ResponseEntity<List<MessagingDirectoryUserResponse>> getMessagingDirectoryUsers() {
        return ResponseEntity.ok(userProfileService.getMessagingDirectoryUsers());
    }

    @GetMapping("/directory/{id}")
    public ResponseEntity<MessagingDirectoryUserResponse> getMessagingDirectoryUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userProfileService.getActiveMessagingDirectoryUserById(id));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserProfileResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userProfileService.getUserById(id));
    }

    @PostMapping("/users")
    public ResponseEntity<UserProfileResponse> createUser(
            @Valid @RequestBody CreateUserRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userAdministrationService.createUser(request));
    }

    @PostMapping("/users/sync")
    public ResponseEntity<UserProfileResponse> syncUser(@Valid @RequestBody SyncUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userAdministrationService.syncUser(request));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLogResponse>> getAuditLogs() {
        return ResponseEntity.ok(auditLogService.getAuditLogs());
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<UserProfileResponse> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        return ResponseEntity.ok(userAdministrationService.updateUserRole(id, request));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserProfileResponse> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return ResponseEntity.ok(userAdministrationService.updateUserStatus(id, request));
    }

    @PatchMapping("/users/{id}/password")
    public ResponseEntity<Void> resetUserPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        userAdministrationService.resetUserPassword(id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthenticatedUserResponse> getCurrentUser(
            @AuthenticationPrincipal Jwt jwt
    ) {
        String email = jwt.getClaimAsString("email");
        String fullName = jwt.getClaimAsString("name");
        if (fullName == null || fullName.isBlank()) {
            fullName = jwt.getClaimAsString("preferred_username");
        }

        List<Role> roles = extractRealmRoles(jwt);
        Optional<UserProfileResponse> localProfile = userProfileService.findUserProfile(jwt.getSubject(), email);
        if (localProfile.isPresent() && localProfile.get().accountStatus() == AccountStatus.INACTIVE) {
            throw new InactiveUserException("Current user profile is inactive.");
        }

        return ResponseEntity.ok(new AuthenticatedUserResponse(
                jwt.getSubject(),
                email,
                fullName,
                roles,
                resolvePrimaryRole(roles),
                localProfile.map(UserProfileResponse::accountStatus).orElse(AccountStatus.ACTIVE),
                localProfile.isPresent(),
                localProfile.isPresent() ? List.of() : List.of(LOCAL_PROFILE_MISSING_WARNING),
                localProfile.orElse(null)
        ));
    }

    private List<Role> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !(realmAccess.get("roles") instanceof Collection<?> roles)) {
            return List.of();
        }

        return roles.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .filter(BUSINESS_ROLES::contains)
                .map(Role::valueOf)
                .toList();
    }

    private Role resolvePrimaryRole(List<Role> roles) {
        return ROLE_PRIORITY.stream()
                .filter(roles::contains)
                .findFirst()
                .orElse(null);
    }
}
