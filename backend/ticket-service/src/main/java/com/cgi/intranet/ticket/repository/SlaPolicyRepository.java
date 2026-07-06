package com.cgi.intranet.ticket.repository;

import com.cgi.intranet.ticket.entity.SlaPolicy;
import com.cgi.intranet.ticket.enums.TicketCriticality;
import com.cgi.intranet.ticket.enums.TicketPriority;
import com.cgi.intranet.ticket.enums.TicketType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, Long> {

    List<SlaPolicy> findAllByOrderByActiveDescNameAsc();

    Optional<SlaPolicy> findFirstByActiveTrueAndIncidentTypeAndPriorityAndCriticality(
            TicketType incidentType,
            TicketPriority priority,
            TicketCriticality criticality
    );
}
