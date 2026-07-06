package com.cgi.intranet.ticket.mapper;

import com.cgi.intranet.ticket.dto.response.TicketHistoryResponse;
import com.cgi.intranet.ticket.entity.TicketHistory;
import com.cgi.intranet.ticket.util.TicketLabelResolver;
import org.springframework.stereotype.Component;

@Component
public class TicketHistoryMapper {

    public TicketHistoryResponse toResponse(TicketHistory history) {
        return new TicketHistoryResponse(
                history.getId(),
                history.getTicketId(),
                history.getActionType(),
                TicketLabelResolver.historyActionLabel(history.getActionType()),
                history.getOldValue(),
                history.getNewValue(),
                history.getComment(),
                history.getPerformedBy(),
                history.getCreatedAt()
        );
    }
}
