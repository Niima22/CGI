package com.cgi.intranet.planning.service;

import com.cgi.intranet.planning.dto.response.AgentUnavailabilityResponse;
import com.cgi.intranet.planning.dto.response.PlanningAgentSummaryResponse;
import com.cgi.intranet.planning.dto.response.PlanningAssignmentResponse;
import com.cgi.intranet.planning.dto.response.WeeklyPlanningResponse;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.FontUnderline;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PlanningExportService {

    private static final DateTimeFormatter DAY_FORMAT =
            DateTimeFormatter.ofPattern("EEE dd/MM", Locale.FRANCE);

    public byte[] exportXlsx(WeeklyPlanningResponse planning) {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
            ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet planningSheet = workbook.createSheet("Planning");
            Sheet summarySheet = workbook.createSheet("Synthese");
            Sheet absenceSheet = workbook.createSheet("Absences");
            Map<String, CellStyle> styles = excelStyles(workbook);

            writePlanningSheet(planningSheet, planning, styles);
            writeSummarySheet(summarySheet, planning, styles);
            writeAbsenceHoursSheet(absenceSheet, planning, styles);

            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to export planning as Excel.", exception);
        }
    }

    public byte[] exportPdf(WeeklyPlanningResponse planning) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 24, 24, 24, 24);
            PdfWriter.getInstance(document, output);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font subtitleFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.DARK_GRAY);
            Paragraph title = new Paragraph("Planning des shifts", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            Paragraph subtitle = new Paragraph(
                    "Semaine du " + planning.weekStartDate() + " au " + planning.weekEndDate()
                            + " - " + planning.status(),
                    subtitleFont
            );
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(12);
            document.add(subtitle);

            document.add(pdfPlanningTable(planning));
            addPdfAbsenceHours(document, planning);
            document.close();
            return output.toByteArray();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to export planning as PDF.", exception);
        }
    }

    public String filename(WeeklyPlanningResponse planning, String extension) {
        return "planning-" + planning.weekStartDate() + "." + extension;
    }

    private void writePlanningSheet(
            Sheet sheet,
            WeeklyPlanningResponse planning,
            Map<String, CellStyle> styles
    ) {
        sheet.setColumnWidth(0, 5200);
        for (int index = 1; index <= 7; index++) {
            sheet.setColumnWidth(index, 4200);
        }

        Row title = sheet.createRow(0);
        title.setHeightInPoints(24);
        Cell titleCell = title.createCell(0);
        titleCell.setCellValue("Planning des shifts");
        titleCell.setCellStyle(styles.get("title"));

        Row subtitle = sheet.createRow(1);
        Cell subtitleCell = subtitle.createCell(0);
        subtitleCell.setCellValue("Semaine du " + planning.weekStartDate() + " au " + planning.weekEndDate()
                + " - " + planning.status());
        subtitleCell.setCellStyle(styles.get("subtitle"));

        Row header = sheet.createRow(3);
        writeCell(header, 0, "Agent", styles.get("header"));
        List<LocalDate> days = days(planning);
        for (int index = 0; index < days.size(); index++) {
            writeCell(header, index + 1, DAY_FORMAT.format(days.get(index)), styles.get("header"));
        }

        Map<String, PlanningAssignmentResponse> assignments = assignmentsByCell(planning);
        Map<String, AgentUnavailabilityResponse> unavailable = unavailableByCell(planning);
        List<PlanningAgentSummaryResponse> agents = sortedAgents(planning);
        for (int rowIndex = 0; rowIndex < agents.size(); rowIndex++) {
            PlanningAgentSummaryResponse agent = agents.get(rowIndex);
            Row row = sheet.createRow(rowIndex + 4);
            row.setHeightInPoints(34);
            writeCell(row, 0, agent.fullName(), styles.get("agent"));
            for (int dayIndex = 0; dayIndex < days.size(); dayIndex++) {
                LocalDate day = days.get(dayIndex);
                String text = cellText(agent.agentId(), day, assignments, unavailable);
                writeCell(row, dayIndex + 1, text, styles.get(styleKey(text)));
            }
        }

        int footerRow = agents.size() + 6;
        Row footer = sheet.createRow(footerRow);
        writeCell(footer, 0, "Legende", styles.get("header"));
        writeCell(footer, 1, "OFF = repos", styles.get("body"));
        writeCell(footer, 2, "CONGE/ABSENT = indisponible", styles.get("body"));
        writeCell(footer, 3, "TT = teletravail", styles.get("body"));
    }

    private void writeSummarySheet(
            Sheet sheet,
            WeeklyPlanningResponse planning,
            Map<String, CellStyle> styles
    ) {
        sheet.setColumnWidth(0, 5200);
        sheet.setColumnWidth(1, 3200);
        sheet.setColumnWidth(2, 3200);
        sheet.setColumnWidth(3, 3200);
        sheet.setColumnWidth(4, 3600);

        Row title = sheet.createRow(0);
        writeCell(title, 0, "Synthese agents", styles.get("title"));

        Row header = sheet.createRow(2);
        writeCell(header, 0, "Agent", styles.get("header"));
        writeCell(header, 1, "Heures", styles.get("header"));
        writeCell(header, 2, "OFF", styles.get("header"));
        writeCell(header, 3, "SCO", styles.get("header"));
        writeCell(header, 4, "Week-ends travailles", styles.get("header"));

        List<PlanningAgentSummaryResponse> agents = sortedAgents(planning);
        for (int index = 0; index < agents.size(); index++) {
            PlanningAgentSummaryResponse agent = agents.get(index);
            Row row = sheet.createRow(index + 3);
            writeCell(row, 0, agent.fullName(), styles.get("agent"));
            writeCell(row, 1, agent.assignedHours(), styles.get("number"));
            writeCell(row, 2, agent.offDays(), styles.get("number"));
            writeCell(row, 3, agent.scoCount(), styles.get("number"));
            writeCell(row, 4, agent.weekendsWorkedCount(), styles.get("number"));
        }
    }

    private void writeAbsenceHoursSheet(
            Sheet sheet,
            WeeklyPlanningResponse planning,
            Map<String, CellStyle> styles
    ) {
        sheet.setColumnWidth(0, 5200);
        sheet.setColumnWidth(1, 3200);
        sheet.setColumnWidth(2, 3200);
        sheet.setColumnWidth(3, 3200);

        Row title = sheet.createRow(0);
        writeCell(title, 0, "Jours de conge, absence et retards", styles.get("title"));

        Row subtitle = sheet.createRow(1);
        writeCell(subtitle, 0, "Semaine du " + planning.weekStartDate() + " au " + planning.weekEndDate(), styles.get("subtitle"));

        Row header = sheet.createRow(3);
        writeCell(header, 0, "Agent", styles.get("header"));
        writeCell(header, 1, "Conge (jours)", styles.get("header"));
        writeCell(header, 2, "Absence (jours)", styles.get("header"));
        writeCell(header, 3, "Retard", styles.get("header"));

        List<AbsenceHoursRow> rows = absenceHoursRows(planning);
        if (rows.isEmpty()) {
            Row empty = sheet.createRow(4);
            writeCell(empty, 0, "Aucun conge ou absence sur cette semaine", styles.get("body"));
            return;
        }

        for (int index = 0; index < rows.size(); index++) {
            AbsenceHoursRow item = rows.get(index);
            Row row = sheet.createRow(index + 4);
            writeCell(row, 0, item.agentName(), styles.get("agent"));
            writeCell(row, 1, item.leaveDays(), styles.get("number"));
            writeCell(row, 2, item.absenceDays(), styles.get("number"));
            writeCell(row, 3, formatMinutes(item.latenessMinutes()), styles.get("number"));
        }
    }

    private PdfPTable pdfPlanningTable(WeeklyPlanningResponse planning) {
        PdfPTable table = new PdfPTable(8);
        table.setWidthPercentage(100);
        table.setWidths(new float[] { 1.7f, 1f, 1f, 1f, 1f, 1f, 1f, 1f });

        addPdfHeader(table, "Agent");
        days(planning).forEach(day -> addPdfHeader(table, DAY_FORMAT.format(day)));

        Map<String, PlanningAssignmentResponse> assignments = assignmentsByCell(planning);
        Map<String, AgentUnavailabilityResponse> unavailable = unavailableByCell(planning);
        sortedAgents(planning).forEach(agent -> {
            addPdfCell(table, agent.fullName(), true);
            days(planning).forEach(day ->
                    addPdfCell(table, cellText(agent.agentId(), day, assignments, unavailable), false));
        });
        return table;
    }

    private void addPdfAbsenceHours(Document document, WeeklyPlanningResponse planning) throws Exception {
        List<AbsenceHoursRow> rows = absenceHoursRows(planning);

        Paragraph title = new Paragraph(
                "Jours de conge, absence et retards",
                new Font(Font.HELVETICA, 11, Font.BOLD)
        );
        title.setSpacingBefore(14);
        title.setSpacingAfter(6);
        document.add(title);

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(65);
        table.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.setWidths(new float[] { 2.2f, 1f, 1f, 1f });
        addPdfHeader(table, "Agent");
        addPdfHeader(table, "Conge (j)");
        addPdfHeader(table, "Absence (j)");
        addPdfHeader(table, "Retard");

        if (rows.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase(
                    "Aucun conge ou absence sur cette semaine",
                    new Font(Font.HELVETICA, 8, Font.NORMAL)
            ));
            empty.setColspan(4);
            empty.setPadding(5);
            table.addCell(empty);
        } else {
            rows.forEach(item -> {
                addPdfCell(table, item.agentName(), true);
                addPdfCell(table, String.valueOf(item.leaveDays()), false);
                addPdfCell(table, String.valueOf(item.absenceDays()), false);
                addPdfCell(table, formatMinutes(item.latenessMinutes()), false);
            });
        }

        document.add(table);
    }

    private Map<String, CellStyle> excelStyles(XSSFWorkbook workbook) {
        Map<String, CellStyle> styles = new LinkedHashMap<>();
        styles.put("title", style(workbook, true, 16, IndexedColors.WHITE, new Color(255, 255, 255), false));
        styles.put("subtitle", style(workbook, false, 10, IndexedColors.GREY_50_PERCENT, new Color(255, 255, 255), false));
        styles.put("header", style(workbook, true, 10, IndexedColors.WHITE, new Color(36, 46, 66), true));
        styles.put("agent", style(workbook, true, 10, IndexedColors.BLACK, new Color(245, 247, 250), true));
        styles.put("body", style(workbook, false, 10, IndexedColors.BLACK, new Color(255, 255, 255), true));
        styles.put("number", style(workbook, false, 10, IndexedColors.BLACK, new Color(255, 255, 255), true));
        styles.put("off", style(workbook, false, 10, IndexedColors.GREY_50_PERCENT, new Color(241, 245, 249), true));
        styles.put("leave", style(workbook, true, 10, IndexedColors.GREEN, new Color(220, 252, 231), true));
        styles.put("absence", style(workbook, true, 10, IndexedColors.RED, new Color(255, 228, 230), true));
        styles.put("telework", style(workbook, true, 10, IndexedColors.BLUE, new Color(224, 242, 254), true));
        styles.put("shift", style(workbook, false, 10, IndexedColors.BLACK, new Color(238, 242, 255), true));
        return styles;
    }

    private CellStyle style(
            XSSFWorkbook workbook,
            boolean bold,
            int fontSize,
            IndexedColors fontColor,
            Color fill,
            boolean bordered
    ) {
        XSSFCellStyle style = workbook.createCellStyle();
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setWrapText(true);
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setFillForegroundColor(new XSSFColor(fill, null));
        if (bordered) {
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
        }
        XSSFFont font = workbook.createFont();
        font.setBold(bold);
        font.setFontHeightInPoints((short) fontSize);
        font.setColor(fontColor.getIndex());
        if (fontSize >= 16) {
            font.setUnderline(FontUnderline.SINGLE);
        }
        style.setFont(font);
        return style;
    }

    private void writeCell(Row row, int index, String value, CellStyle style) {
        Cell cell = row.createCell(index);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void writeCell(Row row, int index, long value, CellStyle style) {
        Cell cell = row.createCell(index);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void addPdfHeader(PdfPTable table, String value) {
        PdfPCell cell = new PdfPCell(new Phrase(value, new Font(Font.HELVETICA, 8, Font.BOLD, Color.WHITE)));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBackgroundColor(new Color(36, 46, 66));
        cell.setPadding(5);
        table.addCell(cell);
    }

    private void addPdfCell(PdfPTable table, String value, boolean agentColumn) {
        Font font = new Font(Font.HELVETICA, 7, agentColumn ? Font.BOLD : Font.NORMAL);
        PdfPCell cell = new PdfPCell(new Phrase(value, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(4);
        if (agentColumn) {
            cell.setBackgroundColor(new Color(245, 247, 250));
        } else if (value.equals("OFF")) {
            cell.setBackgroundColor(new Color(241, 245, 249));
        } else if (value.equals("CONGE")) {
            cell.setBackgroundColor(new Color(220, 252, 231));
        } else if (value.equals("ABSENT")) {
            cell.setBackgroundColor(new Color(255, 228, 230));
        } else if (value.contains("TT")) {
            cell.setBackgroundColor(new Color(224, 242, 254));
        }
        table.addCell(cell);
    }

    private List<LocalDate> days(WeeklyPlanningResponse planning) {
        return java.util.stream.IntStream.rangeClosed(0, 6)
                .mapToObj(planning.weekStartDate()::plusDays)
                .toList();
    }

    private List<PlanningAgentSummaryResponse> sortedAgents(WeeklyPlanningResponse planning) {
        return planning.agentSummaries().stream()
                .sorted(Comparator.comparing(PlanningAgentSummaryResponse::fullName))
                .toList();
    }

    private Map<String, PlanningAssignmentResponse> assignmentsByCell(WeeklyPlanningResponse planning) {
        return planning.assignments().stream()
                .collect(Collectors.toMap(
                        assignment -> key(assignment.agentId(), LocalDate.parse(assignment.assignmentDate())),
                        Function.identity(),
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));
    }

    private Map<String, AgentUnavailabilityResponse> unavailableByCell(WeeklyPlanningResponse planning) {
        return planning.unavailableDays().stream()
                .collect(Collectors.toMap(
                        day -> key(day.agentId(), LocalDate.parse(day.date())),
                        Function.identity(),
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));
    }

    private List<AbsenceHoursRow> absenceHoursRows(WeeklyPlanningResponse planning) {
        Map<Long, String> agentNames = sortedAgents(planning).stream()
                .collect(Collectors.toMap(
                        PlanningAgentSummaryResponse::agentId,
                        PlanningAgentSummaryResponse::fullName,
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));
        Map<Long, AbsenceHoursAccumulator> hoursByAgent = new LinkedHashMap<>();
        planning.unavailableDays().stream()
                .filter(day -> "CONGE".equals(day.reason()) || "ABSENT".equals(day.reason()))
                .forEach(day -> {
                    AbsenceHoursAccumulator accumulator = hoursByAgent.computeIfAbsent(
                            day.agentId(),
                            ignored -> new AbsenceHoursAccumulator()
                    );
                    if ("CONGE".equals(day.reason())) {
                        accumulator.leaveDays += 1;
                    } else {
                        accumulator.absenceDays += 1;
                    }
                });
        planning.assignments().stream()
                .filter(assignment -> assignment.latenessMinutes() > 0)
                .forEach(assignment -> {
                    AbsenceHoursAccumulator accumulator = hoursByAgent.computeIfAbsent(
                            assignment.agentId(),
                            ignored -> new AbsenceHoursAccumulator()
                    );
                    accumulator.latenessMinutes += assignment.latenessMinutes();
                });
        return agentNames.entrySet().stream()
                .filter(entry -> hoursByAgent.containsKey(entry.getKey()))
                .map(entry -> {
                    AbsenceHoursAccumulator hours = hoursByAgent.get(entry.getKey());
                    return new AbsenceHoursRow(
                            entry.getValue(),
                            hours.leaveDays,
                            hours.absenceDays,
                            hours.latenessMinutes
                    );
                })
                .toList();
    }

    private String cellText(
            Long agentId,
            LocalDate date,
            Map<String, PlanningAssignmentResponse> assignments,
            Map<String, AgentUnavailabilityResponse> unavailable
    ) {
        AgentUnavailabilityResponse unavailability = unavailable.get(key(agentId, date));
        PlanningAssignmentResponse assignment = assignments.get(key(agentId, date));
        if (unavailability != null && !"TELETRAVAIL".equals(unavailability.reason())) {
            return unavailability.reason();
        }
        if (assignment == null) {
            return "OFF";
        }
        String shift = Optional.ofNullable(assignment.shiftCode()).orElse("");
        String hours = assignment.startTime() + "-" + assignment.endTime();
        String lateness = assignment.latenessMinutes() > 0
                ? "\nRetard " + formatMinutes(assignment.latenessMinutes())
                : "";
        if (unavailability != null && "TELETRAVAIL".equals(unavailability.reason())) {
            return shift + "\n" + hours + "\nTT" + lateness;
        }
        return shift + "\n" + hours + lateness;
    }

    private String styleKey(String text) {
        if (text.equals("OFF")) return "off";
        if (text.equals("CONGE")) return "leave";
        if (text.equals("ABSENT")) return "absence";
        if (text.contains("TT")) return "telework";
        return "shift";
    }

    private String key(Long agentId, LocalDate date) {
        return agentId + "|" + date;
    }

    private String formatMinutes(int minutes) {
        if (minutes <= 0) {
            return "0";
        }
        if (minutes < 60) {
            return minutes + "min";
        }
        int hours = minutes / 60;
        int remaining = minutes % 60;
        return remaining == 0 ? hours + "h" : hours + "h" + remaining;
    }

    private static class AbsenceHoursAccumulator {
        private long leaveDays;
        private long absenceDays;
        private int latenessMinutes;
    }

    private record AbsenceHoursRow(
            String agentName,
            long leaveDays,
            long absenceDays,
            int latenessMinutes
    ) {
    }
}
