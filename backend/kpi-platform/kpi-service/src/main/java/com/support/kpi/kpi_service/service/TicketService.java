package com.support.kpi.kpi_service.service;

import com.support.kpi.kpi_service.entity.ActionTicket;
import com.support.kpi.kpi_service.entity.Ticket;
import com.support.kpi.kpi_service.repository.ActionTicketRepository;
import com.support.kpi.kpi_service.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final ActionTicketRepository actionTicketRepository;

    public List<Ticket> getTicketsByAgent(String agentCodeGdi, String from, String to) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().minusDays(90);
        LocalDate toDate = to != null ? LocalDate.parse(to) : LocalDate.now();
        return ticketRepository.findByAgentCodeGdiAndDateCreationBetween(agentCodeGdi, fromDate, toDate);
    }

    public List<ActionTicket> getActionsByTicketId(Long ticketId) {
        return actionTicketRepository.findByTicketId(ticketId);
    }

    public Optional<Ticket> getTicketById(Long ticketId) {
        return ticketRepository.findByTicketId(ticketId);
    }

    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }
}
