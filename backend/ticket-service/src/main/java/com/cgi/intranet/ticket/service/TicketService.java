package com.cgi.intranet.ticket.service;

import com.cgi.intranet.ticket.dto.request.TicketCreateRequest;
import com.cgi.intranet.ticket.dto.request.TicketUpdateRequest;
import com.cgi.intranet.ticket.dto.response.TicketDashboardSummaryResponse;
import com.cgi.intranet.ticket.dto.response.TicketHistoryResponse;
import com.cgi.intranet.ticket.dto.response.TicketPriorityDistributionResponse;
import com.cgi.intranet.ticket.dto.response.TicketResponse;
import com.cgi.intranet.ticket.dto.response.TicketStatusDistributionResponse;

import java.util.List;

public interface TicketService {

    List<TicketResponse> getTicketsForCurrentUser();

    TicketResponse getTicketById(Long id);

    List<TicketHistoryResponse> getTicketHistory(Long id);

    TicketDashboardSummaryResponse getDashboardSummary();

    List<TicketStatusDistributionResponse> getStatusDistribution();

    List<TicketPriorityDistributionResponse> getPriorityDistribution();

    TicketResponse createTicket(TicketCreateRequest request);

    TicketResponse updateTicket(Long id, TicketUpdateRequest request);

    void deleteTicket(Long id);
}
