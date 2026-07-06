package com.cgi.intranet.authuser.service;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.request.SyncUserRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserRoleRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserStatusRequest;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;
import com.cgi.intranet.authuser.dto.response.MessagingDirectoryUserResponse;

import java.util.List;
import java.util.Optional;

public interface UserProfileService {

    Optional<UserProfileResponse> findUserProfile(String keycloakId, String email);

    List<UserProfileResponse> getAllUsers();

    List<MessagingDirectoryUserResponse> getMessagingDirectoryUsers();

    MessagingDirectoryUserResponse getActiveMessagingDirectoryUserById(Long id);

    UserProfileResponse getUserById(Long id);

    UserProfileResponse syncUser(SyncUserRequest request);

    UserProfileResponse syncProvisionedUser(String keycloakId, CreateUserRequest request);

    UserProfileResponse updateUserRole(Long id, UpdateUserRoleRequest request);

    UserProfileResponse updateUserStatus(Long id, UpdateUserStatusRequest request);
}
