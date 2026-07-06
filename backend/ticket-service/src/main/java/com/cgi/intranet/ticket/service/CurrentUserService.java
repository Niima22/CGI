package com.cgi.intranet.ticket.service;

public interface CurrentUserService {

    CurrentUser getCurrentUser();

    record CurrentUser(
            Long userId,
            String keycloakId,
            boolean admin,
            boolean manager,
            boolean employee
    ) {
    }
}
