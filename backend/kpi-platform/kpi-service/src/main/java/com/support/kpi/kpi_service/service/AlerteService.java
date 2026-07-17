package com.support.kpi.kpi_service.service;

import com.support.kpi.kpi_service.entity.Alerte;
import com.support.kpi.kpi_service.repository.AlerteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AlerteService {

    private final AlerteRepository alerteRepository;

    public List<Alerte> getAlertes(String equipe, Boolean resolue) {
        Boolean targetResolue = resolue != null ? resolue : false;
        if (equipe != null && !equipe.isBlank() && !"ALL".equalsIgnoreCase(equipe)) {
            return alerteRepository.findByEquipeDsAndResolue(equipe, targetResolue);
        }
        return alerteRepository.findByResolue(targetResolue);
    }

    public List<Alerte> getAlertesByAgent(String agentCodeGdi) {
        return alerteRepository.findByAgentCodeGdi(agentCodeGdi);
    }

    public Optional<Alerte> resolveAlerte(Long id, UUID userId) {
        return alerteRepository.findById(id).map(a -> {
            a.setResolue(true);
            a.setDateResolution(LocalDate.now());
            a.setResoluePar(userId);
            return alerteRepository.save(a);
        });
    }
}
