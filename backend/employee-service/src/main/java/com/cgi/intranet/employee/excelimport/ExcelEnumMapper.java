package com.cgi.intranet.employee.excelimport;

import java.util.Optional;

public class ExcelEnumMapper {

    private final ExcelImportNormalizer normalizer;

    public ExcelEnumMapper(ExcelImportNormalizer normalizer) {
        this.normalizer = normalizer;
    }

    public Optional<String> ticketStatus(String value) {
        String key = normalizer.normalizeKey(value);
        return switch (key) {
            case "", "atteint" -> Optional.empty();
            case "a faire", "todo", "nouveau", "new", "open", "ouvert" -> Optional.of("TODO");
            case "assigne", "affecte" -> Optional.of("ASSIGNED");
            case "en cours", "execution", "traitement" -> Optional.of("IN_PROGRESS");
            case "en attente", "attente demandeur" -> Optional.of("WAITING_REQUESTER");
            case "resolu", "resolution" -> Optional.of("RESOLVED");
            case "ferme", "cloture" -> Optional.of("CLOSED");
            case "rejete", "annule", "echec" -> Optional.of("CANCELLED");
            default -> Optional.empty();
        };
    }

    public Optional<String> ticketPriority(String value) {
        String key = normalizer.normalizeKey(value);
        return switch (key) {
            case "", "p4", "basse", "faible", "low" -> Optional.of("LOW");
            case "p3", "moyenne", "medium" -> Optional.of("MEDIUM");
            case "p2", "haute", "high" -> Optional.of("HIGH");
            case "p1", "critique", "urgent", "urgente" -> Optional.of("URGENT");
            default -> Optional.empty();
        };
    }

    public Optional<String> ticketCriticality(String value) {
        String key = normalizer.normalizeKey(value);
        return switch (key) {
            case "", "basse", "faible", "low" -> Optional.of("LOW");
            case "moyenne", "medium" -> Optional.of("MEDIUM");
            case "haute", "high" -> Optional.of("HIGH");
            case "critique", "critical" -> Optional.of("CRITICAL");
            default -> Optional.empty();
        };
    }

    public Optional<String> slaStatus(String value) {
        String key = normalizer.normalizeKey(value);
        return switch (key) {
            case "", "ok", "respecte", "atteint" -> Optional.of("RESPECTED");
            case "en risque", "risk", "at risk" -> Optional.of("AT_RISK");
            case "ko", "depasse", "breached", "echec" -> Optional.of("BREACHED");
            default -> Optional.empty();
        };
    }
}
