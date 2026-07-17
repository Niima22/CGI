package com.support.kpi.kpi_service.repository;

import com.support.kpi.kpi_service.entity.ActionTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ActionTicketRepository extends JpaRepository<ActionTicket, Long> {
    List<ActionTicket> findByAgentCodeGdiAndDateActionBetween(String agentCodeGdi, LocalDate from, LocalDate to);
    List<ActionTicket> findByTicketId(Long ticketId);
}
