package com.cgi.intranet.ticket.repository;

import com.cgi.intranet.ticket.entity.TicketSla;
import com.cgi.intranet.ticket.enums.SlaStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TicketSlaRepository extends JpaRepository<TicketSla, Long> {

    Optional<TicketSla> findByTicketId(Long ticketId);

    List<TicketSla> findAllByTicketIdIn(Collection<Long> ticketIds);

    List<TicketSla> findAllByGlobalStatusIn(Collection<SlaStatus> statuses);
}
