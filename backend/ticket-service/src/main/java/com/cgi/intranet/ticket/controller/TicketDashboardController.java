package com.cgi.intranet.ticket.controller;

import com.cgi.intranet.ticket.dto.response.TicketDashboardSummaryResponse;
import com.cgi.intranet.ticket.dto.response.TicketPriorityDistributionResponse;
import com.cgi.intranet.ticket.dto.response.TicketStatusDistributionResponse;
import com.cgi.intranet.ticket.service.TicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tickets/dashboard")
public class TicketDashboardController {

    private final TicketService ticketService;

    public TicketDashboardController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping("/summary")
    public ResponseEntity<TicketDashboardSummaryResponse> getSummary() {
        return ResponseEntity.ok(ticketService.getDashboardSummary());
    }

    @GetMapping("/status-distribution")
    public ResponseEntity<List<TicketStatusDistributionResponse>> getStatusDistribution() {
        return ResponseEntity.ok(ticketService.getStatusDistribution());
    }

    @GetMapping("/priority-distribution")
    public ResponseEntity<List<TicketPriorityDistributionResponse>> getPriorityDistribution() {
        return ResponseEntity.ok(ticketService.getPriorityDistribution());
    }
}
