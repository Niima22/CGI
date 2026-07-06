package com.cgi.intranet.ticket.controller;

import com.cgi.intranet.ticket.dto.response.EmployeeProductivityKpiResponse;
import com.cgi.intranet.ticket.dto.response.EmployeeWorkloadKpiResponse;
import com.cgi.intranet.ticket.dto.response.KpiEmployeeSummaryResponse;
import com.cgi.intranet.ticket.service.KpiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/kpi")
public class KpiController {

    private final KpiService kpiService;

    public KpiController(KpiService kpiService) {
        this.kpiService = kpiService;
    }

    @GetMapping("/employees/workload")
    public ResponseEntity<List<EmployeeWorkloadKpiResponse>> getEmployeeWorkload(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String sort
    ) {
        return ResponseEntity.ok(kpiService.getEmployeeWorkload(limit, sort));
    }

    @GetMapping("/employees/productivity")
    public ResponseEntity<List<EmployeeProductivityKpiResponse>> getEmployeeProductivity(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String sort
    ) {
        return ResponseEntity.ok(kpiService.getEmployeeProductivity(limit, sort));
    }

    @GetMapping("/employees/summary")
    public ResponseEntity<KpiEmployeeSummaryResponse> getEmployeeSummary() {
        return ResponseEntity.ok(kpiService.getEmployeeSummary());
    }
}
