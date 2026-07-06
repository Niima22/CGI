package com.cgi.intranet.ticket.util;

import com.cgi.intranet.ticket.repository.TicketRepository;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class TicketReferenceGenerator {

    private final TicketRepository ticketRepository;

    public TicketReferenceGenerator(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    public String nextReference() {
        int year = Year.now().getValue();
        long sequence = 1L;
        String candidate;

        do {
            candidate = "TCK-" + year + "-" + String.format("%06d", sequence++);
        } while (ticketRepository.existsByReference(candidate));

        return candidate;
    }
}
