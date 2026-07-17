package com.support.kpi.kpi_service.controller;

import com.support.kpi.kpi_service.entity.Alerte;
import com.support.kpi.kpi_service.service.AlerteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/alertes")
@RequiredArgsConstructor
public class AlerteController {

    private final AlerteService alerteService;

    @GetMapping
    public ResponseEntity<List<Alerte>> getAlertes(
            @RequestParam(value = "equipe", required = false) String equipe,
            @RequestParam(value = "resolue", required = false) Boolean resolue) {
        return ResponseEntity.ok(alerteService.getAlertes(equipe, resolue));
    }

    @GetMapping("/agent/{agentGdi}")
    public ResponseEntity<List<Alerte>> getAlertesByAgent(@PathVariable("agentGdi") String agentGdi) {
        return ResponseEntity.ok(alerteService.getAlertesByAgent(agentGdi));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<Alerte> resolveAlerte(
            @PathVariable("id") Long id,
            @RequestParam("userId") UUID userId) {
        return alerteService.resolveAlerte(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
