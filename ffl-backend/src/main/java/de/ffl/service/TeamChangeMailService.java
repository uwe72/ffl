package de.ffl.service;

import de.ffl.domain.SystemConfig;
import de.ffl.dto.PaymentReminderDto;
import de.ffl.repository.SystemConfigRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Properties;

@Service
public class TeamChangeMailService {

    private static final Logger log = LoggerFactory.getLogger(TeamChangeMailService.class);

    private static final String POS_COLOR_TW = "#57534e";
    private static final String POS_COLOR_ABW = "#0f766e";
    private static final String POS_COLOR_MF = "#4338ca";
    private static final String POS_COLOR_ST = "#be123c";
    private static final String POS_COLOR_FREI = "#6b6b6b";

    private static final String POS_BG_TW = "#ede9e3";
    private static final String POS_BG_ABW = "#ccfbf1";
    private static final String POS_BG_MF = "#e0e7ff";
    private static final String POS_BG_ST = "#fce7f3";
    private static final String POS_BG_FREI = "#f5f5f4";

    private final SystemConfigRepository systemConfigRepository;
    private final SpringTemplateEngine templateEngine;

    public TeamChangeMailService(SystemConfigRepository systemConfigRepository, SpringTemplateEngine templateEngine) {
        this.systemConfigRepository = systemConfigRepository;
        this.templateEngine = templateEngine;
    }

    @Async
    public void sendTeamChangeConfirmation(String userEmail, String userLogin, String greeting,
                                           String userName, String seasonName, String changeTypeLabel,
                                           List<ExchangeDto> exchanges,
                                           List<PositionGroupDto> positionGroups,
                                           BudgetDto budget,
                                           String webUrl,
                                           int teamChangeCount,
                                           PaymentReminderDto paymentReminder) {
        try {
            SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
            if (config == null) {
                log.warn("Keine Systemkonfiguration vorhanden, Teamänderungsmail wird nicht gesendet");
                return;
            }

            if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
                log.warn("Gmail-Zugangsdaten nicht konfiguriert, Teamänderungsmail wird nicht gesendet");
                return;
            }

            JavaMailSenderImpl mailSender = buildMailSender(config);

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");

            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(userEmail);

            if (config.getGmailSenderEmail() != null && !config.getGmailSenderEmail().isBlank()) {
                helper.setBcc(config.getGmailSenderEmail());
            }

            helper.setSubject("↻ FFL | " + teamChangeCount + ". Änderung | " + userLogin + " | " + seasonName);

            String html = buildTeamChangeHtml(greeting, userName, seasonName, changeTypeLabel, exchanges, positionGroups, budget, webUrl, teamChangeCount, paymentReminder);
            helper.setText(html, true);

            mailSender.send(msg);
            log.info("Teamänderungsmail gesendet an: {}", userEmail);

        } catch (Exception e) {
            log.error("Fehler beim Senden der Teamänderungsmail: {}", e.getMessage(), e);
        }
    }

    private String buildTeamChangeHtml(String greeting, String userName, String seasonName, String changeTypeLabel,
                                       List<ExchangeDto> exchanges, List<PositionGroupDto> positionGroups,
                                       BudgetDto budget, String webUrl, int teamChangeCount,
                                       PaymentReminderDto paymentReminder) {
        Context context = new Context(Locale.GERMAN);
        context.setVariable("greeting", greeting);
        context.setVariable("userName", userName);
        context.setVariable("seasonName", seasonName);
        context.setVariable("changeTypeLabel", changeTypeLabel);
        context.setVariable("teamChangeCount", teamChangeCount);
        context.setVariable("exchanges", exchanges);
        context.setVariable("positionGroups", positionGroups);
        context.setVariable("budget", budget);
        context.setVariable("webUrl", normalizeWebUrl(webUrl));
        context.setVariable("payment", paymentReminder != null && paymentReminder.isOpen() ? paymentReminder : null);
        return templateEngine.process("mail/team-change-confirmation", context);
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

    private String normalizeWebUrl(String webUrl) {
        if (webUrl == null || webUrl.isBlank()) {
            return null;
        }
        return webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
    }

    public static String positionColor(String label) {
        return switch (label) {
            case "TW" -> POS_COLOR_TW;
            case "ABW" -> POS_COLOR_ABW;
            case "MF" -> POS_COLOR_MF;
            case "ST" -> POS_COLOR_ST;
            default -> POS_COLOR_FREI;
        };
    }

    public static String positionBg(String label) {
        return switch (label) {
            case "TW" -> POS_BG_TW;
            case "ABW" -> POS_BG_ABW;
            case "MF" -> POS_BG_MF;
            case "ST" -> POS_BG_ST;
            default -> POS_BG_FREI;
        };
    }

    public static String positionLabel(de.ffl.domain.Position pos) {
        if (pos == null) return "SP";
        return switch (pos) {
            case GOALKEEPER -> "TW";
            case DEFENDER -> "ABW";
            case MIDFIELD -> "MF";
            case STRIKER -> "ST";
        };
    }

    public static String formatCurrency(int value) {
        return NumberFormat.getNumberInstance(Locale.GERMAN).format(value) + " €";
    }

    public static String formatPriceCompact(int value) {
        int abs = Math.abs(value);
        String sign = value < 0 ? "-" : "";
        if (abs >= 1_000_000) {
            double millions = abs / 1_000_000.0;
            String formatted = millions % 1 == 0
                ? String.format(Locale.GERMAN, "%d", (int) millions)
                : String.format(Locale.GERMAN, "%.1f", millions);
            return sign + formatted + "M €";
        }
        if (abs >= 1_000) {
            return sign + Math.round(abs / 1_000.0) + "K €";
        }
        return sign + abs + " €";
    }

    public static String positionFullLabel(String shortLabel) {
        return switch (shortLabel) {
            case "TW" -> "Torwart";
            case "ABW" -> "Abwehr";
            case "MF" -> "Mittelfeld";
            case "ST" -> "Sturm";
            default -> "Freie Wahl";
        };
    }

    public static String fullName(de.ffl.domain.Player p) {
        if (p == null) return "";
        String first = p.getFirstName() != null ? p.getFirstName().trim() : null;
        String last = p.getLastName() != null ? p.getLastName().trim() : null;
        if (first != null && !first.isEmpty() && last != null && !last.isEmpty()) {
            return first + " " + last;
        }
        if (first != null && !first.isEmpty()) return first;
        if (last != null && !last.isEmpty()) return last;
        return p.getNameKicker() != null ? p.getNameKicker() : "";
    }

    public record PlayerRowDto(String posLabel, String posColorHex, String posBgHex, String nameKicker, String teamName, String prizeFormatted) {}

    public record PositionGroupDto(String label, String colorHex, String posLabel, List<PlayerRowDto> players) {}

    public record ExchangeDto(String oldPosLabel, String oldPosColorHex, String oldName, String oldTeam, String oldPrizeFormatted,
                              String newPosLabel, String newPosColorHex, String newName, String newTeam, String newPrizeFormatted,
                              String priceDiffFormatted) {}

    public record BudgetDto(String budgetFormatted, String totalFormatted, String remainingFormatted, int percent) {}
}
