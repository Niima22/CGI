package com.cgi.intranet.planning.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record PlanningAgentSyncRequest(
        @NotEmpty List<@Valid PlanningAgentSyncItemRequest> agents,
        boolean deactivateMissing
) {
}
