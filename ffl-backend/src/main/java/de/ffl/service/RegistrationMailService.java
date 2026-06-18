package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.SystemConfig;
import de.ffl.domain.User;
import de.ffl.repository.SystemConfigRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RegistrationMailService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationMailService.class);

    private final SystemConfigRepository systemConfigRepository;

    public RegistrationMailService(SystemConfigRepository systemConfigRepository) {
        this.systemConfigRepository = systemConfigRepository;
    }

    @Async
    public void sendRegistrationConfirmation(User user, Manager manager) {
        try {
            SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
            if (config == null) {
                log.warn("Keine Systemkonfiguration vorhanden, Registrierungsmail wird nicht gesendet");
                return;
            }

            if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
                log.warn("Gmail-Zugangsdaten nicht konfiguriert, Registrierungsmail wird nicht gesendet");
                return;
            }

            JavaMailSenderImpl mailSender = buildMailSender(config);

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");

            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(user.getEmail());

            if (config.getGmailSenderEmail() != null && !config.getGmailSenderEmail().isBlank()) {
                helper.setBcc(config.getGmailSenderEmail());
            }

            String seasonName = manager.getSeason() != null ? manager.getSeason().getName() : "Aktuelle Saison";
            helper.setSubject("FFL | Registrierung erfolgreich | " + seasonName + " | " + user.getLogin());

            String html = buildRegistrationHtml(user, manager, config.getWebUrl());
            helper.setText(html, true);

            mailSender.send(msg);
            log.info("Registrierungsbestätigung gesendet an: {}", user.getEmail());

        } catch (Exception e) {
            log.error("Fehler beim Senden der Registrierungsbestätigung: {}", e.getMessage(), e);
        }
    }

    private JavaMailSenderImpl buildMailSender(SystemConfig config) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(config.getGmailSmtpServer() != null ? config.getGmailSmtpServer() : "smtp.gmail.com");
        sender.setPort(config.getGmailSmtpPort() != null ? config.getGmailSmtpPort() : 587);
        sender.setUsername(config.getGmailSenderEmail());
        sender.setPassword(config.getGmailAppPassword());

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "30000");
        props.put("mail.smtp.timeout", "120000");
        props.put("mail.smtp.writetimeout", "120000");
        return sender;
    }

    private String buildRegistrationHtml(User user, Manager manager, String webUrl) {
        String bodyBg = "#f5f5f7";
        String bodyText = "#0a0a0a";
        String cardBg = "#ffffff";
        String cardBgAlt = "#f0f0f0";
        String textPrimary = "#0a0a0a";
        String textSecondary = "#1a3a5c";
        String textTertiary = "#6b7280";
        String linkColor = "#0056CC";

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:").append(bodyBg).append(";color:").append(bodyText).append(";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px 2px;margin:0;\">");
        sb.append("<div style=\"max-width:600px;margin:0 auto;\">");

        String greeting = user.getFirstName() != null && !user.getFirstName().isBlank()
            ? user.getFirstName()
            : user.getLogin();
        sb.append("<p style=\"color:").append(textTertiary).append(";font-size:15px;font-weight:700;line-height:1.5;margin:0 0 14px 0;\">Hallo ").append(escape(greeting)).append("!</p>");

        String introCardStyle = "background:" + cardBgAlt + ";padding:12px 14px;margin:0 0 14px 0;color:" + textPrimary + ";font-size:13px;line-height:1.5;border-radius:12px;border:1px solid #c0c0c0;";
        sb.append("<div style=\"").append(introCardStyle).append("\">");
        sb.append("<span style=\"color:#30D158;margin-right:6px;\">✓</span>");
        sb.append("Deine Registrierung bei FFL war erfolgreich! Hier sind alle Details zu deiner Anmeldung:");
        sb.append("</div>");

        sb.append("<div style=\"color:").append(textTertiary).append(";font-size:13px;font-weight:700;margin:18px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;\">Deine Daten</div>");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid #c0c0c0;margin-bottom:14px;\">");

        addTableRow(sb, "Login", user.getLogin(), cardBg, textPrimary, textSecondary, true);
        addTableRow(sb, "E-Mail", user.getEmail(), cardBgAlt, textPrimary, textSecondary, false);
        String name = Optional.ofNullable(user.getFirstName()).orElse("") + " " + Optional.ofNullable(user.getLastName()).orElse("");
        addTableRow(sb, "Name", name.trim().isEmpty() ? "-" : name.trim(), cardBg, textPrimary, textSecondary, false);

        sb.append("</table>");

        sb.append("<div style=\"color:").append(textTertiary).append(";font-size:13px;font-weight:700;margin:18px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;\">Dein Team</div>");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid #c0c0c0;margin-bottom:14px;\">");
        sb.append("<tr style=\"background:#f0f0f0;\">");
        sb.append("<th align=\"left\" style=\"padding:7px 8px;font-weight:500;border:1px solid #c0c0c0;color:").append(textSecondary).append(";font-size:11px;\">Position</th>");
        sb.append("<th align=\"left\" style=\"padding:7px 8px;font-weight:500;border:1px solid #c0c0c0;color:").append(textSecondary).append(";font-size:11px;\">Spieler</th>");
        sb.append("<th align=\"right\" style=\"padding:7px 8px;font-weight:500;border:1px solid #c0c0c0;color:").append(textSecondary).append(";font-size:11px;\">Verein</th>");
        sb.append("<th align=\"right\" style=\"padding:7px 8px;font-weight:500;border:1px solid #c0c0c0;color:").append(textSecondary).append(";font-size:11px;\">Preis</th>");
        sb.append("</tr>");

        Map<String, Player> playerBySlot = new LinkedHashMap<>();
        playerBySlot.put("TW", manager.getPlayerGoalkeeper());
        playerBySlot.put("ABW1", manager.getPlayerDefender1());
        playerBySlot.put("ABW2", manager.getPlayerDefender2());
        playerBySlot.put("ABW3", manager.getPlayerDefender3());
        playerBySlot.put("MF1", manager.getPlayerMidfield1());
        playerBySlot.put("MF2", manager.getPlayerMidfield2());
        playerBySlot.put("MF3", manager.getPlayerMidfield3());
        playerBySlot.put("ST1", manager.getPlayerStriker1());
        playerBySlot.put("ST2", manager.getPlayerStriker2());
        playerBySlot.put("ST3", manager.getPlayerStriker3());
        playerBySlot.put("FREI", manager.getPlayerFreeChoice());

        int rowIndex = 0;
        for (Map.Entry<String, Player> entry : playerBySlot.entrySet()) {
            Player p = entry.getValue();
            if (p == null) continue;

            String slot = entry.getKey();
            String posLabel = slot.startsWith("TW") ? "TW" : slot.startsWith("ABW") ? "ABW" : slot.startsWith("MF") ? "MF" : slot.startsWith("ST") ? "ST" : "FREI";
            String posColor = positionColor(posLabel);
            if ("FREI".equals(slot) && p.getPosition() != null) {
                posLabel = positionLabel(p.getPosition());
                posColor = positionColor(p.getPosition());
            }

            String rowBg = rowIndex % 2 == 0 ? "#ffffff" : "#f5f5f5";
            String teamName = p.getTeams() != null && !p.getTeams().isEmpty() 
                ? p.getTeams().get(p.getTeams().size() - 1).getName() 
                : "-";

            int prize = p.getPrize() != null ? p.getPrize() : 0;

            sb.append("<tr style=\"background:").append(rowBg).append(";\">");
            sb.append("<td align=\"left\" style=\"padding:7px 8px;border:1px solid #c0c0c0;\">");
            sb.append("<span style=\"display:inline-block;background:").append(posColor).append("15;color:").append(posColor).append(";border-radius:10px;padding:2px 8px;font-size:11px;font-weight:600;\">").append(posLabel).append("</span>");
            sb.append("</td>");
            sb.append("<td align=\"left\" style=\"padding:7px 8px;border:1px solid #c0c0c0;color:").append(textPrimary).append(";\">").append(escape(p.getNameKicker())).append("</td>");
            sb.append("<td align=\"right\" style=\"padding:7px 8px;border:1px solid #c0c0c0;color:").append(textSecondary).append(";\">").append(escape(teamName)).append("</td>");
            sb.append("<td align=\"right\" style=\"padding:7px 8px;border:1px solid #c0c0c0;color:").append(textSecondary).append(";\">").append(formatCurrency(prize)).append("</td>");
            sb.append("</tr>");
            rowIndex++;
        }

        sb.append("</table>");

        if (manager.getBudget() != null) {
            int totalPrize = calculateTotalPrize(manager);
            int remainingBudget = manager.getBudget() - totalPrize;
            int budgetPercent = manager.getBudget() > 0 ? (totalPrize * 100 / manager.getBudget()) : 0;

            sb.append("<div style=\"color:").append(textTertiary).append(";font-size:13px;font-weight:700;margin:18px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;\">Budget</div>");
            sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid #c0c0c0;margin-bottom:14px;\">");
            addTableRow(sb, "Gesamtbudget", formatCurrency(manager.getBudget()), cardBg, textPrimary, textSecondary, true);
            addTableRow(sb, "Verbraucht", formatCurrency(totalPrize) + " (" + budgetPercent + "%)", cardBgAlt, textPrimary, textSecondary, false);
            addTableRow(sb, "Verbleibend", formatCurrency(remainingBudget), cardBg, textPrimary, textSecondary, false);
            sb.append("</table>");
        }

        if (manager.getSeason() != null) {
            sb.append("<div style=\"color:").append(textTertiary).append(";font-size:13px;font-weight:700;margin:18px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;\">Zahlungsinformationen</div>");
            sb.append("<div style=\"background:").append(cardBgAlt).append(";padding:12px 14px;margin:0 0 14px 0;font-size:13px;line-height:1.5;border-radius:12px;border:1px solid #c0c0c0;\">");

            int spieleinsatz = manager.getSeason().getSpieleinsatzEuro() != null ? manager.getSeason().getSpieleinsatzEuro().intValue() : 10;
            String seasonNameShort = manager.getSeason().getName() != null ? manager.getSeason().getName().replace("/", "/") : "";
            String verwendungszweck = "FFL " + seasonNameShort + " " + user.getLogin();
            
            String userName = user.getFirstName() != null && !user.getFirstName().isBlank() ? user.getFirstName() : "bitte";
            sb.append(escape(userName)).append(", bitte überweise die Startgebühr von <strong>").append(spieleinsatz).append(",00 €</strong>.<br><br>");

            if (manager.getSeason().getPaypalLink() != null && !manager.getSeason().getPaypalLink().isBlank()) {
                sb.append("<strong>PayPal:</strong><br>");
                sb.append("<a href=\"").append(escape(manager.getSeason().getPaypalLink())).append("\" style=\"display:inline-block;background:#003087;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;margin:8px 0;\">Jetzt mit PayPal bezahlen</a><br><br>");
            }

            sb.append("<strong>Alternativ per Überweisung</strong><br>");
            sb.append("Kontoinhaber: Uwe Clement<br>");
            sb.append("IBAN: DE 60 1203 0000 1055 4306 39<br>");
            sb.append("BIC: BYLADEM1001<br>");
            sb.append("Bank: DKB<br>");
            sb.append("Verwendungszweck: <strong>").append(escape(verwendungszweck)).append("</strong>");

            sb.append("</div>");

            sb.append("<div style=\"color:").append(textTertiary).append(";font-size:13px;font-weight:700;margin:18px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;\">Team ändern</div>");
            sb.append("<div style=\"background:").append(cardBgAlt).append(";padding:12px 14px;margin:0 0 14px 0;font-size:13px;line-height:1.5;border-radius:12px;border:1px solid #c0c0c0;\">");
            String seasonNameForText = manager.getSeason().getName() != null ? manager.getSeason().getName() : "der Saison";
            
            if (manager.getSeason().getSeasonStartDate() != null) {
                String dateStr = manager.getSeason().getSeasonStartDate().format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy"));
                if (manager.getSeason().getSeasonStartTime() != null) {
                    String timeStr = manager.getSeason().getSeasonStartTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                    sb.append("Bis zum <strong>").append(dateStr).append(" um ").append(timeStr).append(" Uhr</strong> kannst Du jederzeit Dein aktuell angemeldetes Team modifizieren. Gehe hierzu auf die FFL-Webseite und logge Dich mit Deinem Benutzernamen <strong>").append(escape(user.getLogin())).append("</strong> und Passwort ein.");
                } else {
                    sb.append("Bis zum <strong>").append(dateStr).append("</strong> kannst Du jederzeit Dein aktuell angemeldetes Team modifizieren. Gehe hierzu auf die FFL-Webseite und logge Dich mit Deinem Benutzernamen <strong>").append(escape(user.getLogin())).append("</strong> und Passwort ein.");
                }
            } else {
                sb.append("Du kannst jederzeit Dein aktuell angemeldetes Team modifizieren. Gehe hierzu auf die FFL-Webseite und logge Dich mit Deinem Benutzernamen <strong>").append(escape(user.getLogin())).append("</strong> und Passwort ein.");
            }
            sb.append("</div>");
        }

        if (webUrl != null && !webUrl.isBlank()) {
            String base = webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
            sb.append("<div style=\"margin-top:24px;color:").append(textTertiary).append(";font-size:12px;text-align:center;\">");
            sb.append("<div style=\"font-size:10px;font-weight:700;color:").append(textSecondary).append(";margin-bottom:2px;\">Webseite</div>");
            sb.append("<a href=\"").append(escape(base)).append("\" style=\"color:").append(linkColor).append(";font-weight:700;text-decoration:none;\">FFL - Fantasy Football League</a>");
            sb.append("</div>");
        }

        sb.append("<div style=\"margin-top:16px;padding-top:16px;border-top:1px solid #c0c0c0;color:").append(textTertiary).append(";font-size:12px;text-align:center;line-height:1.6;\">");
        sb.append("Fragen? Antworte einfach direkt auf diese E-Mail.");
        sb.append("</div>");

        sb.append("</div></body></html>");
        return sb.toString();
    }

    private void addTableRow(StringBuilder sb, String label, String value, String rowBg, String textPrimary, String textSecondary, boolean isHeader) {
        sb.append("<tr style=\"background:").append(rowBg).append(";\">");
        sb.append("<td align=\"left\" style=\"padding:7px 8px;border:1px solid #c0c0c0;color:").append(textSecondary).append(";font-weight:500;\">").append(escape(label)).append("</td>");
        sb.append("<td align=\"left\" style=\"padding:7px 8px;border:1px solid #c0c0c0;color:").append(textPrimary).append(";\">").append(escape(value)).append("</td>");
        sb.append("</tr>");
    }

    private String positionLabel(Position pos) {
        if (pos == null) return "SP";
        return switch (pos) {
            case GOALKEEPER -> "TW";
            case DEFENDER -> "ABW";
            case MIDFIELD -> "MF";
            case STRIKER -> "ST";
        };
    }

    private String positionColor(Position pos) {
        if (pos == null) return "#6b6b6b";
        return switch (pos) {
            case GOALKEEPER -> "#30D158";
            case DEFENDER -> "#FF9F0A";
            case MIDFIELD -> "#FF2D55";
            case STRIKER -> "#0A84FF";
        };
    }

    private String positionColor(String label) {
        return switch (label) {
            case "TW" -> "#30D158";
            case "ABW" -> "#FF9F0A";
            case "MF" -> "#FF2D55";
            case "ST" -> "#0A84FF";
            default -> "#BF5AF2";
        };
    }

    private int calculateTotalPrize(Manager manager) {
        int sum = 0;
        if (manager.getPlayerGoalkeeper() != null) sum += manager.getPlayerGoalkeeper().getPrize() != null ? manager.getPlayerGoalkeeper().getPrize() : 0;
        if (manager.getPlayerDefender1() != null) sum += manager.getPlayerDefender1().getPrize() != null ? manager.getPlayerDefender1().getPrize() : 0;
        if (manager.getPlayerDefender2() != null) sum += manager.getPlayerDefender2().getPrize() != null ? manager.getPlayerDefender2().getPrize() : 0;
        if (manager.getPlayerDefender3() != null) sum += manager.getPlayerDefender3().getPrize() != null ? manager.getPlayerDefender3().getPrize() : 0;
        if (manager.getPlayerMidfield1() != null) sum += manager.getPlayerMidfield1().getPrize() != null ? manager.getPlayerMidfield1().getPrize() : 0;
        if (manager.getPlayerMidfield2() != null) sum += manager.getPlayerMidfield2().getPrize() != null ? manager.getPlayerMidfield2().getPrize() : 0;
        if (manager.getPlayerMidfield3() != null) sum += manager.getPlayerMidfield3().getPrize() != null ? manager.getPlayerMidfield3().getPrize() : 0;
        if (manager.getPlayerStriker1() != null) sum += manager.getPlayerStriker1().getPrize() != null ? manager.getPlayerStriker1().getPrize() : 0;
        if (manager.getPlayerStriker2() != null) sum += manager.getPlayerStriker2().getPrize() != null ? manager.getPlayerStriker2().getPrize() : 0;
        if (manager.getPlayerStriker3() != null) sum += manager.getPlayerStriker3().getPrize() != null ? manager.getPlayerStriker3().getPrize() : 0;
        if (manager.getPlayerFreeChoice() != null) sum += manager.getPlayerFreeChoice().getPrize() != null ? manager.getPlayerFreeChoice().getPrize() : 0;
        return sum;
    }

    private String formatCurrency(int value) {
        return NumberFormat.getNumberInstance(Locale.GERMAN).format(value) + " €";
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}