package com.cgi.intranet.ticket.service;

import com.cgi.intranet.ticket.entity.Ticket;

public interface TicketAuthorizationService {

    void ensureReadable(Ticket ticket, CurrentUserService.CurrentUser currentUser);

    void ensureUpdatable(Ticket ticket, CurrentUserService.CurrentUser currentUser);
}
