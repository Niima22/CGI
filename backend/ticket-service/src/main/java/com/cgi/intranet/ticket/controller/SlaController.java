package com.cgi.intranet.ticket.controller;

import com.cgi.intranet.ticket.dto.request.SlaPolicyCreateRequest;
import com.cgi.intranet.ticket.dto.request.SlaPolicyStatusUpdateRequest;
import com.cgi.intranet.ticket.dto.request.SlaPolicyUpdateRequest;
import com.cgi.intranet.ticket.dto.response.SlaDashboardSummaryResponse;
import com.cgi.intranet.ticket.dto.response.SlaPolicyResponse;
import com.cgi.intranet.ticket.dto.response.SlaUrgentTicketResponse;
import com.cgi.intranet.ticket.dto.response.TicketSlaResponse;
import com.cgi.intranet.ticket.service.SlaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sla")
public class SlaController {

    private final SlaService slaService;

    public SlaController(SlaService slaService) {
        this.slaService = slaService;
    }

    @GetMapping("/policies")
    public ResponseEntity<List<SlaPolicyResponse>> getPolicies() {
        return ResponseEntity.ok(slaService.getPolicies());
    }

    @GetMapping("/policies/{id}")
    public ResponseEntity<SlaPolicyResponse> getPolicyById(@PathVariable Long id) {
        return ResponseEntity.ok(slaService.getPolicyById(id));
    }

    @PostMapping("/policies")
    public ResponseEntity<SlaPolicyResponse> createPolicy(@Valid @RequestBody SlaPolicyCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(slaService.createPolicy(request));
    }

    @PatchMapping("/policies/{id}")
    public ResponseEntity<SlaPolicyResponse> updatePolicy(
            @PathVariable Long id,
            @Valid @RequestBody SlaPolicyUpdateRequest request
    ) {
        return ResponseEntity.ok(slaService.updatePolicy(id, request));
    }

    @PatchMapping("/policies/{id}/status")
    public ResponseEntity<SlaPolicyResponse> updatePolicyStatus(
            @PathVariable Long id,
            @Valid @RequestBody SlaPolicyStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(slaService.updatePolicyStatus(id, request));
    }

    @GetMapping("/tickets/{ticketId}")
    public ResponseEntity<TicketSlaResponse> getTicketSla(@PathVariable Long ticketId) {
        return ResponseEntity.ok(slaService.getTicketSla(ticketId));
    }

    @PostMapping("/tickets/{ticketId}/recalculate")
    public ResponseEntity<TicketSlaResponse> recalculateTicketSla(@PathVariable Long ticketId) {
        return ResponseEntity.ok(slaService.recalculateTicketSla(ticketId));
    }

    @GetMapping("/dashboard/summary")
    public ResponseEntity<SlaDashboardSummaryResponse> getDashboardSummary() {
        return ResponseEntity.ok(slaService.getDashboardSummary());
    }

    @GetMapping("/dashboard/urgent-tickets")
    public ResponseEntity<List<SlaUrgentTicketResponse>> getUrgentTickets(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(slaService.getUrgentTickets(limit));
    }
}
