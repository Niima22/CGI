package com.cgi.intranet.ticket.service;

import com.cgi.intranet.ticket.dto.response.EmployeeProductivityKpiResponse;
import com.cgi.intranet.ticket.dto.response.EmployeeWorkloadKpiResponse;
import com.cgi.intranet.ticket.dto.response.KpiEmployeeSummaryResponse;

import java.util.List;

public interface KpiService {

    List<EmployeeWorkloadKpiResponse> getEmployeeWorkload(Integer limit, String sort);

    List<EmployeeProductivityKpiResponse> getEmployeeProductivity(Integer limit, String sort);

    KpiEmployeeSummaryResponse getEmployeeSummary();
}
