package com.cgi.intranet.messaging.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/messages/health")
    public String health() {
        return "messaging-service is running";
    }
}
