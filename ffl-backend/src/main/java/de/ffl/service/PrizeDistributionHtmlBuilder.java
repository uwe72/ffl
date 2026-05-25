package de.ffl.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.ffl.domain.Manager;
import de.ffl.domain.PrizeDistributionLog;
import de.ffl.domain.PrizePayout;
import de.ffl.domain.Season;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PrizeDistributionHtmlBuilder {

    private static final Logger log = LoggerFactory.getLogger(PrizeDistributionHtmlBuilder.class);

    private final ObjectMapper objectMapper;

    public PrizeDistributionHtmlBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String buildHtmlContent(Season season, List<PrizePayout> payouts, PrizeDistributionLog distributionLog, Manager manager) {
        String bodyBg = "#f5f5f7";
        String cardBg = "#ffffff";
        String textPrimary = "#0a0a0a";
        String textSecondary = "#1a3a5c";
        String border = "#c0c0c0";

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:").append(bodyBg).append(";color:").append(textPrimary).append(";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px;margin:0;word-break:keep-all;overflow-wrap:anywhere;hyphens:none;\">");
        sb.append("<div style=\"max-width:700px;margin:0 auto;\">");

        if (manager != null) {
            String firstName = getManagerFirstName(manager);
            sb.append("<p style='color:#c9a66b;font-size:22px;font-weight:700;margin:0 0 20px 0;'>Hallo ")
              .append(escape(firstName))
              .append("!</p>");
        }

        if (season.getMailText() != null && !season.getMailText().isBlank()) {
            sb.append("<div style='margin-bottom:24px;word-break:keep-all;overflow-wrap:anywhere;hyphens:none;'>");
            sb.append(prepareMailText(season.getMailText()));
            sb.append("</div>");
        }

        sb.append("<hr style='border:none;border-top:1px solid #d0d0d0;margin:24px 0;'>");
        sb.append("<h2 style='color:").append(textSecondary).append(";font-size:14px;font-weight:700;margin:0 0 16px 0;'>Anhang</h2>");

        sb.append("<h3 style='color:").append(textSecondary).append(";font-size:13px;font-weight:700;margin:0 0 12px 0;'>Gewinnverteilung</h3>");

        sb.append("<table width='100%' cellpadding='0' cellspacing='0' style='font-size:13px;border-collapse:collapse;border:1px solid ").append(border).append(";border-radius:8px;overflow:hidden;'>");
        sb.append("<tr style='background:").append(cardBg).append(";color:").append(textSecondary).append(";font-size:11px;text-transform:uppercase;letter-spacing:0.5px;'>");
        sb.append("<th align='center' style='padding:10px 8px;font-weight:600;border-bottom:1px solid ").append(border).append(";'>Platz</th>");
        sb.append("<th align='left' style='padding:10px 8px;font-weight:600;border-bottom:1px solid ").append(border).append(";'>Manager</th>");
        sb.append("<th align='left' style='padding:10px 8px;font-weight:600;border-bottom:1px solid ").append(border).append(";'>Vorname</th>");
        sb.append("<th align='left' style='padding:10px 8px;font-weight:600;border-bottom:1px solid ").append(border).append(";'>Nachname</th>");
        sb.append("<th align='right' style='padding:10px 8px;font-weight:600;border-bottom:1px solid ").append(border).append(";'>Punkte</th>");
        sb.append("<th align='right' style='padding:10px 12px 10px 8px;font-weight:600;border-bottom:1px solid ").append(border).append(";'>Gewinn</th>");
        sb.append("</tr>");

        int rowIndex = 0;
        for (PrizePayout payout : payouts) {
            String rowBg = rowIndex % 2 == 0 ? "background:#ffffff;" : "background:#f5f5f5;";
            rowIndex++;

            String managerName = payout.getManager().getName();
            String firstName = "";
            String lastName = "";
            if (payout.getManager().getUser() != null) {
                firstName = payout.getManager().getUser().getFirstName() != null ? payout.getManager().getUser().getFirstName() : "";
                lastName = payout.getManager().getUser().getLastName() != null ? payout.getManager().getUser().getLastName() : "";
            }

            BigDecimal prize = payout.getPrizeAmount();
            String prizeFormatted = prize.stripTrailingZeros().toPlainString().replace(".", ",");

            sb.append("<tr style=\"").append(rowBg).append("\">");
            sb.append("<td align=\"center\" style=\"padding:10px 8px;color:").append(textPrimary).append(";font-weight:600;border-bottom:1px solid ").append(border).append(";\">").append(payout.getPosition()).append(".</td>");
            sb.append("<td align=\"left\" style=\"padding:10px 8px;color:").append(textPrimary).append(";border-bottom:1px solid ").append(border).append(";\">").append(escape(managerName)).append("</td>");
            sb.append("<td align=\"left\" style=\"padding:10px 8px;color:").append(textPrimary).append(";border-bottom:1px solid ").append(border).append(";\">").append(escape(firstName)).append("</td>");
            sb.append("<td align=\"left\" style=\"padding:10px 8px;color:").append(textPrimary).append(";border-bottom:1px solid ").append(border).append(";\">").append(escape(lastName)).append("</td>");
            sb.append("<td align=\"right\" style=\"padding:10px 8px;color:").append(textPrimary).append(";border-bottom:1px solid ").append(border).append(";\">").append(nz(payout.getPointsTotal())).append("</td>");
            sb.append("<td align=\"right\" style=\"padding:10px 12px 10px 8px;color:#c9a66b;font-weight:700;border-bottom:1px solid ").append(border).append(";\">").append(prizeFormatted).append(" €</td>");
            sb.append("</tr>");
        }

        sb.append("</table>");

        sb.append("<div style=\"margin-top:24px;\">");
        sb.append(generateStatisticsHtmlForEmail(season, distributionLog, season.getGewinnErsterPlatzProzent()));
        sb.append("</div>");

        sb.append("<div style=\"margin-top:24px;\">");
        sb.append("<h3 style=\"color:").append(textSecondary).append(";font-size:13px;font-weight:700;margin:0 0 12px 0;\">Gewinnverteilung (Basis-Kurve)</h3>");
        sb.append(buildChartHtml(distributionLog));
        sb.append("</div>");

        sb.append("</div></body></html>");
        return sb.toString();
    }

    private String getManagerFirstName(Manager m) {
        if (m.getUser() != null && m.getUser().getFirstName() != null && !m.getUser().getFirstName().isBlank()) {
            return m.getUser().getFirstName();
        }
        return m.getName();
    }

    private String generateStatisticsHtmlForEmail(Season season, PrizeDistributionLog log, Integer gewinnErsterPlatzProzent) {
        StringBuilder html = new StringBuilder();
        
        html.append("<div style=\"font-family: system-ui, -apple-system, sans-serif; color: #0a0a0a; font-size: 14px;\">");
        
        html.append("<h3 style=\"color: #1a3a5c; margin-bottom: 12px; font-size: 13px;\">Mathematische Herleitung der Basiswerte</h3>");
        html.append("<ul style=\"list-style-type: disc; padding-left: 20px; margin: 0;\">");
        
        html.append("<li style=\"margin-bottom: 8px;\">Gesamtteilnehmer: <strong>").append(log.getTotalParticipants()).append("</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Zahlende Teilnehmer: ")
            .append(log.getTotalParticipants()).append(" – ").append(log.getTotalParticipants() - log.getPayingParticipants())
            .append(" (Spielleiter) = <strong>").append(log.getPayingParticipants()).append("</strong></li>");
        
        BigDecimal einsatz = season.getSpieleinsatzEuro() != null ? season.getSpieleinsatzEuro() : new BigDecimal("10.00");
        html.append("<li style=\"margin-bottom: 8px;\">Spieleinsätze gesamt: ")
            .append(log.getPayingParticipants()).append(" × ").append(formatCurrency(einsatz))
            .append(" = <strong>").append(formatCurrency(log.getTotalStakes())).append("</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Serverkosten: <strong>")
            .append(formatCurrency(log.getServerCosts())).append("</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Auszuschüttender Gesamtbetrag: ")
            .append(formatCurrency(log.getTotalStakes())).append(" – ").append(formatCurrency(log.getServerCosts()))
            .append(" = <strong>").append(formatCurrency(log.getTotalBudget())).append("</strong></li>");
        
        double rawRanks = log.getTotalParticipants() * 0.10;
        html.append("<li style=\"margin-bottom: 8px;\">Anzahl der Gewinnränge: 10 % von ")
            .append(log.getTotalParticipants()).append(" = ").append(String.format("%.1f", rawRanks))
            .append(" → aufgerundet auf <strong>").append(log.getNumWinningRanks()).append(" Gewinnränge</strong></li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Gewinn für Platz 1: <strong>")
            .append(formatCurrency(log.getPrizeFirstPlace())).append("</strong> (")
            .append(gewinnErsterPlatzProzent).append("% des ausgeschütteten Gesamtbetrags)</li>");
        
        html.append("<li style=\"margin-bottom: 8px;\">Gewinn für Platz ").append(log.getNumWinningRanks())
            .append(": <strong>").append(formatCurrency(log.getPrizeLastPlace())).append("</strong></li>");
        
        html.append("</ul>");
        html.append("</div>");
        
        return html.toString();
    }

    private String formatCurrency(BigDecimal value) {
        return String.format("%,.2f €", value).replace(",", "X").replace(".", ",").replace("X", ".");
    }

    private String buildChartHtml(PrizeDistributionLog distributionLog) {
        StringBuilder sb = new StringBuilder();
        
        List<BigDecimal> basePrizes = null;
        if (distributionLog.getBasePrizes() != null && !distributionLog.getBasePrizes().isEmpty()) {
            try {
                basePrizes = objectMapper.readValue(distributionLog.getBasePrizes(), new TypeReference<List<BigDecimal>>() {});
            } catch (Exception e) {
                log.warn("Konnte basePrizes nicht deserialisieren: {}", e.getMessage());
            }
        }

        if (basePrizes == null || basePrizes.isEmpty()) {
            return "<p style=\"color:#6b7280;font-size:13px;\">Keine Diagrammdaten verfügbar.</p>";
        }

        BigDecimal maxPrize = basePrizes.stream().max(BigDecimal::compareTo).orElse(BigDecimal.ONE);
        if (maxPrize.compareTo(BigDecimal.ZERO) == 0) {
            maxPrize = BigDecimal.ONE;
        }

        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;\">");

        String colorFirst = "#90EE90";
        String colorNormal = "#87CEFA";
        String colorLast = "#FFA500";

        for (int i = 0; i < basePrizes.size(); i++) {
            BigDecimal prize = basePrizes.get(i);
            int percent = maxPrize.compareTo(BigDecimal.ZERO) > 0 
                ? prize.multiply(new BigDecimal("100")).divide(maxPrize, 0, java.math.RoundingMode.HALF_UP).intValue()
                : 0;
            percent = Math.max(5, Math.min(100, percent));

            String barColor;
            if (i == 0) {
                barColor = colorFirst;
            } else if (i == basePrizes.size() - 1) {
                barColor = colorLast;
            } else {
                barColor = colorNormal;
            }

            String prizeFormatted = prize.stripTrailingZeros().toPlainString().replace(".", ",");

            sb.append("<tr>");
            sb.append("<td style=\"padding:6px 8px 6px 0;color:#1a3a5c;font-weight:600;width:60px;white-space:nowrap;\">Platz ").append(i + 1).append("</td>");
            sb.append("<td style=\"padding:6px 0;\">");
            sb.append("<div style=\"background:").append(barColor).append(";height:18px;border-radius:4px;width:").append(percent).append("%;\"></div>");
            sb.append("</td>");
            sb.append("<td style=\"padding:6px 0 6px 10px;color:#c9a66b;font-weight:700;text-align:right;width:70px;white-space:nowrap;\">").append(prizeFormatted).append(" €</td>");
            sb.append("</tr>");
        }

        sb.append("</table>");
        return sb.toString();
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String nz(Integer v) {
        return v != null ? String.valueOf(v) : "0";
    }

    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("(<[^>]+>)");
    private static final Pattern HYPHEN_BETWEEN_LETTERS = Pattern.compile("(?<=[a-zA-ZäöüÄÖÜß])-(?=[a-zA-ZäöüÄÖÜß])");

    static String prepareMailText(String html) {
        String result = html.replace("\u00A0", " ");
        result = result.replace("&nbsp;", " ");

        result = protectDashWithSpaces(result, " - ");
        result = protectDashWithSpaces(result, " – ");
        result = protectDashWithSpaces(result, " &ndash; ");
        result = protectDashWithSpaces(result, " &#8211; ");
        result = protectDashWithSpaces(result, " — ");
        result = protectDashWithSpaces(result, " &mdash; ");

        Matcher tagMatcher = HTML_TAG_PATTERN.matcher(result);
        StringBuilder sb = new StringBuilder();
        int lastEnd = 0;
        while (tagMatcher.find()) {
            String textBetween = result.substring(lastEnd, tagMatcher.start());
            sb.append(HYPHEN_BETWEEN_LETTERS.matcher(textBetween).replaceAll("&#8209;"));
            sb.append(tagMatcher.group());
            lastEnd = tagMatcher.end();
        }
        String tail = result.substring(lastEnd);
        sb.append(HYPHEN_BETWEEN_LETTERS.matcher(tail).replaceAll("&#8209;"));
        result = sb.toString();

        String pStyle = "style='margin:0 0 8px 0;word-break:keep-all;overflow-wrap:anywhere;hyphens:none;'";
        result = result.replace("<p>", "<p " + pStyle + ">");

        return result;
    }

    private static String protectDashWithSpaces(String html, String dashWithSpaces) {
        return html.replace(dashWithSpaces,
            "<span style=\"white-space:nowrap\">" + dashWithSpaces.replace(" ", "&nbsp;") + "</span>");
    }
}
