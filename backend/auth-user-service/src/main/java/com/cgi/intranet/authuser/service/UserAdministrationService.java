package com.cgi.intranet.authuser.service;

import com.cgi.intranet.authuser.dto.request.CreateUserRequest;
import com.cgi.intranet.authuser.dto.response.UserProfileResponse;

public interface UserAdministrationService {

    UserProfileResponse createUser(CreateUserRequest request);
}
