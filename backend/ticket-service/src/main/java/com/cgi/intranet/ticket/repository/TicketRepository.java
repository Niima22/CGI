package com.cgi.intranet.ticket.repository;

import com.cgi.intranet.ticket.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findAllByDeletedFalseOrderByCreatedAtDesc();

    Optional<Ticket> findByIdAndDeletedFalse(Long id);

    List<Ticket> findByRequesterIdAndDeletedFalseOrderByCreatedAtDesc(Long requesterId);

    List<Ticket> findByAssignedUserIdAndDeletedFalseOrderByCreatedAtDesc(Long assignedUserId);

    List<Ticket> findAllByIdInAndDeletedFalse(List<Long> ids);

    boolean existsByReference(String reference);
}
