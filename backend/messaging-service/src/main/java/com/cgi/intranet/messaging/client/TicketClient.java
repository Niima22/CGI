package com.cgi.intranet.messaging.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class TicketClient {

    private final RestClient restClient;

    public TicketClient(
            RestClient.Builder builder,
            @Value("${services.ticket.base-url}") String ticketBaseUrl
    ) {
        this.restClient = builder.baseUrl(ticketBaseUrl).build();
    }

    public void ensureTicketReadable(Long ticketId) {
        String bearerToken = resolveBearerToken();
        try {
            restClient.get()
                    .uri("/api/tickets/{ticketId}/access", ticketId)
                    .header(HttpHeaders.AUTHORIZATION, bearerToken)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.NotFound exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket introuvable", exception);
        } catch (HttpClientErrorException.Forbidden exception) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse a ce ticket", exception);
        } catch (HttpClientErrorException.Unauthorized exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required", exception);
        } catch (org.springframework.web.client.RestClientResponseException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Impossible de verifier l'acces ticket",
                    exception
            );
        }
    }

    private String resolveBearerToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthenticationToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return "Bearer " + jwtAuthenticationToken.getToken().getTokenValue();
    }
}
