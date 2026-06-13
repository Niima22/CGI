package com.cgi.intranet.authuser.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/auth/health")
    public String health() {
        return "auth-user-service is running";
    }
}
