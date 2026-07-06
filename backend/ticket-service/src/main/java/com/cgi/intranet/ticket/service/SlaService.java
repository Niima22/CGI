package com.cgi.intranet.ticket.service;

import com.cgi.intranet.ticket.dto.request.SlaPolicyCreateRequest;
import com.cgi.intranet.ticket.dto.request.SlaPolicyStatusUpdateRequest;
import com.cgi.intranet.ticket.dto.request.SlaPolicyUpdateRequest;
import com.cgi.intranet.ticket.dto.response.SlaDashboardSummaryResponse;
import com.cgi.intranet.ticket.dto.response.SlaPolicyResponse;
import com.cgi.intranet.ticket.dto.response.SlaUrgentTicketResponse;
import com.cgi.intranet.ticket.dto.response.TicketSlaResponse;
import com.cgi.intranet.ticket.entity.Ticket;

import java.util.List;

public interface SlaService {

    List<SlaPolicyResponse> getPolicies();

    SlaPolicyResponse getPolicyById(Long id);

    SlaPolicyResponse createPolicy(SlaPolicyCreateRequest request);

    SlaPolicyResponse updatePolicy(Long id, SlaPolicyUpdateRequest request);

    SlaPolicyResponse updatePolicyStatus(Long id, SlaPolicyStatusUpdateRequest request);

    TicketSlaResponse getTicketSla(Long ticketId);

    TicketSlaResponse recalculateTicketSla(Long ticketId);

    SlaDashboardSummaryResponse getDashboardSummary();

    List<SlaUrgentTicketResponse> getUrgentTickets(int limit);

    TicketSlaResponse applySlaToTicket(Ticket ticket, Long performedBy);

    TicketSlaResponse synchronizeTicketSla(Ticket ticket, Long performedBy);
}
