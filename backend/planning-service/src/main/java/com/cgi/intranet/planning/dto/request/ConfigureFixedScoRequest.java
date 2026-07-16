package com.cgi.intranet.planning.dto.request;

import jakarta.validation.constraints.NotNull;

public record ConfigureFixedScoRequest(
        @NotNull Long agentId
) {
}
