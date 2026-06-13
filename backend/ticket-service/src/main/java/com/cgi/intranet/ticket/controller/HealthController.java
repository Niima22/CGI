package com.cgi.intranet.ticket.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/tickets/health")
    public String health() {
        return "ticket-service is running";
    }
}
