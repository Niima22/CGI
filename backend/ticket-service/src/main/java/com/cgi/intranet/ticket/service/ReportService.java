package com.cgi.intranet.ticket.service;

public interface ReportService {

    byte[] generateKpiSlaPdfReport();

    byte[] generateSlaPdfReport();
}
