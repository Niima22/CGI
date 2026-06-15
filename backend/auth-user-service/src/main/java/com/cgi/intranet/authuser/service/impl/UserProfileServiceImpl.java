package com.cgi.intranet.authuser.service.impl;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.request.SyncUserRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserRoleRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserStatusRequest;
import com.cgi.intranet.authuser.dto.response.CurrentUserResponse;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;
import com.cgi.intranet.authuser.entity.UserProfile;
import com.cgi.intranet.authuser.repository.UserProfileRepository;
import com.cgi.intranet.authuser.service.UserProfileService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class UserProfileServiceImpl implements UserProfileService {

    private final UserProfileRepository userProfileRepository;

    public UserProfileServiceImpl(UserProfileRepository userProfileRepository) {
        this.userProfileRepository = userProfileRepository;
    }

    @Override
    public CurrentUserResponse getCurrentUserByKeycloakId(String keycloakId) {
        UserProfile userProfile = userProfileRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new RuntimeException("User profile not found for Keycloak ID: " + keycloakId));

        return toCurrentUserResponse(userProfile);
    }

    @Override
    public Optional<UserProfileResponse> findUserProfile(String keycloakId, String email) {
        Optional<UserProfile> userProfile = userProfileRepository.findByKeycloakId(keycloakId);
        if (userProfile.isEmpty() && email != null && !email.isBlank()) {
            userProfile = userProfileRepository.findByEmail(email);
        }
        return userProfile.map(this::toUserProfileResponse);
    }

    @Override
    public List<UserProfileResponse> getAllUsers() {
        return userProfileRepository.findAll().stream()
                .map(this::toUserProfileResponse)
                .toList();
    }

    @Override
    public UserProfileResponse getUserById(Long id) {
        return toUserProfileResponse(findUserById(id));
    }

    @Override
    @Transactional
    public UserProfileResponse syncUser(SyncUserRequest request) {
        return saveUserProfile(
                request.keycloakId(),
                request.fullName(),
                request.email(),
                request.role(),
                true,
                false
        );
    }

    @Override
    @Transactional
    public UserProfileResponse syncProvisionedUser(
            String keycloakId,
            CreateUserRequest request
    ) {
        return saveUserProfile(
                keycloakId,
                request.fullName(),
                request.email(),
                request.role(),
                request.active(),
                true
        );
    }

    @Override
    @Transactional
    public UserProfileResponse updateUserRole(Long id, UpdateUserRoleRequest request) {
        UserProfile userProfile = findUserById(id);
        userProfile.setRole(request.role());
        return toUserProfileResponse(userProfileRepository.save(userProfile));
    }

    @Override
    @Transactional
    public UserProfileResponse updateUserStatus(Long id, UpdateUserStatusRequest request) {
        UserProfile userProfile = findUserById(id);
        userProfile.setActive(request.active());
        return toUserProfileResponse(userProfileRepository.save(userProfile));
    }

    private UserProfile findUserById(Long id) {
        return userProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User profile not found with ID: " + id));
    }

    private UserProfileResponse saveUserProfile(
            String keycloakId,
            String fullName,
            String email,
            com.cgi.intranet.authuser.enums.Role role,
            boolean active,
            boolean updateActive
    ) {
        UserProfile userProfile = userProfileRepository.findByKeycloakId(keycloakId)
                .orElseGet(() -> userProfileRepository.findByEmail(email)
                        .orElseGet(() -> new UserProfile(keycloakId, fullName, email, role)));

        userProfile.setKeycloakId(keycloakId);
        userProfile.setFullName(fullName);
        userProfile.setEmail(email);
        userProfile.setRole(role);
        if (updateActive) {
            userProfile.setActive(active);
        }

        return toUserProfileResponse(userProfileRepository.save(userProfile));
    }

    private UserProfileResponse toUserProfileResponse(UserProfile userProfile) {
        return new UserProfileResponse(
                userProfile.getId(),
                userProfile.getKeycloakId(),
                userProfile.getFullName(),
                userProfile.getEmail(),
                userProfile.getRole(),
                userProfile.isActive(),
                userProfile.getCreatedAt(),
                userProfile.getUpdatedAt()
        );
    }

    private CurrentUserResponse toCurrentUserResponse(UserProfile userProfile) {
        return new CurrentUserResponse(
                userProfile.getId(),
                userProfile.getKeycloakId(),
                userProfile.getFullName(),
                userProfile.getEmail(),
                userProfile.getRole(),
                userProfile.isActive()
        );
    }
}
