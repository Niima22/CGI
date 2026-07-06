package com.cgi.intranet.ticket.service;

import com.cgi.intranet.ticket.dto.response.TicketHistoryResponse;
import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.enums.TicketHistoryActionType;

import java.util.List;

public interface TicketHistoryService {

    List<TicketHistoryResponse> getTicketHistory(Long ticketId);

    void recordEvent(
            Ticket ticket,
            TicketHistoryActionType actionType,
            String oldValue,
            String newValue,
            String comment,
            Long performedBy
    );
}
