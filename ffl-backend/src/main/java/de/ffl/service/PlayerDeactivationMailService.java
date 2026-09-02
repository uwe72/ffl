package de.ffl.service;

import de.ffl.domain.SeasonState;
import de.ffl.domain.SystemConfig;
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

import java.util.List;
import java.util.Locale;

@Service
public class PlayerDeactivationMailService {

    private static final Logger log = LoggerFactory.getLogger(PlayerDeactivationMailService.class);

    private final SystemConfigRepository systemConfigRepository;
    private final SpringTemplateEngine templateEngine;
    private final SmtpMailTransport smtpMailTransport;

    public PlayerDeactivationMailService(SystemConfigRepository systemConfigRepository,
                                         SpringTemplateEngine templateEngine,
                                         SmtpMailTransport smtpMailTransport) {
        this.systemConfigRepository = systemConfigRepository;
        this.templateEngine = templateEngine;
        this.smtpMailTransport = smtpMailTransport;
    }

    @Async
    public void sendDeactivationNotifications(List<ManagerNotificationDto> notifications,
                                              String seasonName, SeasonState state, int transferRound) {
        if (state != SeasonState.BEFORE_SEASON && state != SeasonState.RUNNING_HINRUNDE) {
            log.info("Spieler-Deaktivierungs-Mails nur im Status 'Vor Saison' oder 'Hinrunde', aktuell {}, übersprungen", state);
            return;
        }
        if (notifications == null || notifications.isEmpty()) {
            return;
        }

        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        if (config == null) {
            log.warn("Keine Systemkonfiguration vorhanden, Spieler-Deaktivierungs-Mails werden nicht gesendet");
            return;
        }
        if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
            log.warn("Gmail-Zugangsdaten nicht konfiguriert, Spieler-Deaktivierungs-Mails werden nicht gesendet");
            return;
        }

        boolean beforeSeason = state == SeasonState.BEFORE_SEASON;
        JavaMailSenderImpl mailSender = smtpMailTransport.buildSender(config);
        String webUrl = normalizeWebUrl(config.getWebUrl());
        int sent = 0;
        SmtpMailTransport.TransportState transportState = new SmtpMailTransport.TransportState();

        try {
            for (ManagerNotificationDto notification : notifications) {
                if (notification.email() == null || notification.email().isBlank()) {
                    continue;
                }
                try {
                    MimeMessage msg = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                    helper.setFrom(config.getGmailSenderEmail());
                    helper.setTo(notification.email());
                    helper.setBcc(config.getGmailSenderEmail());
                    helper.setSubject("FFL | Spieler nicht mehr verfügbar | " + seasonName);
                    helper.setText(buildHtml(notification, seasonName, beforeSeason, transferRound, webUrl), true);

                    boolean gesendet = smtpMailTransport.sendWithRetry(transportState, mailSender, msg,
                        notification.email(), notification.email(), null);
                    if (gesendet) {
                        sent++;
                    }
                } catch (Exception e) {
                    log.error("Fehler beim Senden der Spieler-Deaktivierungs-Mail an {}: {}",
                            notification.email(), e.getMessage(), e);
                }
            }
        } finally {
            smtpMailTransport.closeQuietly(transportState.transport);
        }
        log.info("Spieler-Deaktivierungs-Mails an {} Manager gesendet", sent);
    }

    String buildHtml(ManagerNotificationDto notification, String seasonName, boolean beforeSeason,
                     int transferRound, String webUrl) {
        Context context = new Context(Locale.GERMAN);
        context.setVariable("greeting", notification.greeting());
        context.setVariable("userName", notification.userName());
        context.setVariable("seasonName", seasonName);
        context.setVariable("players", notification.players());
        context.setVariable("beforeSeason", beforeSeason);
        context.setVariable("transferRound", transferRound);
        context.setVariable("webUrl", webUrl);
        return templateEngine.process("mail/player-deactivation", context);
    }

    private String normalizeWebUrl(String webUrl) {
        if (webUrl == null || webUrl.isBlank()) {
            return null;
        }
        return webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
    }

    public record PlayerRowDto(String posLabel, String posColorHex, String posBgHex, String name, String teamName) {}

    public record ManagerNotificationDto(String email, String greeting, String userName, List<PlayerRowDto> players) {}
}
