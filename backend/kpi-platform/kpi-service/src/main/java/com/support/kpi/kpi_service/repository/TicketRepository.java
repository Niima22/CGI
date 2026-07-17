package com.support.kpi.kpi_service.repository;

import com.support.kpi.kpi_service.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    Optional<Ticket> findByTicketId(Long ticketId);
    List<Ticket> findByAgentCodeGdiAndDateCreationBetween(String agentCodeGdi, LocalDate from, LocalDate to);
}
