package com.cgi.intranet.authuser.service;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.request.ResetPasswordRequest;
import com.cgi.intranet.authuser.dto.request.SyncUserRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserRoleRequest;
import com.cgi.intranet.authuser.dto.request.UpdateUserStatusRequest;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;

public interface UserAdministrationService {

    UserProfileResponse createUser(CreateUserRequest request);

    UserProfileResponse syncUser(SyncUserRequest request);

    UserProfileResponse updateUserRole(Long id, UpdateUserRoleRequest request);

    UserProfileResponse updateUserStatus(Long id, UpdateUserStatusRequest request);

    void resetUserPassword(Long id, ResetPasswordRequest request);
}
