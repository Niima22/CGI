package com.cgi.intranet.ticket.service.impl;

import com.cgi.intranet.ticket.dto.response.TicketHistoryResponse;
import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.entity.TicketHistory;
import com.cgi.intranet.ticket.enums.TicketHistoryActionType;
import com.cgi.intranet.ticket.exception.TicketNotFoundException;
import com.cgi.intranet.ticket.mapper.TicketHistoryMapper;
import com.cgi.intranet.ticket.repository.TicketHistoryRepository;
import com.cgi.intranet.ticket.repository.TicketRepository;
import com.cgi.intranet.ticket.service.CurrentUserService;
import com.cgi.intranet.ticket.service.TicketHistoryService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class TicketHistoryServiceImpl implements TicketHistoryService {

    private final TicketHistoryRepository ticketHistoryRepository;
    private final TicketRepository ticketRepository;
    private final TicketHistoryMapper ticketHistoryMapper;
    private final CurrentUserService currentUserService;

    public TicketHistoryServiceImpl(
            TicketHistoryRepository ticketHistoryRepository,
            TicketRepository ticketRepository,
            TicketHistoryMapper ticketHistoryMapper,
            CurrentUserService currentUserService
    ) {
        this.ticketHistoryRepository = ticketHistoryRepository;
        this.ticketRepository = ticketRepository;
        this.ticketHistoryMapper = ticketHistoryMapper;
        this.currentUserService = currentUserService;
    }

    @Override
    public List<TicketHistoryResponse> getTicketHistory(Long ticketId) {
        CurrentUserService.CurrentUser currentUser = currentUserService.getCurrentUser();
        Ticket ticket = ticketRepository.findByIdAndDeletedFalse(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));
        ensureReadable(ticket, currentUser);

        return ticketHistoryRepository.findByTicketIdOrderByCreatedAtAscIdAsc(ticketId).stream()
                .map(ticketHistoryMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void recordEvent(
            Ticket ticket,
            TicketHistoryActionType actionType,
            String oldValue,
            String newValue,
            String comment,
            Long performedBy
    ) {
        TicketHistory history = new TicketHistory();
        history.setTicketId(ticket.getId());
        history.setActionType(actionType);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setComment(comment);
        history.setPerformedBy(performedBy);
        ticketHistoryRepository.save(history);
    }

    private void ensureReadable(Ticket ticket, CurrentUserService.CurrentUser currentUser) {
        if (currentUser.admin() || currentUser.manager()) {
            return;
        }
        if (currentUser.employee()
                && (currentUser.userId().equals(ticket.getRequesterId())
                || currentUser.userId().equals(ticket.getAssignedUserId()))) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé à l'historique de ce ticket");
    }
}
