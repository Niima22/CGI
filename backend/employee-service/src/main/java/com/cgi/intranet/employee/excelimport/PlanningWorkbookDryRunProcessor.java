package com.cgi.intranet.employee.excelimport;

import com.cgi.intranet.employee.excelimport.ImportDryRunModels.EmployeeImportCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportSourceReference;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.PlanningCandidateType;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.PlanningIdentityStatus;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.PlanningImportCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.PlanningSheetLayoutReport;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.SheetDryRunReport;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

class PlanningWorkbookDryRunProcessor {

    private static final Set<String> SUPPORTED_SHEETS = Set.of("fo new", "sup", "new bo", "vus", "bo", "fo2");

    void process(Sheet sheet, ExcelDryRunSupport support) {
        String sheetKey = support.normalizer.normalizeKey(sheet.getSheetName()).replace(" ", "");
        boolean supported = SUPPORTED_SHEETS.stream()
                .map(value -> value.replace(" ", ""))
                .anyMatch(sheetKey::contains);
        if (!supported) {
            return;
        }

        int beforeWarnings = support.report.getWarnings().size();
        int beforeErrors = support.report.getErrors().size();
        int beforeCandidates = support.report.getPlannings().size() + support.report.getEmployees().size();
        PlanningLayout layout = detectLayout(sheet, support);
        Map<Integer, LocalDate> dateByColumn = layout.dateByColumn();
        String bannette = support.normalizer.normalizeBannette(sheet.getSheetName());

        if (dateByColumn.isEmpty()) {
            support.warning("NO_PLANNING_DATES", "date", "No planning date columns were detected", "", support.source(sheet, null, "date", null));
        }
        int employeeRows = 0;
        int ignoredRows = 0;
        int ambiguousRows = 0;

        for (Row row : sheet) {
            String employeeName = findEmployeeName(row, support, layout.employeeNameColumn());
            if (employeeName == null) {
                if (!support.blankRow(row)) {
                    ignoredRows++;
                    support.ignored("planning");
                }
                continue;
            }
            employeeRows++;
            support.report.getEmployees().add(new EmployeeImportCandidate(
                    employeeName,
                    support.normalizer.firstName(employeeName),
                    support.normalizer.lastName(employeeName),
                    null,
                    support.normalizer.usernameProposal(employeeName),
                    null,
                    bannette,
                    "EMPLOYEE",
                    support.duplicates().classify("planning-employee", support.normalizer.normalizeKey(employeeName) + "|" + support.normalizer.normalizeKey(bannette), support.sourceFile),
                    support.source(sheet, row, "agent", null)
            ));

            for (Map.Entry<Integer, LocalDate> entry : dateByColumn.entrySet()) {
                Cell cell = row.getCell(entry.getKey(), Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                String raw = support.normalizer.cleanText(support.normalizer.readCell(cell, support.formatter, support.evaluator));
                if (raw == null) {
                    continue;
                }
                PlanningCandidateType type = classifyPlanningValue(raw, support);
                if (type == null) {
                    if (looksLikeInvalidShiftAttempt(raw, support)) {
                        support.error("INVALID_SHIFT_TEXT", "shift", "Planning cell value looks like a malformed time range", raw, support.source(sheet, row, columnName(entry.getKey()), null));
                    } else if (isIgnorablePlanningValue(raw, support)) {
                        support.ignored("planning");
                    } else {
                        ambiguousRows++;
                        support.error("INVALID_SHIFT_TEXT", "shift", "Planning cell value is not a recognized shift, absence, leave, or rest day", raw, support.source(sheet, row, columnName(entry.getKey()), null));
                        support.planningUnknown(raw, sheet, row);
                    }
                    continue;
                }
                ExcelImportNormalizer.ShiftRange range = null;
                if (type == PlanningCandidateType.SHIFT) {
                    range = support.normalizer.parseShiftRange(raw).orElse(null);
                    if (range == null) {
                        support.error("INVALID_SHIFT_TEXT", "shift", "Shift time range cannot be parsed", raw, support.source(sheet, row, columnName(entry.getKey()), null));
                        continue;
                    }
                    if (range.isInverted()) {
                        support.warning("OVERNIGHT_SHIFT", "shift", "Shift appears to cross midnight; preserve for Phase 3 decision", raw, support.source(sheet, row, columnName(entry.getKey()), null));
                    }
                }
                String key = support.normalizer.normalizeKey(employeeName) + "|" + entry.getValue() + "|" + raw;
                support.report.getPlannings().add(new PlanningImportCandidate(
                        employeeName,
                        bannette,
                        entry.getValue(),
                        type,
                        range == null ? null : range.startTime(),
                        range == null ? null : range.endTime(),
                        raw,
                        PlanningIdentityStatus.POSSIBLE_MATCH,
                        support.duplicates().classify("planning", key, support.sourceFile),
                        support.source(sheet, row, columnName(entry.getKey()), null)
                ));
            }
        }
        support.report.getPlanningSheetLayouts().add(new PlanningSheetLayoutReport(
                sheet.getSheetName(),
                layout.headerRows(),
                columnName(layout.employeeNameColumn()),
                dateByColumn.keySet().stream().min(Comparator.naturalOrder()).map(this::columnName).orElse(""),
                dateByColumn.keySet().stream().max(Comparator.naturalOrder()).map(this::columnName).orElse(""),
                dateByColumn.size(),
                employeeRows,
                ignoredRows,
                ambiguousRows
        ));

        support.report.getSheets().add(new SheetDryRunReport(
                support.sourceFile,
                sheet.getSheetName(),
                sheet.getPhysicalNumberOfRows(),
                support.report.getPlannings().size() + support.report.getEmployees().size() - beforeCandidates,
                support.report.getWarnings().size() - beforeWarnings,
                support.report.getErrors().size() - beforeErrors
        ));
    }

    Map<Integer, LocalDate> detectDateColumns(Sheet sheet, ExcelDryRunSupport support) {
        return detectLayout(sheet, support).dateByColumn();
    }

    PlanningLayout detectLayout(Sheet sheet, ExcelDryRunSupport support) {
        Map<Integer, LocalDate> dates = new LinkedHashMap<>();
        int defaultYear = 2026;
        int employeeColumn = -1;
        StringBuilder headerRows = new StringBuilder();
        for (int r = Math.max(0, sheet.getFirstRowNum()); r <= Math.min(sheet.getLastRowNum(), sheet.getFirstRowNum() + 40); r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            boolean rowHasDate = false;
            for (Cell cell : row) {
                LocalDate date = support.normalizer.parseDate(cell, support.formatter, support.evaluator)
                        .orElseGet(() -> support.normalizer.parseDateWithDefaultYear(
                                support.normalizer.readCell(cell, support.formatter, support.evaluator),
                                defaultYear
                        ));
                if (date != null) {
                    if (cell.getColumnIndex() > 0) {
                        dates.putIfAbsent(cell.getColumnIndex(), date);
                        rowHasDate = true;
                    }
                }
                String key = support.normalizer.normalizeKey(support.normalizer.readCell(cell, support.formatter, support.evaluator));
                if (employeeColumn < 0 && key.matches(".*(agent|agents|nom prenom|collaborateur).*")) {
                    employeeColumn = cell.getColumnIndex();
                }
            }
            if (rowHasDate) {
                if (!headerRows.isEmpty()) {
                    headerRows.append("|");
                }
                headerRows.append(r + 1);
            }
        }
        if (dates.size() < 3) {
            Row header = findAgentHeaderRow(sheet, support);
            if (header != null) {
                for (Cell cell : header) {
                    String raw = support.normalizer.readCell(cell, support.formatter, support.evaluator);
                    LocalDate date = support.normalizer.parseDateWithDefaultYear(raw, defaultYear);
                    if (date != null) {
                        dates.putIfAbsent(cell.getColumnIndex(), date);
                    }
                }
            }
        }
        if (employeeColumn < 0) {
            employeeColumn = inferEmployeeNameColumn(sheet, dates, support);
        }
        return new PlanningLayout(
                dates,
                headerRows.isEmpty() ? "" : headerRows.toString(),
                Math.max(0, employeeColumn)
        );
    }

    private Row findAgentHeaderRow(Sheet sheet, ExcelDryRunSupport support) {
        for (Row row : sheet) {
            String joined = "";
            for (Cell cell : row) {
                String value = support.normalizer.readCell(cell, support.formatter, support.evaluator);
                if (value != null) {
                    joined += " " + support.normalizer.normalizeKey(value);
                }
            }
            if (joined.contains("agents") && joined.contains("lundi")) {
                return row;
            }
        }
        return null;
    }

    private int inferEmployeeNameColumn(Sheet sheet, Map<Integer, LocalDate> dates, ExcelDryRunSupport support) {
        int firstPlanningColumn = dates.keySet().stream().min(Integer::compareTo).orElse(2);
        Map<Integer, Integer> scores = new LinkedHashMap<>();
        for (Row row : sheet) {
            for (int c = 0; c < Math.min(firstPlanningColumn, 8); c++) {
                String value = support.normalizer.normalizeFullName(support.normalizer.readCell(row.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL), support.formatter, support.evaluator));
                if (isEmployeeNameValue(value, support)) {
                    scores.merge(c, 1, Integer::sum);
                }
            }
        }
        return scores.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(1);
    }

    private String findEmployeeName(Row row, ExcelDryRunSupport support, int employeeNameColumn) {
        if (row == null) {
            return null;
        }
        String value = support.normalizer.normalizeFullName(support.normalizer.readCell(row.getCell(employeeNameColumn, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL), support.formatter, support.evaluator));
        if (isEmployeeNameValue(value, support)) {
            return value;
        }
        return null;
    }

    private boolean isEmployeeNameValue(String value, ExcelDryRunSupport support) {
        if (!support.normalizer.looksLikePersonName(value) || classifyPlanningValue(value, support) != null) {
            return false;
        }
        String key = support.normalizer.normalizeKey(value);
        return !key.matches(".*(total|planning|semaine|agent|jour|heure|date|equipe|shift|pause).*");
    }

    private PlanningCandidateType classifyPlanningValue(String raw, ExcelDryRunSupport support) {
        String key = support.normalizer.normalizeKey(raw);
        if (key.isBlank()) {
            return null;
        }
        if (key.equals("off") || key.equals("repos")) {
            return PlanningCandidateType.REST_DAY;
        }
        if (key.equals("abs") || key.contains("absence")) {
            return PlanningCandidateType.ABSENCE;
        }
        if (key.contains("conge")) {
            return PlanningCandidateType.LEAVE;
        }
        return support.normalizer.parseShiftRange(raw).isPresent() ? PlanningCandidateType.SHIFT : null;
    }

    private boolean isIgnorablePlanningValue(String raw, ExcelDryRunSupport support) {
        String key = support.normalizer.normalizeKey(raw);
        return key.isBlank()
                || key.matches(".*(total|totaux|semaine|planning|agent|agents|jour|jours|date|heure|pause|amplitude|presence|effectif).*")
                || key.matches("\\d+")
                || key.matches("\\d+[,.]\\d+");
    }

    private boolean looksLikeInvalidShiftAttempt(String raw, ExcelDryRunSupport support) {
        String key = support.normalizer.normalizeKey(raw);
        return key.matches(".*\\d{1,2}\\s*(h|:).*")
                && (raw.contains("-") || raw.contains("→") || key.contains(" a ") || key.contains(" to "));
    }

    private String columnName(int index) {
        return "column-" + (index + 1);
    }

    record PlanningLayout(Map<Integer, LocalDate> dateByColumn, String headerRows, int employeeNameColumn) {
    }
}
