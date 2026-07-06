package com.cgi.intranet.ticket.enums;

public enum NotificationType {
    TICKET_ASSIGNED,
    TICKET_REASSIGNED,
    TICKET_STATUS_UPDATED,
    TICKET_PENDING_REMINDER,
    SLA_AT_RISK,
    SLA_BREACHED,
    SLA_ESCALATION_LEVEL_1,
    SLA_ESCALATION_LEVEL_2;

    public String label() {
        return switch (this) {
            case TICKET_ASSIGNED -> "Ticket affecte";
            case TICKET_REASSIGNED -> "Ticket reaffecte";
            case TICKET_STATUS_UPDATED -> "Mise a jour du statut";
            case TICKET_PENDING_REMINDER -> "Rappel ticket en attente";
            case SLA_AT_RISK -> "SLA en risque";
            case SLA_BREACHED -> "SLA depasse";
            case SLA_ESCALATION_LEVEL_1 -> "Escalade superviseur";
            case SLA_ESCALATION_LEVEL_2 -> "Escalade administrateur";
        };
    }
}
