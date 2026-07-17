package com.support.kpi.nps_service.client;

import com.support.kpi.nps_service.dto.AgentResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "kpi-platform-agent-service", url = "${services.kpi-platform-agent.base-url}")
public interface AgentClient {

    @GetMapping("/api/agents/resolve/gdi/{codeGdi}")
    AgentResponse resolveByCodeGdi(@PathVariable("codeGdi") String codeGdi);

    @GetMapping("/api/agents/resolve/grafana/{loginGrafana}")
    AgentResponse resolveByLoginGrafana(@PathVariable("loginGrafana") String loginGrafana);

    @GetMapping("/api/agents/resolve/name/{nomNormalise}")
    AgentResponse resolveByNomNormalise(@PathVariable("nomNormalise") String nomNormalise);
}
