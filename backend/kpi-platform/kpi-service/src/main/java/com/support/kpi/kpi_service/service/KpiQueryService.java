package com.support.kpi.kpi_service.service;

import com.support.kpi.kpi_service.entity.AgentScore;
import com.support.kpi.kpi_service.entity.KpiDaily;
import com.support.kpi.kpi_service.repository.AgentScoreRepository;
import com.support.kpi.kpi_service.repository.KpiDailyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class KpiQueryService {

    private final KpiDailyRepository kpiDailyRepository;
    private final AgentScoreRepository agentScoreRepository;

    public List<KpiDaily> getDailyKpis(String agentCodeGdi, String from, String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(90);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();

        if (agentCodeGdi != null) {
            return kpiDailyRepository.findByAgentCodeGdiAndDateKpiBetween(agentCodeGdi, fromDate, toDate);
        }
        return kpiDailyRepository.findByDateKpiBetween(fromDate, toDate);
    }

    public List<KpiDaily> getWeeklyKpis(String agentCodeGdi, String semaine) {
        if (agentCodeGdi != null) {
            return kpiDailyRepository.findByAgentCodeGdiAndSemaine(agentCodeGdi, semaine);
        }
        return kpiDailyRepository.findBySemaine(semaine);
    }

    public List<AgentScore> getLeaderboard(String equipe, String typePeriode, String debut) {
        String period = typePeriode != null ? typePeriode.toUpperCase() : "WEEKLY";
        LocalDate debutDate = debut != null ? LocalDate.parse(debut) : LocalDate.now().minusWeeks(1);

        if (equipe != null && !equipe.isBlank() && !"ALL".equalsIgnoreCase(equipe)) {
            return agentScoreRepository.getLeaderboardByEquipe(equipe, period, debutDate);
        }
        return agentScoreRepository.getLeaderboard(period, debutDate);
    }
}
