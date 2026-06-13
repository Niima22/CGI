package com.cgi.intranet.sla.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/sla/health")
    public String health() {
        return "sla-service is running";
    }
}
