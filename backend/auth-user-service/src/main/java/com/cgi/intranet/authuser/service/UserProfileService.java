package com.cgi.intranet.authuser.service;

import com.cgi.intranet.authuser.dto.request.SyncUserRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserRoleRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserStatusRequest;
import com.cgi.intranet.authuser.dto.response.CurrentUserResponse;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;

import java.util.List;

public interface UserProfileService {

    CurrentUserResponse getCurrentUserByKeycloakId(String keycloakId);

    List<UserProfileResponse> getAllUsers();

    UserProfileResponse getUserById(Long id);

    UserProfileResponse syncUser(SyncUserRequest request);

    UserProfileResponse updateUserRole(Long id, UpdateUserRoleRequest request);

    UserProfileResponse updateUserStatus(Long id, UpdateUserStatusRequest request);
}
