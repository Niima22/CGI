package com.cgi.intranet.ticket.util;

import com.cgi.intranet.ticket.enums.NotificationType;
import com.cgi.intranet.ticket.enums.SlaStatus;
import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketHistoryActionType;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketStatus;
import com.cgi.intranet.ticket.enums.TicketType;

public final class TicketLabelResolver {

    private TicketLabelResolver() {
    }

    public static String statusLabel(TicketStatus status) {
        if (status == null) {
            return null;
        }
        return switch (status) {
            case NEW -> "Nouveau";
            case TODO -> "À faire";
            case ASSIGNED -> "Assigné";
            case IN_PROGRESS -> "En cours";
            case WAITING_REQUESTER -> "En attente demandeur";
            case WAITING_PROVIDER -> "En attente prestataire";
            case WAITING_MANAGER_VALIDATION -> "En attente validation manager";
            case RESOLVED -> "Résolu";
            case CLOSED -> "Fermé";
            case REOPENED -> "Rouvert";
            case CANCELLED -> "Annulé";
        };
    }

    public static String priorityLabel(TicketPriority priority) {
        if (priority == null) {
            return null;
        }
        return switch (priority) {
            case LOW -> "Faible";
            case MEDIUM -> "Moyenne";
            case HIGH -> "Haute";
            case URGENT -> "Urgente";
        };
    }

    public static String criticalityLabel(TicketCriticality criticality) {
        if (criticality == null) {
            return null;
        }
        return switch (criticality) {
            case LOW -> "Faible";
            case MEDIUM -> "Moyenne";
            case HIGH -> "Élevée";
            case CRITICAL -> "Critique";
        };
    }

    public static String typeLabel(TicketType type) {
        if (type == null) {
            return null;
        }
        return switch (type) {
            case INCIDENT -> "Incident";
            case REQUEST -> "Demande";
            case PROBLEM -> "Problème";
            case CHANGE -> "Changement";
        };
    }

    public static String slaStatusLabel(SlaStatus status) {
        if (status == null) {
            return null;
        }
        return switch (status) {
            case RESPECTED -> "Respecté";
            case AT_RISK -> "En risque";
            case BREACHED -> "Dépassé";
            case PAUSED -> "Suspendu";
            case NOT_APPLICABLE -> "Non applicable";
        };
    }

    public static String notificationTypeLabel(NotificationType type) {
        return type == null ? null : type.label();
    }

    public static String historyActionLabel(TicketHistoryActionType actionType) {
        if (actionType == null) {
            return null;
        }
        return switch (actionType) {
            case CREATED -> "Création";
            case UPDATED -> "Mise à jour";
            case STATUS_CHANGED -> "Changement de statut";
            case ASSIGNED -> "Affectation";
            case REASSIGNED -> "Réaffectation";
            case PRIORITY_CHANGED -> "Priorité modifiée";
            case CRITICALITY_CHANGED -> "Criticité modifiée";
            case RESOLVED -> "Résolution";
            case CLOSED -> "Clôture";
            case REOPENED -> "Réouverture";
            case CANCELLED -> "Annulation";
            case SLA_STARTED -> "SLA démarré";
            case SLA_AT_RISK -> "Ticket en risque SLA";
            case SLA_BREACHED -> "SLA dépassé";
            case SLA_ESCALATED_LEVEL_1 -> "Escalade superviseur";
            case SLA_ESCALATED_LEVEL_2 -> "Escalade administrateur";
            case SLA_RESPECTED -> "SLA respecté";
            case SLA_NOT_APPLICABLE -> "SLA non applicable";
        };
    }
}
