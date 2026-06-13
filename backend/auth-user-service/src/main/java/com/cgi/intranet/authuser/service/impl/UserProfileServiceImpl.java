package com.cgi.intranet.authuser.service.impl;

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
        UserProfile userProfile = userProfileRepository.findByKeycloakId(request.keycloakId())
                .orElseGet(() -> new UserProfile(
                        request.keycloakId(),
                        request.fullName(),
                        request.email(),
                        request.role()
                ));

        userProfile.setFullName(request.fullName());
        userProfile.setEmail(request.email());
        userProfile.setRole(request.role());

        return toUserProfileResponse(userProfileRepository.save(userProfile));
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
