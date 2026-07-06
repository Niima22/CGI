package com.cgi.intranet.ticket.enums;

public enum TicketStatus {
    NEW,
    TODO,
    ASSIGNED,
    IN_PROGRESS,
    WAITING_REQUESTER,
    WAITING_PROVIDER,
    WAITING_MANAGER_VALIDATION,
    RESOLVED,
    CLOSED,
    REOPENED,
    CANCELLED
}
