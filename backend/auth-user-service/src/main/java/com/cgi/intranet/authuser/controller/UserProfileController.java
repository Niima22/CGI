package com.cgi.intranet.authuser.controller;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.request.SyncUserRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserRoleRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserStatusRequest;
import com.cgi.intranet.authuser.dto.response.AuthenticatedUserResponse;
import com.cgi.intranet.authuser.dto.response.CurrentUserResponse;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;
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

@RestController
@RequestMapping("/api/auth")
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final UserAdministrationService userAdministrationService;

    public UserProfileController(
            UserProfileService userProfileService,
            UserAdministrationService userAdministrationService
    ) {
        this.userProfileService = userProfileService;
        this.userAdministrationService = userAdministrationService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(userProfileService.getAllUsers());
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
                .body(userProfileService.syncUser(request));
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<UserProfileResponse> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        return ResponseEntity.ok(userProfileService.updateUserRole(id, request));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserProfileResponse> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return ResponseEntity.ok(userProfileService.updateUserStatus(id, request));
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

        return ResponseEntity.ok(new AuthenticatedUserResponse(
                jwt.getSubject(),
                email,
                fullName,
                extractRealmRoles(jwt),
                userProfileService.findUserProfile(jwt.getSubject(), email).orElse(null)
        ));
    }

    // TODO: DEV-ONLY. Remove after all local profile flows use authenticated GET /me.
    @GetMapping("/me/dev/{keycloakId}")
    public ResponseEntity<CurrentUserResponse> getCurrentUserForDevelopment(
            @PathVariable String keycloakId
    ) {
        return ResponseEntity.ok(userProfileService.getCurrentUserByKeycloakId(keycloakId));
    }

    private List<String> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !(realmAccess.get("roles") instanceof Collection<?> roles)) {
            return List.of();
        }

        return roles.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .toList();
    }
}
