package com.support.kpi.nps_service.kafka;

import com.support.kpi.nps_service.client.AgentClient;
import com.support.kpi.nps_service.dto.AgentResponse;
import com.support.kpi.nps_service.entity.NpsRetour;
import com.support.kpi.nps_service.event.ImportCompletedEvent;
import com.support.kpi.nps_service.repository.NpsRetourRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ImportCompletedConsumer {

    private final NpsRetourRepository npsRetourRepository;
    private final AgentClient agentClient;

    @KafkaListener(topics = "kpi.import.completed", groupId = "nps-service-group")
    public void consume(ImportCompletedEvent event) {
        log.info("Événement d'import reçu dans nps-service : id={}, typeSource={}, statut={}", 
                event.getImportId(), event.getTypeSource(), event.getStatut());

        if (!"SUCCES".equals(event.getStatut())) {
            log.warn("L'import n'a pas réussi, résolution ignorée.");
            return;
        }

        if ("CSV_NPS".equals(event.getTypeSource())) {
            resolveMissingGdiCodes();
        }
    }

    public void resolveMissingGdiCodes() {
        log.info("Début de la résolution des codes GDI manquants dans nps_retours...");
        List<NpsRetour> unresolved = npsRetourRepository.findAll().stream()
                .filter(r -> r.getAgentCodeGdi() == null && r.getResoluParGrafana() != null)
                .toList();

        if (unresolved.isEmpty()) {
            log.info("Aucun record sans code GDI dans nps_retours.");
            return;
        }

        int resolvedCount = 0;
        for (NpsRetour record : unresolved) {
            try {
                AgentResponse agent = agentClient.resolveByLoginGrafana(record.getResoluParGrafana());
                if (agent != null && agent.getCodeGdi() != null) {
                    record.setAgentCodeGdi(agent.getCodeGdi());
                    npsRetourRepository.save(record);
                    resolvedCount++;
                }
            } catch (Exception e) {
                log.debug("Impossible de résoudre l'agent Grafana {} : {}", record.getResoluParGrafana(), e.getMessage());
            }
        }
        log.info("Résolution NPS terminée : {}/{} records mis à jour.", resolvedCount, unresolved.size());
    }
}
