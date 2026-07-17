package com.support.kpi.nps_service.controller;

import com.support.kpi.nps_service.entity.NpsRetour;
import com.support.kpi.nps_service.service.NpsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nps")
@RequiredArgsConstructor
public class NpsController {

    private final NpsService npsService;

    @GetMapping("/retours")
    public ResponseEntity<List<NpsRetour>> getNpsRetours(
            @RequestParam(value = "agentGdi", required = false) String agentGdi,
            @RequestParam(value = "agentGrafana", required = false) String agentGrafana,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to) {
        if (agentGrafana != null) {
            return ResponseEntity.ok(npsService.getNpsRetoursByGrafana(agentGrafana));
        }
        return ResponseEntity.ok(npsService.getNpsRetours(agentGdi, from, to));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getNpsSummary(
            @RequestParam(value = "equipe", required = false) String equipe,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to) {
        return ResponseEntity.ok(npsService.getNpsSummary(equipe, from, to));
    }
}
