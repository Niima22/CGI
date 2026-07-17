package com.support.kpi.agent_service.controller;

import com.support.kpi.agent_service.dto.AgentRequest;
import com.support.kpi.agent_service.dto.AgentResponse;
import com.support.kpi.agent_service.service.AgentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;

    @PostMapping
    public ResponseEntity<AgentResponse> createAgent(@Valid @RequestBody AgentRequest request) {
        AgentResponse response = agentService.createAgent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<AgentResponse>> bulkImportAgents(@Valid @RequestBody List<AgentRequest> requests) {
        List<AgentResponse> responses = agentService.bulkImportAgents(requests);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    @GetMapping
    public ResponseEntity<List<AgentResponse>> getAllAgents() {
        return ResponseEntity.ok(agentService.getAllAgents());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgentResponse> getAgentById(@PathVariable("id") UUID id) {
        return agentService.getAgentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<AgentResponse> updateAgent(@PathVariable("id") UUID id, @Valid @RequestBody AgentRequest request) {
        try {
            AgentResponse response = agentService.updateAgent(id, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/resolve/gdi/{codeGdi}")
    public ResponseEntity<AgentResponse> resolveByCodeGdi(@PathVariable("codeGdi") String codeGdi) {
        return agentService.getAgentByCodeGdi(codeGdi)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/resolve/grafana/{loginGrafana}")
    public ResponseEntity<AgentResponse> resolveByLoginGrafana(@PathVariable("loginGrafana") String loginGrafana) {
        return agentService.getAgentByLoginGrafana(loginGrafana)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/resolve/name/{nomNormalise}")
    public ResponseEntity<AgentResponse> resolveByNomNormalise(@PathVariable("nomNormalise") String nomNormalise) {
        return agentService.getAgentByNomNormalise(nomNormalise)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
