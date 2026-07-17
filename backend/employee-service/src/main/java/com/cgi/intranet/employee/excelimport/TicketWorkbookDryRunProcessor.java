package com.cgi.intranet.employee.excelimport;

import com.cgi.intranet.employee.excelimport.ImportDryRunModels.BannetteManagerCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.EmployeeImportCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportDryRunReport;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportSourceReference;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.SheetDryRunReport;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.TicketImportCandidate;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

class TicketWorkbookDryRunProcessor {

    void process(Sheet sheet, ExcelDryRunSupport support) {
        String sheetName = support.normalizer.normalizeKey(sheet.getSheetName());
        int beforeWarnings = support.report.getWarnings().size();
        int beforeErrors = support.report.getErrors().size();
        int beforeCandidates = candidateCount(support.report);

        if (sheetName.equals("dictionnaire")) {
            processDictionnaire(sheet, support);
        } else if (sheetName.equals("detail agent")) {
            processDetailAgent(sheet, support);
        } else if (sheetName.equals("rejets")) {
            processRejets(sheet, support);
        } else if (sheetName.equals("publipostage")) {
            processPublipostage(sheet, support);
        }

        support.report.getSheets().add(new SheetDryRunReport(
                support.sourceFile,
                sheet.getSheetName(),
                Math.max(0, sheet.getPhysicalNumberOfRows()),
                candidateCount(support.report) - beforeCandidates,
                support.report.getWarnings().size() - beforeWarnings,
                support.report.getErrors().size() - beforeErrors
        ));
    }

    private void processDictionnaire(Sheet sheet, ExcelDryRunSupport support) {
        Map<String, Integer> headers = support.headerMap(sheet);
        Map<String, String> managerByBannette = new HashMap<>();
        int headerRow = support.detectHeaderRow(sheet);
        for (int r = headerRow + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (support.blankRow(row)) {
                continue;
            }
            String bannette = support.normalizer.normalizeBannette(support.value(row, headers, "Bannete", "Bannette"));
            String manager = support.normalizer.normalizeFullName(support.value(row, headers, "Responsable", "Responsable"));
            ImportSourceReference source = support.source(sheet, row, "Bannette/Responsable", null);
            if (bannette == null) {
                support.error("BLANK_BANNETTE", "bannette", "Bannette is required", "", source);
                continue;
            }
            if (manager == null) {
                support.warning("MISSING_BANNETTE_MANAGER", "manager", "Bannette has no identified manager", "", source);
            }
            String previous = managerByBannette.putIfAbsent(bannette, manager);
            if (previous != null && manager != null && !support.normalizer.normalizeKey(previous).equals(support.normalizer.normalizeKey(manager))) {
                support.warning("CONFLICTING_BANNETTE_MANAGER", "manager", "Same bannette is associated with multiple managers", manager, source);
                support.bannetteConflict(bannette, previous, source);
                support.bannetteConflict(bannette, manager, source);
            }
            support.report.getBannetteMappings().add(new BannetteManagerCandidate(
                    bannette,
                    manager,
                    support.duplicates().classify("bannette", support.normalizer.normalizeKey(bannette), support.sourceFile),
                    source
            ));
            if (manager != null) {
                addManagerCandidate(manager, bannette, sheet, row, support);
            }
        }
    }

    private void addManagerCandidate(String manager, String bannette, Sheet sheet, Row row, ExcelDryRunSupport support) {
        String key = support.normalizer.normalizeKey(manager) + "|" + support.normalizer.normalizeKey(bannette);
        support.report.getEmployees().add(new EmployeeImportCandidate(
                manager,
                support.normalizer.firstName(manager),
                support.normalizer.lastName(manager),
                null,
                support.normalizer.usernameProposal(manager),
                null,
                bannette,
                "MANAGER",
                support.duplicates().classify("employee", key, support.sourceFile),
                support.source(sheet, row, "Responsable", null)
        ));
    }

    private void processDetailAgent(Sheet sheet, ExcelDryRunSupport support) {
        Map<String, Integer> headers = support.headerMap(sheet);
        Map<String, String> bannetteByEmployee = new HashMap<>();
        int headerRow = support.detectHeaderRow(sheet);
        for (int r = headerRow + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (support.blankRow(row)) {
                continue;
            }
            String fullName = support.normalizer.normalizeFullName(support.value(row, headers, "Resolu par", "Résolu par"));
            String bannette = support.normalizer.normalizeBannette(support.value(row, headers, "Bannette"));
            ImportSourceReference source = support.source(sheet, row, "Resolu par/Bannette", null);
            if (fullName == null) {
                support.error("BLANK_FULL_NAME", "fullName", "Employee full name is required", "", source);
                continue;
            }
            if (bannette == null) {
                support.error("UNKNOWN_BANNETTE", "bannette", "Employee row has no bannette", "", source);
            }
            String previousBannette = bannetteByEmployee.putIfAbsent(support.normalizer.normalizeKey(fullName), bannette);
            if (previousBannette != null && bannette != null && !previousBannette.equals(bannette)) {
                support.warning("EMPLOYEE_MULTIPLE_BANNETTES", "bannette", "Employee appears in multiple bannettes", fullName, source);
            }
            String duplicateKey = support.normalizer.normalizeKey(fullName) + "|" + support.normalizer.normalizeKey(bannette);
            support.report.getEmployees().add(new EmployeeImportCandidate(
                    fullName,
                    support.normalizer.firstName(fullName),
                    support.normalizer.lastName(fullName),
                    null,
                    support.normalizer.usernameProposal(fullName),
                    null,
                    bannette,
                    "EMPLOYEE",
                    support.duplicates().classify("employee", duplicateKey, support.sourceFile),
                    source
            ));
        }
    }

    private void processRejets(Sheet sheet, ExcelDryRunSupport support) {
        Map<String, Integer> headers = support.headerMap(sheet);
        int headerRow = support.detectHeaderRow(sheet);
        for (int r = headerRow + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (support.blankRow(row)) {
                continue;
            }
            String reference = support.reference(row, headers, "ID TICKET", "ID Ticket", "N° Ticket");
            ImportSourceReference source = support.source(sheet, row, "ID TICKET", reference);
            String title = support.normalizer.cleanText(support.value(row, headers, "TITRE", "Titre"));
            String rawStatus = support.value(row, headers, "STATUT", "ETAT CIBLE", "TYPE CIBLE");
            String rawPriority = support.value(row, headers, "PRIORITE", "PRIORITÉ");
            String status = support.enumMapper.ticketStatus(rawStatus).orElse(null);
            String priority = support.enumMapper.ticketPriority(rawPriority).orElse(null);
            String slaStatus = support.enumMapper.slaStatus(support.value(row, headers, "ETAT TTR")).orElse(null);
            LocalDateTime createdAt = support.normalizer.parseDateTime(support.cell(row, headers, "DATE CREATION"), support.formatter, support.evaluator).orElse(null);
            LocalDateTime resolvedAt = support.normalizer.parseDateTime(support.cell(row, headers, "DATE RESOLUTION"), support.formatter, support.evaluator).orElse(null);
            String bannette = support.normalizer.normalizeBannette(support.value(row, headers, "BANNETTE RESOLUTION", "Bannette"));
            String resolver = support.normalizer.normalizeFullName(support.value(row, headers, "Responsable", "Résponsable"));

            validateTicket(reference, title, rawStatus, status, rawPriority, priority, createdAt, resolvedAt, bannette, source, support);

            support.report.getTickets().add(new TicketImportCandidate(
                    reference,
                    title,
                    null,
                    null,
                    status,
                    priority,
                    slaStatus,
                    bannette,
                    null,
                    resolver,
                    createdAt,
                    resolvedAt,
                    support.normalizer.parseDouble(support.value(row, headers, "DUREE TTR (H)")),
                    support.normalizer.parseDouble(support.value(row, headers, "CIBLE (H)")),
                    support.duplicates().classify("ticket", ticketKey(reference, support, sheet, row), support.sourceFile),
                    source
            ));
        }
    }

    private void processPublipostage(Sheet sheet, ExcelDryRunSupport support) {
        Map<String, Integer> headers = support.headerMap(sheet);
        int headerRow = support.detectHeaderRow(sheet);
        for (int r = headerRow + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (support.blankRow(row)) {
                continue;
            }
            String reference = support.reference(row, headers, "N° Ticket", "Nr ticket", "ID Ticket");
            String email = support.normalizer.normalizeEmail(support.value(row, headers, "Adresse mail"));
            ImportSourceReference source = support.source(sheet, row, "Adresse mail", reference);
            if (email != null && !support.normalizer.isValidEmail(email)) {
                support.error("INVALID_EMAIL", "requesterEmail", "Requester email is invalid", support.normalizer.maskEmail(email), source);
            }
            if (reference == null) {
                support.warning("MISSING_TICKET_REFERENCE", "externalReference", "Requester contact row cannot be linked without ticket reference", "", source);
            }
            if (email != null && support.normalizer.isValidEmail(email)) {
                support.report.getTickets().add(new TicketImportCandidate(
                        reference,
                        "Requester contact reference",
                        null,
                        null,
                        null,
                        null,
                        null,
                        support.normalizer.normalizeBannette(support.value(row, headers, "Bannette")),
                        email,
                        support.normalizer.normalizeFullName(support.value(row, headers, "Responsable action", "Résponsable action")),
                        null,
                        null,
                        null,
                        null,
                        support.duplicates().classify("ticket-contact", ticketKey(reference, support, sheet, row), support.sourceFile),
                        source
                ));
            }
        }
    }

    private void validateTicket(
            String reference,
            String title,
            String rawStatus,
            String status,
            String rawPriority,
            String priority,
            LocalDateTime createdAt,
            LocalDateTime resolvedAt,
            String bannette,
            ImportSourceReference source,
            ExcelDryRunSupport support
    ) {
        if (reference == null) {
            support.error("MISSING_EXTERNAL_REFERENCE", "externalReference", "Ticket reference is required", "", source);
        }
        if (title == null) {
            support.error("BLANK_TITLE", "title", "Ticket title is required", "", source);
        }
        if (rawStatus != null && status == null) {
            support.unknownEnum("ticketStatus", rawStatus, source);
        }
        if (rawPriority != null && priority == null) {
            support.unknownEnum("ticketPriority", rawPriority, source);
        }
        if (createdAt == null) {
            support.warning("INVALID_CREATION_DATE", "createdAt", "Ticket creation date is missing or unreadable", "", source);
        }
        if (createdAt != null && resolvedAt != null && resolvedAt.isBefore(createdAt)) {
            support.error("RESOLUTION_BEFORE_CREATION", "resolvedAt", "Ticket resolution is before creation", "", source);
        }
        if (bannette == null) {
            support.warning("UNKNOWN_BANNETTE", "bannette", "Ticket refers to an unknown bannette", "", source);
        }
    }

    private String ticketKey(String reference, ExcelDryRunSupport support, Sheet sheet, Row row) {
        if (reference != null) {
            return support.normalizer.normalizeKey(reference);
        }
        return support.sourceFile + "|" + sheet.getSheetName() + "|" + (row.getRowNum() + 1);
    }

    private int candidateCount(ImportDryRunReport report) {
        return report.getBannetteMappings().size()
                + report.getEmployees().size()
                + report.getTickets().size()
                + report.getPlannings().size()
                + report.getHistoricalKpis().size();
    }
}
