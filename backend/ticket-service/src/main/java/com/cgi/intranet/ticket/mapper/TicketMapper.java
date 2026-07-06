package com.cgi.intranet.ticket.mapper;

import com.cgi.intranet.ticket.dto.request.TicketCreateRequest;
import com.cgi.intranet.ticket.dto.request.TicketUpdateRequest;
import com.cgi.intranet.ticket.dto.response.TicketResponse;
import com.cgi.intranet.ticket.entity.Ticket;
import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketType;
import com.cgi.intranet.ticket.util.TicketLabelResolver;
import org.springframework.stereotype.Component;

@Component
public class TicketMapper {

    public Ticket toEntity(TicketCreateRequest request) {
        Ticket ticket = new Ticket();
        ticket.setTitle(clean(request.title()));
        ticket.setDescription(clean(request.description()));
        ticket.setType(request.type() == null ? TicketType.INCIDENT : request.type());
        ticket.setCategory(clean(request.category()));
        ticket.setSubCategory(clean(request.subCategory()));
        ticket.setPriority(request.priority() == null ? TicketPriority.MEDIUM : request.priority());
        ticket.setCriticality(request.criticality() == null ? TicketCriticality.MEDIUM : request.criticality());
        ticket.setDepartmentId(request.departmentId());
        return ticket;
    }

    public TicketResponse toResponse(Ticket ticket) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getReference(),
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getStatus(),
                TicketLabelResolver.statusLabel(ticket.getStatus()),
                ticket.getType(),
                TicketLabelResolver.typeLabel(ticket.getType()),
                ticket.getCategory(),
                ticket.getSubCategory(),
                ticket.getPriority(),
                TicketLabelResolver.priorityLabel(ticket.getPriority()),
                ticket.getCriticality(),
                TicketLabelResolver.criticalityLabel(ticket.getCriticality()),
                ticket.getRequesterId(),
                ticket.getAssignedUserId(),
                ticket.getAssignedTeamId(),
                ticket.getDepartmentId(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                ticket.getAssignedAt(),
                ticket.getStartedAt(),
                ticket.getResolvedAt(),
                ticket.getClosedAt()
        );
    }

    public void updateEntity(Ticket ticket, TicketUpdateRequest request) {
        if (request.title() != null) {
            ticket.setTitle(clean(request.title()));
        }
        if (request.description() != null) {
            ticket.setDescription(clean(request.description()));
        }
        if (request.type() != null) {
            ticket.setType(request.type());
        }
        if (request.category() != null) {
            ticket.setCategory(clean(request.category()));
        }
        if (request.subCategory() != null) {
            ticket.setSubCategory(clean(request.subCategory()));
        }
        if (request.status() != null) {
            ticket.setStatus(request.status());
        }
        if (request.priority() != null) {
            ticket.setPriority(request.priority());
        }
        if (request.criticality() != null) {
            ticket.setCriticality(request.criticality());
        }
        if (request.assignedUserId() != null) {
            ticket.setAssignedUserId(request.assignedUserId());
        }
        if (request.assignedTeamId() != null) {
            ticket.setAssignedTeamId(request.assignedTeamId());
        }
        if (request.departmentId() != null) {
            ticket.setDepartmentId(request.departmentId());
        }
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
