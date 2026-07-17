package com.cgi.intranet.employee.excelimport;

import com.cgi.intranet.employee.excelimport.ImportDryRunModels.HistoricalKpiCandidate;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportSourceReference;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.SheetDryRunReport;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;

import java.util.Map;
import java.util.Set;

class KpiWorkbookDryRunProcessor {

    private static final Set<String> SHEETS_OF_INTEREST = Set.of(
            "daily prod",
            "w m ds m prod",
            "sco",
            "w m ds m qs",
            "daily ds m qs",
            "w m ds m nps",
            "km"
    );

    void process(Sheet sheet, ExcelDryRunSupport support) {
        String sheetKey = support.normalizer.normalizeKey(sheet.getSheetName());
        if (!SHEETS_OF_INTEREST.contains(sheetKey)) {
            return;
        }
        int beforeWarnings = support.report.getWarnings().size();
        int beforeErrors = support.report.getErrors().size();
        int beforeCandidates = support.report.getHistoricalKpis().size();
        int headerRowIndex = support.detectHeaderRow(sheet);
        Row headerRow = sheet.getRow(headerRowIndex);
        if (headerRow == null) {
            support.warning("MISSING_KPI_HEADER", "header", "KPI sheet header could not be detected", "", support.source(sheet, null, "header", null));
            return;
        }
        int candidateLimit = 2500;
        for (int r = headerRowIndex + 1; r <= sheet.getLastRowNum() && support.report.getHistoricalKpis().size() - beforeCandidates < candidateLimit; r++) {
            Row row = sheet.getRow(r);
            if (support.blankRow(row)) {
                continue;
            }
            String employee = findEmployee(row, support);
            if (employee == null && !isAggregateSheet(sheetKey)) {
                continue;
            }
            if (employee == null) {
                employee = support.normalizer.cleanText(support.normalizer.readCell(row.getCell(0), support.formatter, support.evaluator));
            }
            if (employee == null) {
                continue;
            }
            for (Cell cell : row) {
                if (cell.getColumnIndex() == 0 || support.report.getHistoricalKpis().size() - beforeCandidates >= candidateLimit) {
                    continue;
                }
                String displayed = support.normalizer.readCell(cell, support.formatter, support.evaluator);
                if (displayed == null) {
                    continue;
                }
                String indicator = support.normalizer.readCell(
                        headerRow.getCell(cell.getColumnIndex(), Row.MissingCellPolicy.RETURN_BLANK_AS_NULL),
                        support.formatter,
                        support.evaluator
                );
                if (indicator == null) {
                    continue;
                }
                ImportSourceReference source = support.source(sheet, row, "column-" + (cell.getColumnIndex() + 1), null);
                support.report.getHistoricalKpis().add(new HistoricalKpiCandidate(
                        employee,
                        inferPeriod(sheet, cell, support),
                        indicator,
                        displayed,
                        support.normalizer.isFormula(cell),
                        support.normalizer.formula(cell),
                        source
                ));
            }
        }
        support.report.getSheets().add(new SheetDryRunReport(
                support.sourceFile,
                sheet.getSheetName(),
                sheet.getPhysicalNumberOfRows(),
                support.report.getHistoricalKpis().size() - beforeCandidates,
                support.report.getWarnings().size() - beforeWarnings,
                support.report.getErrors().size() - beforeErrors
        ));
    }

    private String findEmployee(Row row, ExcelDryRunSupport support) {
        for (int c = 0; c <= Math.min(2, row.getLastCellNum()); c++) {
            String value = support.normalizer.normalizeFullName(
                    support.normalizer.readCell(row.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL), support.formatter, support.evaluator)
            );
            if (support.normalizer.looksLikePersonName(value)) {
                return value;
            }
        }
        return null;
    }

    private boolean isAggregateSheet(String sheetKey) {
        return sheetKey.contains("qs") || sheetKey.contains("nps") || sheetKey.equals("km");
    }

    private String inferPeriod(Sheet sheet, Cell cell, ExcelDryRunSupport support) {
        for (int r = Math.max(0, cell.getRowIndex() - 5); r >= 0 && r <= cell.getRowIndex(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            Cell periodCell = row.getCell(cell.getColumnIndex(), Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            String value = support.normalizer.readCell(periodCell, support.formatter, support.evaluator);
            if (value != null && support.normalizer.parseDate(value).isPresent()) {
                return value;
            }
        }
        return sheet.getSheetName();
    }
}
