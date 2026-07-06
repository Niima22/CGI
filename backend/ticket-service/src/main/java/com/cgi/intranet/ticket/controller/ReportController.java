package com.cgi.intranet.ticket.controller;

import com.cgi.intranet.ticket.service.ReportService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping(value = "/kpi-sla/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadKpiSlaPdfReport() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, attachment("rapport-kpi-sla-cgi-flow.pdf"))
                .contentType(MediaType.APPLICATION_PDF)
                .body(reportService.generateKpiSlaPdfReport());
    }

    @GetMapping(value = "/sla/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadSlaPdfReport() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, attachment("rapport-sla-cgi-flow.pdf"))
                .contentType(MediaType.APPLICATION_PDF)
                .body(reportService.generateSlaPdfReport());
    }

    private String attachment(String filename) {
        return ContentDisposition.attachment()
                .filename(filename)
                .build()
                .toString();
    }
}
