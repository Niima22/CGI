package com.support.kpi.kpi_service.controller;

import com.support.kpi.kpi_service.entity.AgentScore;
import com.support.kpi.kpi_service.entity.KpiDaily;
import com.support.kpi.kpi_service.service.KpiQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kpi")
@RequiredArgsConstructor
public class KpiController {

    private final KpiQueryService kpiQueryService;

    @GetMapping("/daily")
    public ResponseEntity<List<KpiDaily>> getDailyKpis(
            @RequestParam(value = "agentGdi", required = false) String agentGdi,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to) {
        return ResponseEntity.ok(kpiQueryService.getDailyKpis(agentGdi, from, to));
    }

    @GetMapping("/weekly")
    public ResponseEntity<List<KpiDaily>> getWeeklyKpis(
            @RequestParam(value = "agentGdi", required = false) String agentGdi,
            @RequestParam(value = "semaine", required = false) String semaine) {
        return ResponseEntity.ok(kpiQueryService.getWeeklyKpis(agentGdi, semaine));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<AgentScore>> getLeaderboard(
            @RequestParam(value = "equipe", required = false) String equipe,
            @RequestParam(value = "periode", required = false) String periode,
            @RequestParam(value = "debut", required = false) String debut) {
        return ResponseEntity.ok(kpiQueryService.getLeaderboard(equipe, periode, debut));
    }
}
