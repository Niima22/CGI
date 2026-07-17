package com.support.kpi.kpi_service.kafka;

import com.support.kpi.kpi_service.client.AgentClient;
import com.support.kpi.kpi_service.dto.AgentResponse;
import com.support.kpi.kpi_service.entity.KpiDaily;
import com.support.kpi.kpi_service.event.ImportCompletedEvent;
import com.support.kpi.kpi_service.repository.KpiDailyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ImportCompletedConsumer {

    private final KpiDailyRepository kpiDailyRepository;
    private final AgentClient agentClient;

    @KafkaListener(topics = "kpi.import.completed", groupId = "kpi-service-group")
    public void consume(ImportCompletedEvent event) {
        log.info("Événement d'import reçu dans kpi-service : id={}, typeSource={}, statut={}", 
                event.getImportId(), event.getTypeSource(), event.getStatut());

        if (!"SUCCES".equals(event.getStatut())) {
            log.warn("L'import n'a pas réussi, résolution ignorée.");
            return;
        }

        if ("EXCEL_KPI_DS_MAGASIN".equals(event.getTypeSource())) {
            resolveMissingGdiCodes();
        }
    }

    public void resolveMissingGdiCodes() {
        log.info("Début de la résolution des codes GDI manquants dans kpi_daily...");
        List<KpiDaily> unresolved = kpiDailyRepository.findAll().stream()
                .filter(k -> k.getAgentCodeGdi() == null && k.getAgentNomNormalise() != null)
                .toList();

        if (unresolved.isEmpty()) {
            log.info("Aucun record sans code GDI dans kpi_daily.");
            return;
        }

        int resolvedCount = 0;
        for (KpiDaily record : unresolved) {
            try {
                AgentResponse agent = agentClient.resolveByNomNormalise(record.getAgentNomNormalise());
                if (agent != null && agent.getCodeGdi() != null) {
                    record.setAgentCodeGdi(agent.getCodeGdi());
                    kpiDailyRepository.save(record);
                    resolvedCount++;
                }
            } catch (Exception e) {
                // Feign client throws exception on 404
                log.debug("Impossible de résoudre l'agent {} : {}", record.getAgentNomNormalise(), e.getMessage());
            }
        }
        log.info("Résolution terminée : {}/{} records mis à jour.", resolvedCount, unresolved.size());
    }
}
