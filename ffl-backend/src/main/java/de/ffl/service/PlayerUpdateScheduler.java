package de.ffl.service;

import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.domain.UserRole;
import de.ffl.migration.NewSeasonSetupService;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import de.ffl.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Properties;

@Service
public class PlayerUpdateScheduler {

    private static final Logger log = LoggerFactory.getLogger(PlayerUpdateScheduler.class);
    private static final DateTimeFormatter RUN_FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final SystemConfigRepository configRepository;
    private final SeasonRepository seasonRepository;
    private final UserRepository userRepository;
    private final NewSeasonSetupService setupService;
    private final SpringTemplateEngine templateEngine;

    public PlayerUpdateScheduler(SystemConfigRepository configRepository,
                                 SeasonRepository seasonRepository,
                                 UserRepository userRepository,
                                 NewSeasonSetupService setupService,
                                 SpringTemplateEngine templateEngine) {
        this.configRepository = configRepository;
        this.seasonRepository = seasonRepository;
        this.userRepository = userRepository;
        this.setupService = setupService;
        this.templateEngine = templateEngine;
    }

    @Scheduled(fixedRate = 60000)
    public void tick() {
        SystemConfig config = configRepository.findFirstByOrderByIdAsc().orElse(null);
        if (config == null || !Boolean.TRUE.equals(config.getAutoUpdateEnabled())) {
            return;
        }
        String cron = config.getAutoUpdateCron();
        if (cron == null || cron.isBlank()) {
            return;
        }
        CronExpression cronExpression;
        try {
            cronExpression = CronExpression.parse(cron.trim());
        } catch (IllegalArgumentException e) {
            log.warn("Auto-Update: ungültiger Cron-Ausdruck '{}': {}", cron, e.getMessage());
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime nowMinute = now.withSecond(0).withNano(0);
        LocalDateTime candidate = cronExpression.next(nowMinute.minusSeconds(1));
        if (candidate == null || !candidate.withSecond(0).withNano(0).equals(nowMinute)) {
            return;
        }
        LocalDateTime lastRun = config.getAutoUpdateLastRun();
        if (lastRun != null) {
            LocalDateTime lastRunMinute = lastRun.withSecond(0).withNano(0);
            if (lastRunMinute.getYear() == nowMinute.getYear()
                    && lastRunMinute.getMonth() == nowMinute.getMonth()
                    && lastRunMinute.getDayOfMonth() == nowMinute.getDayOfMonth()
                    && lastRunMinute.getHour() == nowMinute.getHour()
                    && lastRunMinute.getMinute() == nowMinute.getMinute()) {
                return;
            }
        }
        executeUpdate(config, nowMinute);
    }

    void executeUpdate(SystemConfig config, LocalDateTime now) {
        log.info("Auto-Update wird ausgeführt (geplant um {})", now.format(RUN_FMT));
        List<String> logLines = new ArrayList<>();
        logLines.add("Automatisches Spieler-Update — " + now.format(RUN_FMT));
        logLines.add("");
        String subject;
        boolean success = false;
        NewSeasonSetupService.UpdateResult result = null;
        try {
            String sourceUrl = config.getAutoUpdateSourceUrl();
            if (sourceUrl == null || sourceUrl.isBlank()) {
                sourceUrl = NewSeasonSetupService.DEFAULT_SOURCE_URL;
                logLines.add("Hinweis: Keine Quell-URL konfiguriert, verwende Default.");
            }
            logLines.add("Quell-URL: " + sourceUrl);
            logLines.add("");
            result = setupService.updatePlayers(sourceUrl, logLines::add);
            subject = buildSubject(result);
            success = true;
        } catch (Exception e) {
            subject = "FFL | Spieler-Update | FEHLER";
            logLines.add("");
            logLines.add("FEHLER: " + e.getMessage());
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            logLines.add(sw.toString());
            log.error("Auto-Update fehlgeschlagen", e);
        }

        try {
            String seasonName = seasonRepository.findAll().stream().findFirst()
                    .map(Season::getName).orElse("Aktuelle Saison");
            String html = buildHtml(seasonName, success, result, now.format(RUN_FMT), logLines, normalizeWebUrl(config.getWebUrl()));
            sendNotificationMail(config, subject, html);
        } catch (Exception mailEx) {
            log.error("Versenden der Auto-Update-Mail fehlgeschlagen: {}", mailEx.getMessage());
        }

        config.setAutoUpdateLastRun(now);
        configRepository.save(config);
        log.info("Auto-Update abgeschlossen (lastRun aktualisiert)");
    }

    String buildSubject(NewSeasonSetupService.UpdateResult result) {
        if (result == null) {
            return "FFL | Spieler-Update | keine Änderungen";
        }
        if (result.playersCreated() == 0 && result.teamChanges() == 0 && result.playersDeactivated() == 0) {
            return "FFL | Spieler-Update | keine Änderungen";
        }
        StringBuilder sb = new StringBuilder("FFL | Spieler-Update | ");
        sb.append(result.playersCreated()).append(" neue Spieler");
        if (result.teamChanges() > 0) {
            sb.append(", ").append(result.teamChanges()).append(" Vereinswechsel");
        }
        if (result.playersDeactivated() > 0) {
            sb.append(", ").append(result.playersDeactivated()).append(" deaktiviert");
        }
        return sb.toString();
    }

    String buildHtml(String seasonName, boolean success, NewSeasonSetupService.UpdateResult result,
                     String runTime, List<String> logLines, String webUrl) {
        Context context = new Context(Locale.GERMAN);
        context.setVariable("seasonName", seasonName);
        context.setVariable("success", success);
        context.setVariable("playersCreated", result != null ? result.playersCreated() : 0);
        context.setVariable("teamChanges", result != null ? result.teamChanges() : 0);
        context.setVariable("playersDeactivated", result != null ? result.playersDeactivated() : 0);
        context.setVariable("runTime", runTime);
        context.setVariable("logLines", logLines);
        context.setVariable("webUrl", webUrl);
        return templateEngine.process("mail/player-update", context);
    }

    private String normalizeWebUrl(String webUrl) {
        if (webUrl == null || webUrl.isBlank()) {
            return null;
        }
        return webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
    }

    private void sendNotificationMail(SystemConfig config, String subject, String htmlContent) {
        List<String> adminEmails = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .map(u -> u.getEmail())
                .filter(e -> e != null && !e.isBlank())
                .toList();
        if (adminEmails.isEmpty()) {
            log.warn("Auto-Update-Mail nicht gesendet: keine Admin-Empfänger gefunden");
            return;
        }
        if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()) {
            log.warn("Auto-Update-Mail nicht gesendet: keine Sender-E-Mail in SystemConfig konfiguriert");
            return;
        }

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(config.getGmailSmtpServer() != null ? config.getGmailSmtpServer() : "smtp.gmail.com");
        mailSender.setPort(config.getGmailSmtpPort() != null ? config.getGmailSmtpPort() : 587);
        mailSender.setUsername(config.getGmailSenderEmail());
        mailSender.setPassword(config.getGmailAppPassword());

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "30000");
        props.put("mail.smtp.timeout", "120000");
        props.put("mail.smtp.writetimeout", "120000");

        try {
            for (String recipient : adminEmails) {
                MimeMessage msg = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                helper.setFrom(config.getGmailSenderEmail());
                helper.setTo(recipient);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);
                mailSender.send(msg);
            }
            log.info("Auto-Update-Mail an {} Admin(s) gesendet (Betreff: {})", adminEmails.size(), subject);
        } catch (Exception e) {
            throw new RuntimeException("Fehler beim Senden der Auto-Update-Mail: " + e.getMessage(), e);
        }
    }
}
