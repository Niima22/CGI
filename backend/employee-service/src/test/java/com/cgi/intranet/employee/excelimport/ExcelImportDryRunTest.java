package com.cgi.intranet.employee.excelimport;

import com.cgi.intranet.employee.excelimport.ImportDryRunModels.ImportDryRunReport;
import com.cgi.intranet.employee.excelimport.ImportDryRunModels.PlanningCandidateType;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class ExcelImportDryRunTest {

    private final ExcelImportNormalizer normalizer = new ExcelImportNormalizer();
    private final ExcelEnumMapper enumMapper = new ExcelEnumMapper(normalizer);

    @Test
    void normalizesFullNameAndPreservesAccents() {
        assertThat(normalizer.normalizeFullName("  Sara\u00A0  Él Amrani ")).isEqualTo("Sara Él Amrani");
    }

    @Test
    void normalizesBannetteAliases() {
        assertThat(normalizer.normalizeBannette("FR IT SIC N1_N2 SUPER-HYPER FRONT OFFICE")).isEqualTo("FO");
    }

    @Test
    void validatesAndMasksRequesterEmail() {
        assertThat(normalizer.isValidEmail("USER@CGI.COM")).isTrue();
        assertThat(normalizer.maskEmail("user@cgi.com")).isEqualTo("us***@cgi.com");
    }

    @Test
    void parsesFrenchDateFallback() {
        assertThat(normalizer.parseDate("07/04/2026")).contains(LocalDate.of(2026, 4, 7));
    }

    @Test
    void parsesFrenchDayMonthWithDefaultYear() {
        assertThat(normalizer.parseFrenchDayMonth("lundi 29 juin", 2026)).contains(LocalDate.of(2026, 6, 29));
    }

    @Test
    void preservesNumericTicketReference() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Cell cell = workbook.createSheet("s").createRow(0).createCell(0);
            cell.setCellValue(118396606D);
            assertThat(normalizer.readStableReference(cell, new org.apache.poi.ss.usermodel.DataFormatter(Locale.FRANCE), workbook.getCreationHelper().createFormulaEvaluator()))
                    .isEqualTo("118396606");
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void mapsFrenchStatusValues() {
        assertThat(enumMapper.ticketStatus("En cours")).contains("IN_PROGRESS");
        assertThat(enumMapper.ticketStatus("Résolu")).contains("RESOLVED");
    }

    @Test
    void mapsPriorityValues() {
        assertThat(enumMapper.ticketPriority("P2")).contains("HIGH");
        assertThat(enumMapper.ticketPriority("Urgente")).contains("URGENT");
    }

    @Test
    void handlesUnknownEnumValue() {
        assertThat(enumMapper.ticketStatus("Franchisé")).isEmpty();
    }

    @Test
    void detectsDuplicateEmployee() {
        ImportDryRunReport report = new ImportDryRunReport();
        ExcelDryRunSupport.DuplicateClassifier classifier = new ExcelDryRunSupport.DuplicateClassifier(report);
        assertThat(classifier.classify("employee", "sara|fo", "a.xlsx").name()).isEqualTo("UNIQUE");
        assertThat(classifier.classify("employee", "sara|fo", "a.xlsx").name()).isEqualTo("DUPLICATE_IN_WORKBOOK");
    }

    @Test
    void detectsDuplicateTicketAcrossWorkbooks() {
        ImportDryRunReport report = new ImportDryRunReport();
        ExcelDryRunSupport.DuplicateClassifier classifier = new ExcelDryRunSupport.DuplicateClassifier(report);
        classifier.classify("ticket", "118", "a.xlsx");
        assertThat(classifier.classify("ticket", "118", "b.xlsx").name()).isEqualTo("DUPLICATE_ACROSS_WORKBOOKS");
    }

    @Test
    void extractsDictionnaireManagerMapping() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Dictionnaire");
            row(sheet, 0, "Bannete", "Résponsable");
            row(sheet, 1, "FR IT SIC N1_N2 SUPER-HYPER FRONT OFFICE", "Yassine RABBAI");
            ImportDryRunReport report = runTicketSheet(workbook, sheet);
            assertThat(report.getBannetteMappings()).hasSize(1);
            assertThat(report.getBannetteMappings().get(0).normalizedBannette()).isEqualTo("FO");
            assertThat(report.getEmployees().get(0).expectedRole()).isEqualTo("MANAGER");
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void extractsDetailAgentEmployee() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Détail Agent");
            row(sheet, 2, "Résolu par", "Bannette");
            row(sheet, 3, "Abdelilah SAOUDI", "FO");
            ImportDryRunReport report = runTicketSheet(workbook, sheet);
            assertThat(report.getEmployees()).anyMatch(candidate -> candidate.normalizedFullName().equals("Abdelilah SAOUDI"));
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void extractsRejetsTicketCandidate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Rejets");
            row(sheet, 0, "ID TICKET", "TITRE", "PRIORITE", "STATUT", "BANNETTE RESOLUTION", "ETAT TTR");
            row(sheet, 1, "118396606", "Activer imprimante", "P4", "Résolution", "FR IT SIC N1_N2 PROMOCASH BACK OFFICE", "OK");
            ImportDryRunReport report = runTicketSheet(workbook, sheet);
            assertThat(report.getTickets().get(0).priority()).isEqualTo("LOW");
            assertThat(report.getTickets().get(0).slaStatus()).isEqualTo("RESPECTED");
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void validatesRequesterEmailInPublipostage() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Publipostage");
            row(sheet, 0, "N° Ticket", "Adresse mail");
            row(sheet, 1, "101809705", "bad-mail");
            ImportDryRunReport report = runTicketSheet(workbook, sheet);
            assertThat(report.getErrors()).anyMatch(error -> error.code().equals("INVALID_EMAIL"));
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void extractsCgiCasaTicketAndResolver() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Feuille 1");
            row(sheet, 0, "ID", "Titre", "Description", "Solution", "Résolu par Nom", "Groupe d'affectation Nom");
            row(sheet, 1, "118672044", "Commande bloquée", "Desc", "Solution", "FALLAH, Youness", "FR IT SIC N1_N2 SUPPLY");
            ImportDryRunReport report = runCgiCasaSheet(workbook, sheet);
            assertThat(report.getTickets()).hasSize(1);
            assertThat(report.getTickets().get(0).status()).isEqualTo("RESOLVED");
            assertThat(report.getEmployees()).hasSize(1);
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void detectsPlanningMatrixDateColumns() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("FO NEW");
            row(sheet, 0, "Semaine", "Agents", "lundi 29 juin", "mardi 30 juin");
            PlanningWorkbookDryRunProcessor processor = new PlanningWorkbookDryRunProcessor();
            assertThat(processor.detectDateColumns(sheet, support(workbook, "planning 1.xlsx"))).hasSize(2);
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void extractsPlanningShift() {
        ImportDryRunReport report = planningReportWithValue("08:00 - 17:00");
        assertThat(report.getPlannings()).hasSize(1);
        assertThat(report.getPlannings().get(0).type()).isEqualTo(PlanningCandidateType.SHIFT);
    }

    @Test
    void mapsOffToRestDay() {
        assertThat(planningReportWithValue("OFF").getPlannings().get(0).type()).isEqualTo(PlanningCandidateType.REST_DAY);
    }

    @Test
    void mapsAbsToAbsence() {
        assertThat(planningReportWithValue("ABS").getPlannings().get(0).type()).isEqualTo(PlanningCandidateType.ABSENCE);
    }

    @Test
    void mapsCongeToLeave() {
        assertThat(planningReportWithValue("Congé").getPlannings().get(0).type()).isEqualTo(PlanningCandidateType.LEAVE);
    }

    @Test
    void rejectsInvalidPlanningTime() {
        ImportDryRunReport report = planningReportWithValue("not a shift");
        assertThat(report.getErrors()).anyMatch(error -> error.code().equals("INVALID_SHIFT_TEXT"));
    }

    @Test
    void detectsKpiFormulaCell() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Daily-Prod.");
            row(sheet, 0, "Agent", "Résolus");
            Row data = sheet.createRow(1);
            data.createCell(0).setCellValue("Sara EL AMRANI");
            data.createCell(1).setCellFormula("1+1");
            ImportDryRunReport report = new ImportDryRunReport();
            new KpiWorkbookDryRunProcessor().process(sheet, support(workbook, "KPI - DS Magasin (1) (1).xlsx", report));
            assertThat(report.getHistoricalKpis()).anyMatch(candidate -> candidate.formulaCell() && candidate.formulaText().equals("1+1"));
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void dryRunServiceExcludesHrWorkbook() {
        ExcelImportDryRunService service = new ExcelImportDryRunService();
        assertThat(service.approvedFiles()).doesNotContain("MAR_Global_CDF__Form_v1.4.xlsm");
    }

    @Test
    void summaryCountsCandidates() {
        ImportDryRunReport report = planningReportWithValue("OFF");
        assertThat(report.summary()).containsEntry("planningCandidates", 1);
    }

    private ImportDryRunReport planningReportWithValue(String value) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("FO NEW");
            row(sheet, 0, "Semaine", "Agents", "lundi 29 juin");
            row(sheet, 1, "", "Sara EL AMRANI", value);
            ImportDryRunReport report = new ImportDryRunReport();
            new PlanningWorkbookDryRunProcessor().process(sheet, support(workbook, "planning 1.xlsx", report));
            return report;
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    private ImportDryRunReport runTicketSheet(Workbook workbook, Sheet sheet) {
        ImportDryRunReport report = new ImportDryRunReport();
        new TicketWorkbookDryRunProcessor().process(sheet, support(workbook, "tickets.xlsx", report));
        return report;
    }

    private ImportDryRunReport runCgiCasaSheet(Workbook workbook, Sheet sheet) {
        ImportDryRunReport report = new ImportDryRunReport();
        new CgiCasaDryRunProcessor().process(sheet, support(workbook, "CGI_CASA_06_04_2026_au_12_04_2026.xlsx", report));
        return report;
    }

    private ExcelDryRunSupport support(Workbook workbook, String fileName) {
        return support(workbook, fileName, new ImportDryRunReport());
    }

    private ExcelDryRunSupport support(Workbook workbook, String fileName, ImportDryRunReport report) {
        return new ExcelDryRunSupport(
                normalizer,
                enumMapper,
                new org.apache.poi.ss.usermodel.DataFormatter(Locale.FRANCE),
                workbook.getCreationHelper().createFormulaEvaluator(),
                fileName,
                report,
                new ExcelDryRunSupport.DuplicateClassifier(report)
        );
    }

    private void row(Sheet sheet, int rowIndex, String... values) {
        Row row = sheet.createRow(rowIndex);
        for (int i = 0; i < values.length; i++) {
            row.createCell(i).setCellValue(values[i]);
        }
    }

    @Test
    void parsesExcelDateCell() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("dates");
            Row row = sheet.createRow(0);
            Cell cell = row.createCell(0);
            cell.setCellValue(java.util.Date.from(LocalDate.of(2026, 4, 7).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant()));
            CreationHelper helper = workbook.getCreationHelper();
            CellStyle style = workbook.createCellStyle();
            style.setDataFormat(helper.createDataFormat().getFormat("dd/mm/yyyy"));
            cell.setCellStyle(style);
            assertThat(normalizer.parseDate(cell, new org.apache.poi.ss.usermodel.DataFormatter(Locale.FRANCE), workbook.getCreationHelper().createFormulaEvaluator()))
                    .contains(LocalDate.of(2026, 4, 7));
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }
}
