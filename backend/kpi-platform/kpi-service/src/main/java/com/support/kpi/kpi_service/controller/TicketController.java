package com.support.kpi.kpi_service.controller;

import com.support.kpi.kpi_service.entity.Ticket;
import com.support.kpi.kpi_service.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping
    public ResponseEntity<List<Ticket>> getTickets(
            @RequestParam(value = "agentGdi", required = false) String agentGdi,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to) {
        if (agentGdi != null) {
            return ResponseEntity.ok(ticketService.getTicketsByAgent(agentGdi, from, to));
        }
        return ResponseEntity.ok(ticketService.getAllTickets());
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<Ticket> getTicketById(@PathVariable("ticketId") Long ticketId) {
        return ticketService.getTicketById(ticketId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{ticketId}/actions")
    public ResponseEntity<?> getActionsByTicketId(@PathVariable("ticketId") Long ticketId) {
        return ResponseEntity.ok(ticketService.getActionsByTicketId(ticketId));
    }
}
