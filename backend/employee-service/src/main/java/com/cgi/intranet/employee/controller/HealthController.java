package com.cgi.intranet.employee.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/employees/health")
    public String health() {
        return "employee-service is running";
    }
}
