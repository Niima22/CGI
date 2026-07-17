package com.cgi.intranet.employee.excelimport;

import com.cgi.intranet.employee.excelimport.ImportDryRunModels.EmployeeImportCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportDryRunReport;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportSourceReference;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.SheetDryRunReport;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.TicketImportCandidate;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;

import java.time.LocalDateTime;
import java.util.Map;

class CgiCasaDryRunProcessor {

    void process(Sheet sheet, ExcelDryRunSupport support) {
        int beforeWarnings = support.report.getWarnings().size();
        int beforeErrors = support.report.getErrors().size();
        int beforeCandidates = support.report.getTickets().size() + support.report.getEmployees().size();
        Map<String, Integer> headers = support.headerMap(sheet);
        int headerRow = support.detectHeaderRow(sheet);
        for (int r = headerRow + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (support.blankRow(row)) {
                continue;
            }
            String reference = support.reference(row, headers, "ID");
            ImportSourceReference source = support.source(sheet, row, "ID", reference);
            String title = support.normalizer.cleanText(support.value(row, headers, "Titre"));
            String description = support.normalizer.cleanText(support.value(row, headers, "Description"));
            String solution = support.normalizer.cleanText(support.value(row, headers, "Solution"));
            String resolver = support.normalizer.normalizeFullName(support.value(row, headers, "Résolu par Nom", "Resolu par Nom"));
            String bannette = support.normalizer.normalizeBannette(support.value(row, headers, "Groupe d'affectation Nom"));
            LocalDateTime resolvedAt = support.normalizer.parseDateTime(
                    support.cell(row, headers, "Date/Heure de résolution", "Date de résolution"),
                    support.formatter,
                    support.evaluator
            ).orElse(null);

            if (reference == null) {
                support.error("MISSING_EXTERNAL_REFERENCE", "externalReference", "Ticket reference is required", "", source);
            }
            if (title == null) {
                support.error("BLANK_TITLE", "title", "Ticket title is required", "", source);
            }
            if (resolver == null) {
                support.warning("UNKNOWN_ASSIGNED_RESOLVER", "resolverName", "Resolved ticket has no resolver", "", source);
            }
            if (bannette == null) {
                support.warning("UNKNOWN_BANNETTE", "bannette", "Ticket group cannot be mapped to a bannette", "", source);
            }
            if (resolvedAt == null) {
                support.warning("INVALID_RESOLUTION_DATE", "resolvedAt", "Resolution date is missing or unreadable", "", source);
            }

            support.report.getTickets().add(new TicketImportCandidate(
                    reference,
                    title,
                    description,
                    solution,
                    "RESOLVED",
                    null,
                    null,
                    bannette,
                    null,
                    resolver,
                    null,
                    resolvedAt,
                    null,
                    null,
                    support.duplicates().classify("ticket", reference == null ? support.sourceFile + "|" + sheet.getSheetName() + "|" + (row.getRowNum() + 1) : support.normalizer.normalizeKey(reference), support.sourceFile),
                    source
            ));
            if (resolver != null) {
                support.report.getEmployees().add(new EmployeeImportCandidate(
                        resolver,
                        support.normalizer.firstName(resolver),
                        support.normalizer.lastName(resolver),
                        null,
                        support.normalizer.usernameProposal(resolver),
                        null,
                        bannette,
                        "EMPLOYEE",
                        support.duplicates().classify("employee", support.normalizer.normalizeKey(resolver) + "|" + support.normalizer.normalizeKey(bannette), support.sourceFile),
                        support.source(sheet, row, "Résolu par Nom", reference)
                ));
            }
        }
        support.report.getSheets().add(new SheetDryRunReport(
                support.sourceFile,
                sheet.getSheetName(),
                sheet.getPhysicalNumberOfRows(),
                support.report.getTickets().size() + support.report.getEmployees().size() - beforeCandidates,
                support.report.getWarnings().size() - beforeWarnings,
                support.report.getErrors().size() - beforeErrors
        ));
    }
}
