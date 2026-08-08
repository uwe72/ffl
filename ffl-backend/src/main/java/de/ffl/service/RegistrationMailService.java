package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
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
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.ArrayList;

@Service
public class RegistrationMailService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationMailService.class);

    private static final String DEFAULT_BANK_NAME = "DKB";
    private static final String DEFAULT_KONTOINHABER = "Uwe Clement";
    private static final String DEFAULT_IBAN = "DE 60 1203 0000 1055 4306 39";
    private static final String DEFAULT_BIC = "BYLADEM1001";

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

    public RegistrationMailService(SystemConfigRepository systemConfigRepository, SpringTemplateEngine templateEngine) {
        this.systemConfigRepository = systemConfigRepository;
        this.templateEngine = templateEngine;
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
        Context context = new Context(Locale.GERMAN);

        String greeting = user.getFirstName() != null && !user.getFirstName().isBlank()
            ? user.getFirstName()
            : user.getLogin();
        context.setVariable("greeting", greeting);

        String seasonName = manager.getSeason() != null ? manager.getSeason().getName() : "Aktuelle Saison";
        context.setVariable("seasonName", seasonName);

        context.setVariable("userLogin", user.getLogin());
        context.setVariable("userEmail", user.getEmail());
        String name = Optional.ofNullable(user.getFirstName()).orElse("") + " " + Optional.ofNullable(user.getLastName()).orElse("");
        context.setVariable("userName", name.trim().isEmpty() ? "-" : name.trim());

        context.setVariable("players", buildPlayerRows(manager));

        if (manager.getBudget() != null) {
            int totalPrize = calculateTotalPrize(manager);
            int remainingBudget = manager.getBudget() - totalPrize;
            int budgetPercent = manager.getBudget() > 0 ? (totalPrize * 100 / manager.getBudget()) : 0;
            context.setVariable("budget", new BudgetDto(
                formatCurrency(manager.getBudget()),
                formatCurrency(totalPrize),
                formatCurrency(remainingBudget),
                budgetPercent
            ));
        } else {
            context.setVariable("budget", null);
        }

        Season season = manager.getSeason();
        if (season != null) {
            int spieleinsatz = season.getSpieleinsatzEuro() != null ? season.getSpieleinsatzEuro().intValue() : 10;
            String verwendungszweck = "FFL " + seasonName + " " + user.getLogin();
            String firstName = user.getFirstName() != null && !user.getFirstName().isBlank() ? user.getFirstName() : "bitte";

            String paypalLink = season.getPaypalLink();
            context.setVariable("payment", new PaymentDto(
                firstName,
                spieleinsatz,
                paypalLink,
                verwendungszweck,
                resolveOrDefault(season.getKontoinhaber(), DEFAULT_KONTOINHABER),
                resolveOrDefault(season.getIban(), DEFAULT_IBAN),
                resolveOrDefault(season.getBic(), DEFAULT_BIC),
                resolveOrDefault(season.getBankName(), DEFAULT_BANK_NAME)
            ));
        } else {
            context.setVariable("payment", null);
        }

        context.setVariable("teamChange", buildTeamChangeHtml(user, manager));

        context.setVariable("webUrl", normalizeWebUrl(webUrl));

        return templateEngine.process("mail/registration-confirmation", context);
    }

    private List<PlayerRowDto> buildPlayerRows(Manager manager) {
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

        List<PlayerRowDto> rows = new ArrayList<>();
        for (Map.Entry<String, Player> entry : playerBySlot.entrySet()) {
            Player p = entry.getValue();
            if (p == null) continue;

            String slot = entry.getKey();
            String posLabel = slot.startsWith("TW") ? "TW"
                : slot.startsWith("ABW") ? "ABW"
                : slot.startsWith("MF") ? "MF"
                : slot.startsWith("ST") ? "ST"
                : "FREI";
            String posColor = positionColor(posLabel);
            String posBg = positionBg(posLabel);
            if ("FREI".equals(slot) && p.getPosition() != null) {
                posLabel = positionLabel(p.getPosition());
                posColor = positionColor(p.getPosition());
                posBg = positionBg(p.getPosition());
            }

            String teamName = p.getTeams() != null && !p.getTeams().isEmpty()
                ? p.getTeams().get(p.getTeams().size() - 1).getName()
                : "-";
            int prize = p.getPrize() != null ? p.getPrize() : 0;

            rows.add(new PlayerRowDto(posLabel, posColor, posBg, p.getNameKicker(), teamName, formatCurrency(prize)));
        }
        return rows;
    }

    private String buildTeamChangeHtml(User user, Manager manager) {
        Season season = manager.getSeason();
        if (season == null) {
            return null;
        }

        StringBuilder sb = new StringBuilder();
        if (season.getSeasonStartDate() != null) {
            String dateStr = season.getSeasonStartDate().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            if (season.getSeasonStartTime() != null) {
                String timeStr = season.getSeasonStartTime().format(DateTimeFormatter.ofPattern("HH:mm"));
                sb.append("Bis zum <strong>").append(dateStr).append(" um ").append(timeStr).append(" Uhr</strong> kannst Du jederzeit Dein aktuell angemeldetes Team modifizieren. Gehe hierzu auf die FFL-Webseite und logge Dich mit Deinem Benutzernamen <strong>").append(escape(user.getLogin())).append("</strong> und Passwort ein.");
            } else {
                sb.append("Bis zum <strong>").append(dateStr).append("</strong> kannst Du jederzeit Dein aktuell angemeldetes Team modifizieren. Gehe hierzu auf die FFL-Webseite und logge Dich mit Deinem Benutzernamen <strong>").append(escape(user.getLogin())).append("</strong> und Passwort ein.");
            }
        } else {
            sb.append("Du kannst jederzeit Dein aktuell angemeldetes Team modifizieren. Gehe hierzu auf die FFL-Webseite und logge Dich mit Deinem Benutzernamen <strong>").append(escape(user.getLogin())).append("</strong> und Passwort ein.");
        }
        return sb.toString();
    }

    private String normalizeWebUrl(String webUrl) {
        if (webUrl == null || webUrl.isBlank()) {
            return null;
        }
        return webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
    }

    private String resolveOrDefault(String value, String fallback) {
        return value != null && !value.isBlank() ? value : fallback;
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
        if (pos == null) return POS_COLOR_FREI;
        return switch (pos) {
            case GOALKEEPER -> POS_COLOR_TW;
            case DEFENDER -> POS_COLOR_ABW;
            case MIDFIELD -> POS_COLOR_MF;
            case STRIKER -> POS_COLOR_ST;
        };
    }

    private String positionBg(Position pos) {
        if (pos == null) return POS_BG_FREI;
        return switch (pos) {
            case GOALKEEPER -> POS_BG_TW;
            case DEFENDER -> POS_BG_ABW;
            case MIDFIELD -> POS_BG_MF;
            case STRIKER -> POS_BG_ST;
        };
    }

    private String positionColor(String label) {
        return switch (label) {
            case "TW" -> POS_COLOR_TW;
            case "ABW" -> POS_COLOR_ABW;
            case "MF" -> POS_COLOR_MF;
            case "ST" -> POS_COLOR_ST;
            default -> POS_COLOR_FREI;
        };
    }

    private String positionBg(String label) {
        return switch (label) {
            case "TW" -> POS_BG_TW;
            case "ABW" -> POS_BG_ABW;
            case "MF" -> POS_BG_MF;
            case "ST" -> POS_BG_ST;
            default -> POS_BG_FREI;
        };
    }

    private int calculateTotalPrize(Manager manager) {
        int sum = 0;
        if (manager.getPlayerGoalkeeper() != null) sum += prizeOrZero(manager.getPlayerGoalkeeper());
        if (manager.getPlayerDefender1() != null) sum += prizeOrZero(manager.getPlayerDefender1());
        if (manager.getPlayerDefender2() != null) sum += prizeOrZero(manager.getPlayerDefender2());
        if (manager.getPlayerDefender3() != null) sum += prizeOrZero(manager.getPlayerDefender3());
        if (manager.getPlayerMidfield1() != null) sum += prizeOrZero(manager.getPlayerMidfield1());
        if (manager.getPlayerMidfield2() != null) sum += prizeOrZero(manager.getPlayerMidfield2());
        if (manager.getPlayerMidfield3() != null) sum += prizeOrZero(manager.getPlayerMidfield3());
        if (manager.getPlayerStriker1() != null) sum += prizeOrZero(manager.getPlayerStriker1());
        if (manager.getPlayerStriker2() != null) sum += prizeOrZero(manager.getPlayerStriker2());
        if (manager.getPlayerStriker3() != null) sum += prizeOrZero(manager.getPlayerStriker3());
        if (manager.getPlayerFreeChoice() != null) sum += prizeOrZero(manager.getPlayerFreeChoice());
        return sum;
    }

    private int prizeOrZero(Player player) {
        return player.getPrize() != null ? player.getPrize() : 0;
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

    public record PlayerRowDto(String posLabel, String posColorHex, String posBgHex, String nameKicker, String teamName, String prizeFormatted) {}

    public record BudgetDto(String budgetFormatted, String totalFormatted, String remainingFormatted, int percent) {}

    public record PaymentDto(String firstName, int spieleinsatz, String paypalLink, String verwendungszweck, String kontoinhaber, String iban, String bic, String bankName) {}
}
