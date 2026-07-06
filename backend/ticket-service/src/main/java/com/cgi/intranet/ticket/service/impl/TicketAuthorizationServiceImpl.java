package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.service.CurrentUserService;
import com.cgi.intranet.ticket.service.TicketAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TicketAuthorizationServiceImpl implements TicketAuthorizationService {

    @Override
    public void ensureReadable(Ticket ticket, CurrentUserService.CurrentUser currentUser) {
        if (currentUser.admin() || currentUser.manager()) {
            return;
        }
        if (currentUser.employee()
                && (currentUser.userId().equals(ticket.getRequesterId())
                || currentUser.userId().equals(ticket.getAssignedUserId()))) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé à ce ticket");
    }

    @Override
    public void ensureUpdatable(Ticket ticket, CurrentUserService.CurrentUser currentUser) {
        if (currentUser.admin() || currentUser.manager()) {
            return;
        }
        if (currentUser.employee() && currentUser.userId().equals(ticket.getRequesterId())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé à la mise à jour de ce ticket");
    }
}
