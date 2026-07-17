package com.cgi.intranet.employee.excelimport;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.FormulaEvaluator;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoField;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ExcelImportNormalizer {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\p{Cntrl}&&[^\\r\\n\\t]]");
    private static final Pattern TIME_RANGE = Pattern.compile(
            "(?i).*?(\\d{1,2})\\s*(?::|h|H)\\s*(\\d{0,2})\\s*(?:-|→|\\?|a|à|to)\\s*(\\d{1,2})\\s*(?::|h|H)\\s*(\\d{0,2}).*"
    );
    private static final DateTimeFormatter FRENCH_DATE = new DateTimeFormatterBuilder()
            .parseCaseInsensitive()
            .appendPattern("[d/M/uuuu][d/M/uu][d-M-uuuu][d-M-uu][d MMMM uuuu][d MMM uuuu]")
            .toFormatter(Locale.FRANCE);
    private static final DateTimeFormatter FRENCH_DATE_TIME = new DateTimeFormatterBuilder()
            .parseCaseInsensitive()
            .appendPattern("[d/M/uuuu H:mm[:ss]][d/M/uu H:mm[:ss]][d-M-uuuu H:mm[:ss]][d-M-uu H:mm[:ss]]")
            .toFormatter(Locale.FRANCE);

    public String cleanText(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value
                .replace('\u00A0', ' ')
                .replace('\u202F', ' ')
                .replace('\u2007', ' ');
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll(" ");
        cleaned = cleaned.trim().replaceAll("\\s+", " ");
        return cleaned.isBlank() ? null : cleaned;
    }

    public String normalizeKey(String value) {
        String cleaned = cleanText(value);
        if (cleaned == null) {
            return "";
        }
        String withoutAccents = Normalizer.normalize(cleaned, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT)
                .replace('&', ' ')
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    public String normalizeFullName(String value) {
        return cleanText(value);
    }

    public String firstName(String fullName) {
        String cleaned = cleanText(fullName);
        if (cleaned == null || !cleaned.contains(" ")) {
            return cleaned;
        }
        return cleaned.substring(0, cleaned.indexOf(' '));
    }

    public String lastName(String fullName) {
        String cleaned = cleanText(fullName);
        if (cleaned == null || !cleaned.contains(" ")) {
            return null;
        }
        return cleaned.substring(cleaned.indexOf(' ') + 1);
    }

    public String normalizeEmail(String value) {
        String cleaned = cleanText(value);
        if (cleaned == null) {
            return null;
        }
        return cleaned.toLowerCase(Locale.ROOT);
    }

    public boolean isValidEmail(String value) {
        String email = normalizeEmail(value);
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    public String maskEmail(String value) {
        String email = normalizeEmail(value);
        if (email == null || !email.contains("@")) {
            return "";
        }
        String local = email.substring(0, email.indexOf('@'));
        String domain = email.substring(email.indexOf('@') + 1);
        String maskedLocal = local.length() <= 2
                ? local.substring(0, 1) + "***"
                : local.substring(0, 2) + "***";
        return maskedLocal + "@" + domain;
    }

    public String normalizeBannette(String value) {
        String cleaned = cleanText(value);
        if (cleaned == null) {
            return null;
        }
        String key = normalizeKey(cleaned);
        Map<String, String> aliases = new LinkedHashMap<>();
        aliases.put("fo", "FO");
        aliases.put("magasin fo", "FO");
        aliases.put("front office", "FO");
        aliases.put("super hyper front office", "FO");
        aliases.put("bo", "BO");
        aliases.put("magasin bo", "BO");
        aliases.put("back office", "BO");
        aliases.put("super hyper back office", "BO");
        aliases.put("sco", "SCO");
        aliases.put("supply", "Supply");
        aliases.put("partenaire", "Partenaire");
        aliases.put("vus", "VUS");
        aliases.put("km", "KM");
        aliases.put("proxi promocash", "Proxi & Promocash");
        aliases.put("proximite promocash", "Proxi & Promocash");
        aliases.put("promocash back office", "Proxi & Promocash");
        for (Map.Entry<String, String> alias : aliases.entrySet()) {
            if (key.equals(alias.getKey()) || key.contains(alias.getKey())) {
                return alias.getValue();
            }
        }
        return cleaned;
    }

    public String readCell(Cell cell, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (cell == null) {
            return null;
        }
        try {
            return cleanText(formatter.formatCellValue(cell, evaluator));
        } catch (RuntimeException exception) {
            return cleanText(formatter.formatCellValue(cell));
        }
    }

    public String readStableReference(Cell cell, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (cell == null) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            double numeric = cell.getNumericCellValue();
            if (Math.floor(numeric) == numeric) {
                return String.format(Locale.ROOT, "%.0f", numeric);
            }
        }
        return readCell(cell, formatter, evaluator);
    }

    public Optional<LocalDateTime> parseDateTime(Cell cell, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (cell == null) {
            return Optional.empty();
        }
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return Optional.of(cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime());
        }
        String value = readCell(cell, formatter, evaluator);
        if (value == null || value.contains("####")) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalDateTime.parse(value, FRENCH_DATE_TIME));
        } catch (DateTimeParseException ignored) {
        }
        return parseDate(value).map(LocalDate::atStartOfDay);
    }

    public Optional<LocalDate> parseDate(Cell cell, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (cell == null) {
            return Optional.empty();
        }
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return Optional.of(cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDate());
        }
        return parseDate(readCell(cell, formatter, evaluator));
    }

    public Optional<LocalDate> parseDate(String value) {
        String cleaned = cleanText(value);
        if (cleaned == null || cleaned.contains("####")) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalDate.parse(cleaned, FRENCH_DATE));
        } catch (DateTimeParseException ignored) {
        }
        return parseFrenchDayMonth(cleaned, LocalDate.now().getYear());
    }

    public Optional<LocalDate> parseFrenchDayMonth(String value, int defaultYear) {
        String cleaned = cleanText(value);
        if (cleaned == null) {
            return Optional.empty();
        }
        String key = normalizeKey(cleaned);
        Matcher matcher = Pattern.compile(".*?(\\d{1,2})\\s+([a-z]+).*").matcher(key);
        if (!matcher.matches()) {
            return Optional.empty();
        }
        Integer month = frenchMonth(matcher.group(2));
        if (month == null) {
            return Optional.empty();
        }
        int day = Integer.parseInt(matcher.group(1));
        return Optional.of(LocalDate.of(defaultYear, month, day));
    }

    public Optional<ShiftRange> parseShiftRange(String value) {
        String cleaned = cleanText(value);
        if (cleaned == null) {
            return Optional.empty();
        }
        Matcher matcher = TIME_RANGE.matcher(cleaned.replace("?", "-"));
        if (!matcher.matches()) {
            return Optional.empty();
        }
        int startHour = Integer.parseInt(matcher.group(1));
        int startMinute = parseMinute(matcher.group(2));
        int endHour = Integer.parseInt(matcher.group(3));
        int endMinute = parseMinute(matcher.group(4));
        if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) {
            return Optional.empty();
        }
        return Optional.of(new ShiftRange(LocalTime.of(startHour, startMinute), LocalTime.of(endHour, endMinute)));
    }

    public boolean looksLikePersonName(String value) {
        String cleaned = cleanText(value);
        if (cleaned == null || cleaned.length() < 4 || cleaned.length() > 90 || cleaned.matches(".*\\d.*")) {
            return false;
        }
        String key = normalizeKey(cleaned);
        if (key.isBlank() || key.equals("agent") || key.equals("agents") || key.contains("semaine")) {
            return false;
        }
        return cleaned.split("\\s+").length >= 2;
    }

    public String usernameProposal(String fullName) {
        String key = normalizeKey(fullName).replace(' ', '.');
        return key.isBlank() ? null : key;
    }

    public Double parseDouble(String value) {
        String cleaned = cleanText(value);
        if (cleaned == null || cleaned.contains("####")) {
            return null;
        }
        cleaned = cleaned.replace("%", "").replace(',', '.').replaceAll("[^0-9.\\-]", "");
        if (cleaned.isBlank() || cleaned.equals("-")) {
            return null;
        }
        try {
            return Double.parseDouble(cleaned);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private int parseMinute(String value) {
        return value == null || value.isBlank() ? 0 : Integer.parseInt(value);
    }

    private Integer frenchMonth(String month) {
        return switch (month) {
            case "janvier", "jan" -> 1;
            case "fevrier", "fev" -> 2;
            case "mars" -> 3;
            case "avril", "avr" -> 4;
            case "mai" -> 5;
            case "juin" -> 6;
            case "juillet", "jul" -> 7;
            case "aout" -> 8;
            case "septembre", "sep" -> 9;
            case "octobre", "oct" -> 10;
            case "novembre", "nov" -> 11;
            case "decembre", "dec" -> 12;
            default -> null;
        };
    }

    public LocalDate parseDateWithDefaultYear(String value, int defaultYear) {
        return parseDate(value)
                .or(() -> parseFrenchDayMonth(value, defaultYear))
                .orElse(null);
    }

    public boolean isFormula(Cell cell) {
        return cell != null && cell.getCellType() == CellType.FORMULA;
    }

    public String formula(Cell cell) {
        return isFormula(cell) ? cell.getCellFormula() : null;
    }

    public record ShiftRange(LocalTime startTime, LocalTime endTime) {
        public boolean isInverted() {
            return endTime.isBefore(startTime);
        }
    }
}
