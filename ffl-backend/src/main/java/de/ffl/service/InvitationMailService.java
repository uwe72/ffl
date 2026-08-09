package de.ffl.service;

import de.ffl.domain.EmailAddress;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.EmailAddressRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class InvitationMailService {

    private static final Logger log = LoggerFactory.getLogger(InvitationMailService.class);

    private static final DateTimeFormatter DATE_LONG = DateTimeFormatter.ofPattern("EEEE, d. MMMM yyyy", Locale.GERMANY);
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final SystemConfigRepository systemConfigRepository;
    private final SeasonRepository seasonRepository;
    private final EmailAddressRepository emailAddressRepository;
    private final UnsubscribeService unsubscribeService;
    private final SpringTemplateEngine templateEngine;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    public InvitationMailService(SystemConfigRepository systemConfigRepository,
                                 SeasonRepository seasonRepository,
                                 EmailAddressRepository emailAddressRepository,
                                 UnsubscribeService unsubscribeService,
                                 SpringTemplateEngine templateEngine) {
        this.systemConfigRepository = systemConfigRepository;
        this.seasonRepository = seasonRepository;
        this.emailAddressRepository = emailAddressRepository;
        this.unsubscribeService = unsubscribeService;
        this.templateEngine = templateEngine;
    }

    public void sendTestMail(Long seasonId) {
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
            .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));

        if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
            || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
            throw new RuntimeException("Gmail-Zugangsdaten sind nicht vollständig konfiguriert");
        }

        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new RuntimeException("Saison nicht gefunden"));

        String webUrl = normalizeWebUrl(config.getWebUrl());
        String html = buildHtml(season, webUrl);
        String plainText = buildPlainText(season, webUrl);
        String unsubscribeUrl = unsubscribeService.getUnsubscribePlaceholderUrl();
        html = insertUnsubscribeFooter(html, unsubscribeUrl);
        plainText = appendUnsubscribePlainText(plainText, unsubscribeUrl);
        String subject = "FFL | Einladung zur Saison " + season.getName();

        try {
            JavaMailSenderImpl mailSender = buildMailSender(config);
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setSubject(subject);
            helper.setText(plainText, html);

            mailSender.send(msg);
            log.info("Einladungsmail (Test) gesendet an Admin: {}", config.getGmailSenderEmail());
        } catch (Exception e) {
            log.error("Fehler beim Senden der Test-Einladungsmail: {}", e.getMessage(), e);
            throw new RuntimeException("Versand fehlgeschlagen: " + e.getMessage(), e);
        }
    }

    public SseEmitter streamInvitationMail(Long seasonId, List<Long> emailIds, boolean testMode) {
        SseEmitter emitter = new SseEmitter(1_200_000L);
        executor.execute(() -> {
            try {
                SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
                    .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));

                if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                    || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
                    emitter.send(SseEmitter.event().name("error").data("FEHLER: Gmail-Zugangsdaten sind nicht vollständig konfiguriert"));
                    emitter.complete();
                    return;
                }

                Season season = seasonRepository.findById(seasonId)
                    .orElseThrow(() -> new RuntimeException("Saison nicht gefunden"));

                List<EmailAddress> allEmails = emailAddressRepository.findAll();
                Map<Long, EmailAddress> emailsById = allEmails.stream()
                    .collect(Collectors.toMap(EmailAddress::getId, e -> e));

                JavaMailSenderImpl mailSender = buildMailSender(config);
                String webUrl = normalizeWebUrl(config.getWebUrl());
                String baseHtml = buildHtml(season, webUrl);
                String basePlainText = buildPlainText(season, webUrl);
                String subject = "FFL | Einladung zur Saison " + season.getName();

                send(emitter, "Mail-Server verbunden (" + config.getGmailSmtpServer() + ":" + config.getGmailSmtpPort() + ")");
                send(emitter, "Starte Versand an " + emailIds.size() + " Empfänger...");

                int sent = 0;
                int failed = 0;
                long lastKeepAlive = System.currentTimeMillis();

                for (Long emailId : emailIds) {
                    EmailAddress emailAddress = emailsById.get(emailId);
                    if (emailAddress == null) {
                        send(emitter, "✗ E-Mail-ID " + emailId + " nicht gefunden");
                        failed++;
                        continue;
                    }

                    String recipientEmail = emailAddress.getEmail();

                    try {
                        String unsubscribeUrl = unsubscribeService.generateUnsubscribeUrl(emailId, config.getWebUrl());
                        String htmlContent = insertUnsubscribeFooter(baseHtml, unsubscribeUrl);
                        String textContent = appendUnsubscribePlainText(basePlainText, unsubscribeUrl);

                        MimeMessage msg = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                        helper.setFrom(config.getGmailSenderEmail());
                        helper.setTo(testMode ? config.getGmailSenderEmail() : recipientEmail);
                        helper.setSubject(subject);
                        helper.setText(textContent, htmlContent);

                        mailSender.send(msg);

                        send(emitter, (testMode ? "[TEST] " : "") + "✓ [" + emailAddress.getId() + "] " + recipientEmail);
                        sent++;

                        Thread.sleep(1000);

                        long now = System.currentTimeMillis();
                        if (now - lastKeepAlive > 30000) {
                            emitter.send(SseEmitter.event().comment("keep-alive"));
                            lastKeepAlive = now;
                        }

                        if (sent % 50 == 0 && sent < emailIds.size()) {
                            for (int remaining = 90; remaining > 0; remaining--) {
                                send(emitter, "⏳ " + sent + " Mails versendet, warte " + remaining + " Sekunden...");
                                Thread.sleep(1000);
                            }
                            send(emitter, "⏳ Wartezeit beendet, weiter mit nächstem Block...");
                            lastKeepAlive = System.currentTimeMillis();
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        send(emitter, "✗ Versand unterbrochen: " + e.getMessage());
                        failed++;
                        break;
                    } catch (Exception e) {
                        send(emitter, "✗ [" + emailAddress.getId() + "] " + recipientEmail + ": " + e.getMessage());
                        failed++;
                        log.error("Fehler beim Senden der Einladungsmail an {}", recipientEmail, e);
                    }
                }

                send(emitter, "");
                send(emitter, "Fertig: " + sent + " versendet, " + failed + " fehlgeschlagen." + (testMode ? " (TEST-MODUS)" : ""));
                emitter.send(SseEmitter.event().name("complete").data(""));
                emitter.complete();
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event().name("error").data("FEHLER: " + e.getMessage()));
                } catch (Exception ignored) {
                }
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    private String buildHtml(Season season, String webUrl) {
        Context context = buildContext(season, webUrl);
        return templateEngine.process("mail/invitation", context);
    }

    private String buildPlainText(Season season, String webUrl) {
        String seasonName = season.getName() != null ? season.getName() : "Aktuelle Saison";
        String startDateLong = formatOrDefault(season.getSeasonStartDate(), DATE_LONG, "siehe Webseite");
        LocalDate deadlineDateRaw = season.getFinalRegistrationDate() != null
            ? season.getFinalRegistrationDate()
            : season.getSeasonStartDate();
        String deadlineDate = formatOrDefault(deadlineDateRaw, DATE_LONG, "siehe Webseite");
        String deadlineTime = formatOrDefault(season.getSeasonStartTime(), TIME_FMT, "20:30");
        String startRoundRueckrunde = season.getStartRoundRueckrunde() != null ? String.valueOf(season.getStartRoundRueckrunde()) : "--";
        String spieleinsatz = formatCurrency(season.getSpieleinsatzEuro(), "10");
        String serverkosten = formatCurrency(season.getServerkostenEuro(), "60");
        String gewinnProzent = season.getGewinnErsterPlatzProzent() != null ? String.valueOf(season.getGewinnErsterPlatzProzent()) : "10";
        String gewinnLetzter = formatCurrency(season.getGewinnLetzterPlatzEuro(), "15");
        String anzahlSpielleiter = season.getAnzahlSpielleiter() != null ? String.valueOf(season.getAnzahlSpielleiter()) : "2";
        String budget = formatBudget(season.getBudget());
        String playersUrl = webUrl != null ? webUrl + "/players" : null;
        String documentsUrl = webUrl != null ? webUrl + "/documents" : null;

        StringBuilder sb = new StringBuilder();
        sb.append("FFL · Fantasy Football League\r\n");
        sb.append("Einladung zur Saison ").append(seasonName).append("\r\n\r\n");

        sb.append("DIE NEUE SAISON RUFT!\r\n\r\n");
        sb.append("Am ").append(startDateLong).append(" rollt der Ball wieder, und damit geht auch unsere Fantasy Football League in die nächste Saison. Wir freuen uns, wenn Du dabei bist.\r\n\r\n");
        sb.append("Wir betreuen das Spiel seit 2011/2012, mittlerweile spielen 200 bis 260 Fußballfans mit, von Deutschland bis Irland, Kanada und Kuba.\r\n\r\n");
        sb.append("Die FFL ist ein einfaches Managerspiel: Du stellst einmalig ein Team aus echten Bundesligaspielern zusammen und sammelst 34 Spieltage lang Punkte für deren Tore und Leistungen.\r\n\r\n");

        sb.append("JETZT ANMELDEN\r\n\r\n");
        sb.append("Registriere Dich und stelle Dein Team auf:\r\n");
        if (webUrl != null) {
            sb.append(webUrl).append("\r\n\r\n");
        }
        sb.append("- Anmeldeschluss: ").append(deadlineDate).append(" um ").append(deadlineTime).append(" Uhr\r\n");
        sb.append("- Bis dahin kannst Du Dein Team beliebig oft umbauen\r\n\r\n");

        sb.append("SPIELREGELN\r\n\r\n");
        sb.append("- Elf Spieler: 1 Torwart, 3 Abwehr, 3 Mittelfeld, 3 Sturm, dazu 1 Joker auf einer frei wählbaren Feldposition\r\n");
        sb.append("- Budget: ").append(budget).append(" Euro, keine Begrenzung der Spieler pro Verein\r\n");
        sb.append("- Tore: Stürmer 3 Punkte, Mittelfeld 5, Abwehr 7, Torwart 10, per Elfmeter 3\r\n");
        sb.append("- Zu Null: Torwart 5 Punkte, Abwehr 2\r\n\r\n");

        sb.append("EINSATZ: ").append(spieleinsatz).append(" EURO PRO MANAGER\r\n\r\n");
        sb.append("- Die ").append(anzahlSpielleiter).append(" Spielleiter spielen mit je einem Team kostenlos mit.\r\n");
        sb.append("- Vom Einsatz gehen ").append(serverkosten).append(" Euro für Serverbetrieb und KI Nutzung ab.\r\n");
        sb.append("- Ausgeschüttet wird an die besten 10 Prozent, bei 200 Managern also an die ersten 20.\r\n");
        sb.append("- Der Erste Gewinner bekommt ").append(gewinnProzent).append(" Prozent der Ausschüttung, der letzte Gewinner ").append(gewinnLetzter).append(" Euro.\r\n\r\n");

        sb.append("SPIELERLISTE UND SAISONVERLAUF\r\n\r\n");
        if (playersUrl != null) {
            sb.append("- Spielerliste online öffnen: ").append(playersUrl).append(" oder im kicker Sonderheft\r\n");
        }
        if (documentsUrl != null) {
            sb.append("- Die erfolgreichsten Spieler der letzten Saison: in den Dokumenten: ").append(documentsUrl).append("\r\n");
        }
        sb.append("- In der Winterpause dürfen bis zu drei Spieler getauscht werden\r\n\r\n");

        sb.append("VIEL ERFOLG\r\n\r\n");
        sb.append("Wir wünschen allen Managerinnen und Managern eine gute Hand beim Aufstellen, viele Punkte und vor allem viel Spaß. Möge das beste Team gewinnen!\r\n\r\n");
        sb.append("Viele Grüße\r\n");
        sb.append("Uwe Clement\r\n");
        sb.append("Wolfgang Gehring\r\n\r\n");
        if (webUrl != null) {
            sb.append(webUrl).append("\r\n\r\n");
        }
        sb.append("Private Liga, ehrenamtlich, ohne Gewinnabsicht. Rechtsweg ausgeschlossen.\r\n");
        sb.append("Fragen? Einfach auf diese Mail antworten.\r\n");

        return sb.toString();
    }

    private Context buildContext(Season season, String webUrl) {
        Context context = new Context(Locale.GERMANY);

        context.setVariable("seasonName", season.getName() != null ? season.getName() : "Aktuelle Saison");
        context.setVariable("startDateLong", formatOrDefault(season.getSeasonStartDate(), DATE_LONG, "siehe Webseite"));
        LocalDate deadline = season.getFinalRegistrationDate() != null
            ? season.getFinalRegistrationDate()
            : season.getSeasonStartDate();
        context.setVariable("deadlineDate", formatOrDefault(deadline, DATE_LONG, "siehe Webseite"));
        context.setVariable("deadlineTime", formatOrDefault(season.getSeasonStartTime(), TIME_FMT, "20:30"));
        context.setVariable("startRoundRueckrunde", season.getStartRoundRueckrunde() != null ? String.valueOf(season.getStartRoundRueckrunde()) : "--");
        context.setVariable("spieleinsatz", formatCurrency(season.getSpieleinsatzEuro(), "10"));
        context.setVariable("serverkosten", formatCurrency(season.getServerkostenEuro(), "60"));
        context.setVariable("gewinnProzent", season.getGewinnErsterPlatzProzent() != null ? String.valueOf(season.getGewinnErsterPlatzProzent()) : "10");
        context.setVariable("gewinnLetzter", formatCurrency(season.getGewinnLetzterPlatzEuro(), "15"));
        context.setVariable("anzahlSpielleiter", season.getAnzahlSpielleiter() != null ? String.valueOf(season.getAnzahlSpielleiter()) : "2");
        context.setVariable("budget", formatBudget(season.getBudget()));
        context.setVariable("playersUrl", webUrl != null ? webUrl + "/players" : null);
        context.setVariable("documentsUrl", webUrl != null ? webUrl + "/documents" : null);
        context.setVariable("webUrl", webUrl);

        return context;
    }

    private String formatOrDefault(LocalDate date, DateTimeFormatter fmt, String fallback) {
        return date != null ? date.format(fmt) : fallback;
    }

    private String formatOrDefault(LocalTime time, DateTimeFormatter fmt, String fallback) {
        return time != null ? time.format(fmt) : fallback;
    }

    private String formatCurrency(java.math.BigDecimal value, String fallback) {
        if (value == null) {
            return fallback;
        }
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.GERMANY);
        nf.setMaximumFractionDigits(0);
        return nf.format(value);
    }

    private String formatBudget(Integer value) {
        if (value == null) {
            return "30.000.000";
        }
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.GERMANY);
        return nf.format(value);
    }

    private String normalizeWebUrl(String webUrl) {
        if (webUrl == null || webUrl.isBlank()) {
            return null;
        }
        return webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
    }

    String insertUnsubscribeFooter(String html, String unsubscribeUrl) {
        String escapedUrl = escapeHtml(unsubscribeUrl);
        String footer = "<div style=\"margin-top:16px;padding-top:16px;border-top:1px solid #d1d5db;text-align:center;\">"
            + "<p style=\"color:#000000;font-size:14px;margin:0;line-height:1.5;\">"
            + "Wenn Sie keine weiteren Mails der FFL erhalten möchten, können Sie sich "
            + "<a href=\"" + escapedUrl + "\" target=\"_blank\" style=\"color:#000000;text-decoration:underline;\">hier austragen</a>."
            + "</p></div>";
        return html.replace("</body>", footer + "</body>");
    }

    private String appendUnsubscribePlainText(String text, String unsubscribeUrl) {
        return text + "\r\n\r\nWenn Sie keine weiteren Mails der FFL erhalten möchten, können Sie sich hier austragen: " + unsubscribeUrl;
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

    private void send(SseEmitter emitter, String message) {
        try {
            emitter.send(SseEmitter.event().data(message));
        } catch (Exception e) {
            log.warn("SSE send failed: {}", e.getMessage());
        }
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;");
    }
}
