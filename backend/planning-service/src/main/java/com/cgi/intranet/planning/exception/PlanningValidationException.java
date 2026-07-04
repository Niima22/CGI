package com.cgi.intranet.planning.exception;

import com.cgi.intranet.planning.dto.response.PlanningProblemResponse;

import java.util.List;

public class PlanningValidationException extends RuntimeException {

    private final List<PlanningProblemResponse> problems;

    public PlanningValidationException(String message, List<PlanningProblemResponse> problems) {
        super(message);
        this.problems = List.copyOf(problems);
    }

    public List<PlanningProblemResponse> getProblems() {
        return problems;
    }
}
