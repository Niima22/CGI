package com.support.kpi.nps_service.service;

import com.support.kpi.nps_service.entity.NpsRetour;
import com.support.kpi.nps_service.repository.NpsRetourRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class NpsService {

    private final NpsRetourRepository npsRetourRepository;

    public List<NpsRetour> getNpsRetours(String agentCodeGdi, String from, String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(90);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();

        if (agentCodeGdi != null) {
            return npsRetourRepository.findByAgentCodeGdiAndDateRetourNpsBetween(agentCodeGdi, fromDate, toDate);
        }
        return npsRetourRepository.findAll().stream()
                .filter(r -> r.getDateRetourNps() != null && !r.getDateRetourNps().isBefore(fromDate) && !r.getDateRetourNps().isAfter(toDate))
                .toList();
    }

    public List<NpsRetour> getNpsRetoursByGrafana(String agentGrafana) {
        return npsRetourRepository.findByResoluParGrafana(agentGrafana);
    }

    public Map<String, Object> getNpsSummary(String equipe, String from, String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(90);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();

        List<NpsRetour> retours;
        if (equipe != null && !equipe.isBlank() && !"ALL".equalsIgnoreCase(equipe)) {
            retours = npsRetourRepository.findByEquipeDsAndDateRetourNpsBetween(equipe, fromDate, toDate);
        } else {
            retours = npsRetourRepository.findAll().stream()
                    .filter(r -> r.getDateRetourNps() != null && !r.getDateRetourNps().isBefore(fromDate) && !r.getDateRetourNps().isAfter(toDate))
                    .toList();
        }

        long promoteurs = 0;
        long detractors = 0;
        long neutres = 0;

        for (NpsRetour r : retours) {
            if (r.getNps() != null) {
                if (r.getNps() >= 9) {
                    promoteurs++;
                } else if (r.getNps() <= 6) {
                    detractors++;
                } else {
                    neutres++;
                }
            }
        }

        long total = promoteurs + detractors + neutres;
        double npsNet = total > 0 ? ((double) (promoteurs - detractors) / total) * 100 : 0.0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("promoteurs", promoteurs);
        summary.put("detracteurs", detractors);
        summary.put("neutres", neutres);
        summary.put("total", total);
        summary.put("npsNet", Math.round(npsNet * 10.0) / 10.0); // round to 1 decimal place

        return summary;
    }
}
