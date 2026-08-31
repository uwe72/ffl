package de.ffl.service;

import de.ffl.domain.EmailAddress;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.EmailAddressRepository;
import de.ffl.repository.ManagerRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class ReminderMailService {

    private static final Logger log = LoggerFactory.getLogger(ReminderMailService.class);

    private static final DateTimeFormatter DATE_LONG = DateTimeFormatter.ofPattern("EEEE, d. MMMM yyyy", Locale.GERMANY);
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private static final int BCC_CHUNK_SIZE = 200;

    private final SystemConfigRepository systemConfigRepository;
    private final SeasonRepository seasonRepository;
    private final EmailAddressRepository emailAddressRepository;
    private final ManagerRepository managerRepository;
    private final UnsubscribeService unsubscribeService;
    private final InvitationMailService invitationMailService;
    private final SpringTemplateEngine templateEngine;
    private final SmtpMailTransport smtpMailTransport;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    public ReminderMailService(SystemConfigRepository systemConfigRepository,
                               SeasonRepository seasonRepository,
                               EmailAddressRepository emailAddressRepository,
                               ManagerRepository managerRepository,
                               UnsubscribeService unsubscribeService,
                               InvitationMailService invitationMailService,
                               SpringTemplateEngine templateEngine,
                               SmtpMailTransport smtpMailTransport) {
        this.systemConfigRepository = systemConfigRepository;
        this.seasonRepository = seasonRepository;
        this.emailAddressRepository = emailAddressRepository;
        this.managerRepository = managerRepository;
        this.unsubscribeService = unsubscribeService;
        this.invitationMailService = invitationMailService;
        this.templateEngine = templateEngine;
        this.smtpMailTransport = smtpMailTransport;
    }

    public void sendTestMail(Long seasonId, boolean registered) {
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
            .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));

        if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
            || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
            throw new RuntimeException("Gmail-Zugangsdaten sind nicht vollständig konfiguriert");
        }

        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new RuntimeException("Saison nicht gefunden"));

        String webUrl = normalizeWebUrl(config.getWebUrl());
        long anzahlManager = managerRepository.countBySeasonId(seasonId);
        String recipientEmail = config.getGmailSenderEmail();
        String html = buildHtml(season, registered, anzahlManager, webUrl, recipientEmail);
        String plainText = buildPlainText(season, registered, anzahlManager, webUrl, recipientEmail);
        if (!registered) {
            String unsubscribeUrl = unsubscribeService.getUnsubscribePlaceholderUrl();
            html = insertUnsubscribeFooter(html, unsubscribeUrl);
            plainText = appendUnsubscribePlainText(plainText, unsubscribeUrl);
        }
        String subject = buildSubject(season, registered);

        try {
            JavaMailSenderImpl mailSender = smtpMailTransport.buildSender(config);
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setSubject(subject);
            helper.setText(plainText, html);

            mailSender.send(msg);
            log.info("Erinnerungsmail (Test, registered={}) gesendet an Admin: {}", registered, config.getGmailSenderEmail());
        } catch (Exception e) {
            log.error("Fehler beim Senden der Test-Erinnerungsmail: {}", e.getMessage(), e);
            throw new RuntimeException("Versand fehlgeschlagen: " + e.getMessage(), e);
        }
    }

    public List<String> getRegisteredEmails(Long seasonId) {
        return managerRepository.findDistinctUserEmailsBySeasonId(seasonId);
    }

    public SseEmitter streamReminderMail(Long seasonId, List<Long> emailIds, boolean testMode) {
        return streamReminderMail(seasonId, emailIds, testMode, null);
    }

    public SseEmitter streamReminderMail(Long seasonId, List<Long> emailIds, boolean testMode, String sendMode) {
        SseEmitter emitter = new SseEmitter(1_200_000L);
        executor.execute(() -> {
            SmtpMailTransport.TransportState transportState = new SmtpMailTransport.TransportState();
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

                long anzahlManager = managerRepository.countBySeasonId(seasonId);
                Set<String> registeredEmails = managerRepository.findDistinctUserEmailsBySeasonId(seasonId).stream()
                    .filter(Objects::nonNull)
                    .map(String::toLowerCase)
                    .collect(Collectors.toSet());

                List<EmailAddress> allEmails = emailAddressRepository.findAll();
                Map<Long, EmailAddress> emailsById = allEmails.stream()
                    .collect(Collectors.toMap(EmailAddress::getId, e -> e));

                JavaMailSenderImpl mailSender = smtpMailTransport.buildSender(config);
                String webUrl = normalizeWebUrl(config.getWebUrl());

                smtpMailTransport.send(emitter, "Mail-Server verbunden (" + config.getGmailSmtpServer() + ":" + config.getGmailSmtpPort() + ")");
                smtpMailTransport.send(emitter, "Registrierte Manager der Saison: " + anzahlManager);
                smtpMailTransport.send(emitter, "Starte Versand an " + emailIds.size() + " Empfänger...");

                int sent = 0;
                int failed = 0;
                int bccMails = 0;
                int bccRecipients = 0;
                int individualSent = 0;
                int skipped = 0;

                List<EmailAddress> registeredList = new ArrayList<>();
                List<EmailAddress> nonRegisteredList = new ArrayList<>();
                for (Long emailId : emailIds) {
                    EmailAddress emailAddress = emailsById.get(emailId);
                    if (emailAddress == null) {
                        smtpMailTransport.send(emitter, "✗ E-Mail-ID " + emailId + " nicht gefunden");
                        failed++;
                        continue;
                    }
                    RecipientBucket bucket = classify(emailAddress, registeredEmails, sendMode);
                    switch (bucket) {
                        case DANKE -> registeredList.add(emailAddress);
                        case ERINNERUNG -> nonRegisteredList.add(emailAddress);
                        case SKIP -> {
                            smtpMailTransport.send(emitter, "⤼ [" + emailAddress.getId() + "] " + emailAddress.getEmail()
                                + " übersprungen (bereits angemeldet)");
                            skipped++;
                        }
                    }
                }

                if (!registeredList.isEmpty()) {
                    if (testMode) {
                        try {
                            String html = buildHtml(season, true, anzahlManager, webUrl, null);
                            String plainText = buildPlainText(season, true, anzahlManager, webUrl, null);

                            MimeMessage msg = mailSender.createMimeMessage();
                            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                            helper.setFrom(config.getGmailSenderEmail());
                            helper.setTo(config.getGmailSenderEmail());
                            helper.setSubject(buildSubject(season, true));
                            helper.setText(plainText, html);

                            boolean gesendet = smtpMailTransport.sendWithRetry(transportState, mailSender, msg,
                                "Danke-Testmail", config.getGmailSenderEmail(), emitter);
                            if (!gesendet) {
                                throw new RuntimeException("Danke-Testmail fehlgeschlagen");
                            }
                            bccMails++;
                            bccRecipients += registeredList.size();
                            sent += registeredList.size();
                            smtpMailTransport.send(emitter, "[TEST] ✓ Danke-Mail an Admin (stellvertretend für " + registeredList.size() + " registrierte Empfänger)");
                        } catch (Exception e) {
                            failed += registeredList.size();
                            smtpMailTransport.send(emitter, "✗ Danke-Testmail fehlgeschlagen: " + e.getMessage());
                            log.error("Fehler beim Senden der Danke-Testmail", e);
                        }
                    } else {
                        for (int start = 0; start < registeredList.size(); start += BCC_CHUNK_SIZE) {
                            List<EmailAddress> chunk = registeredList.subList(start,
                                Math.min(start + BCC_CHUNK_SIZE, registeredList.size()));
                            List<String> recipients = chunk.stream()
                                .map(EmailAddress::getEmail)
                                .collect(Collectors.toList());
                            try {
                                String html = buildHtml(season, true, anzahlManager, webUrl, null);
                                String plainText = buildPlainText(season, true, anzahlManager, webUrl, null);

                                MimeMessage msg = mailSender.createMimeMessage();
                                MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                                helper.setFrom(config.getGmailSenderEmail());
                                helper.setTo(config.getGmailSenderEmail());
                                helper.setBcc(recipients.toArray(new String[0]));
                                helper.setSubject(buildSubject(season, true));
                                helper.setText(plainText, html);

                                boolean gesendet = smtpMailTransport.sendWithRetry(transportState, mailSender, msg,
                                    "BCC-Mail (Danke)", config.getGmailSenderEmail(), emitter);
                                if (!gesendet) {
                                    throw new RuntimeException("BCC-Mail (Danke) fehlgeschlagen");
                                }
                                bccMails++;
                                bccRecipients += recipients.size();
                                sent += recipients.size();
                                smtpMailTransport.send(emitter, "✓ BCC-Mail (Danke) an " + recipients.size() + " Empfänger");
                            } catch (Exception e) {
                                failed += recipients.size();
                                smtpMailTransport.send(emitter, "✗ BCC-Mail (Danke) fehlgeschlagen: " + e.getMessage());
                                log.error("Fehler beim Senden der Danke-BCC-Mail", e);
                            }
                        }
                    }
                }

                long lastKeepAlive = System.currentTimeMillis();
                int individualTotal = nonRegisteredList.size();
                for (EmailAddress emailAddress : nonRegisteredList) {
                    String recipientEmail = emailAddress.getEmail();

                    try {
                        String html = buildHtml(season, false, anzahlManager, webUrl, recipientEmail);
                        String plainText = buildPlainText(season, false, anzahlManager, webUrl, recipientEmail);
                        String unsubscribeUrl = unsubscribeService.generateUnsubscribeUrl(emailAddress.getId(), config.getWebUrl());
                        html = insertUnsubscribeFooter(html, unsubscribeUrl);
                        plainText = appendUnsubscribePlainText(plainText, unsubscribeUrl);

                        MimeMessage msg = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                        helper.setFrom(config.getGmailSenderEmail());
                        helper.setTo(testMode ? config.getGmailSenderEmail() : recipientEmail);
                        helper.setSubject(buildSubject(season, false));
                        helper.setText(plainText, html);

                        String label = "[" + emailAddress.getId() + "] " + recipientEmail + " (Erinnerung)";
                        boolean gesendet = smtpMailTransport.sendWithRetry(transportState, mailSender, msg,
                            label, testMode ? config.getGmailSenderEmail() : recipientEmail, emitter);
                        if (!gesendet) {
                            failed++;
                            continue;
                        }

                        smtpMailTransport.send(emitter, (testMode ? "[TEST] " : "") + "✓ " + label);
                        individualSent++;
                        sent++;

                        Thread.sleep(1000);

                        long now = System.currentTimeMillis();
                        if (now - lastKeepAlive > 30000) {
                            emitter.send(SseEmitter.event().comment("keep-alive"));
                            lastKeepAlive = now;
                        }

                        if (individualSent % 50 == 0 && individualSent < individualTotal) {
                            for (int remaining = 90; remaining > 0; remaining--) {
                                smtpMailTransport.send(emitter, "⏳ " + individualSent + " Mails versendet, warte " + remaining + " Sekunden...");
                                Thread.sleep(1000);
                            }
                            smtpMailTransport.send(emitter, "⏳ Wartezeit beendet, weiter mit nächstem Block...");
                            lastKeepAlive = System.currentTimeMillis();
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        smtpMailTransport.send(emitter, "✗ Versand unterbrochen: " + e.getMessage());
                        failed++;
                        break;
                    } catch (Exception e) {
                        smtpMailTransport.send(emitter, "✗ [" + emailAddress.getId() + "] " + recipientEmail + ": " + e.getMessage());
                        failed++;
                        log.error("Fehler beim Senden der Erinnerungsmail an {}", recipientEmail, e);
                    }
                }

                smtpMailTransport.send(emitter, "");
                smtpMailTransport.send(emitter, "Fertig: " + bccMails + " Danke-BCC-Mail(s) an " + bccRecipients + " Empfänger, "
                    + individualSent + " einzeln versendet, " + skipped + " übersprungen, " + failed + " fehlgeschlagen."
                    + (testMode ? " (TEST-MODUS)" : ""));
                emitter.send(SseEmitter.event().name("complete").data(""));
                emitter.complete();
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event().name("error").data("FEHLER: " + e.getMessage()));
                } catch (Exception ignored) {
                }
                emitter.completeWithError(e);
            } finally {
                smtpMailTransport.closeQuietly(transportState.transport);
            }
        });
        return emitter;
    }

    private String buildHtml(Season season, boolean registered, long anzahlManager, String webUrl, String recipientEmail) {
        Context context = buildContext(season, registered, anzahlManager, webUrl, recipientEmail);
        return templateEngine.process("mail/reminder", context);
    }

    private String buildPlainText(Season season, boolean registered, long anzahlManager, String webUrl, String recipientEmail) {
        String seasonName = season.getName() != null ? season.getName() : "Aktuelle Saison";
        String deadlineDate = formatOrDefault(season.getFinalRegistrationDate() != null
            ? season.getFinalRegistrationDate()
            : season.getSeasonStartDate(), DATE_LONG, "siehe Webseite");
        String deadlineTime = formatOrDefault(season.getSeasonStartTime(), TIME_FMT, "20:30");

        StringBuilder sb = new StringBuilder();
        sb.append("FFL · Fantasy Football League\r\n\r\n");
        if (registered) {
            sb.append("Danke für Deine Anmeldung zur FFL-Saison ").append(seasonName).append("!\r\n\r\n");
            sb.append("Schon ").append(anzahlManager).append(" Manager sind dabei. Du kannst gerne noch Freunde, Bekannte oder Familienmitglieder einladen – oder mit einem neuen Login ein Zweitteam registrieren.\r\n\r\n");
            sb.append("Einfach diese Mail weiterleiten.\r\n\r\n");
            sb.append("------------------------------------------------------------------\r\n\r\n");
            sb.append(invitationMailService.buildPlainText(season, webUrl));
            sb.append("\r\n");
        } else {
            sb.append("Die Anmeldung für die FFL-Saison ").append(seasonName).append(" ist noch offen – schon ").append(anzahlManager).append(" Manager sind dabei.\r\n\r\n");
            sb.append("Du hast bis ").append(deadlineDate).append(" um ").append(deadlineTime).append(" Uhr Zeit, Dich anzumelden und Dein Team aufzustellen.\r\n\r\n");
            if (webUrl != null) {
                sb.append("Jetzt anmelden: ").append(webUrl).append("\r\n\r\n");
            }
            sb.append("Wir haben diese E-Mail an ").append(recipientEmail != null ? recipientEmail : "").append(" gesendet. Vielleicht hast Du Dein Team aber auch unter einer anderen E-Mail-Adresse angemeldet – dann ist diese Mail nur eine freundliche Erinnerung und Du kannst sie einfach ignorieren.\r\n\r\n");
            sb.append("Die nächste Mail von uns kommt erst wieder im August nächsten Jahres.\r\n\r\n");
        }
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

    private Context buildContext(Season season, boolean registered, long anzahlManager, String webUrl, String recipientEmail) {
        Context context = new Context(Locale.GERMANY);

        context.setVariable("registered", registered);
        context.setVariable("recipientEmail", recipientEmail);
        context.setVariable("seasonName", season.getName() != null ? season.getName() : "Aktuelle Saison");
        context.setVariable("anzahlManager", anzahlManager);
        context.setVariable("startDateLong", formatOrDefault(season.getSeasonStartDate(), DATE_LONG, "siehe Webseite"));
        context.setVariable("deadlineDate", formatOrDefault(season.getFinalRegistrationDate() != null
            ? season.getFinalRegistrationDate()
            : season.getSeasonStartDate(), DATE_LONG, "siehe Webseite"));
        context.setVariable("deadlineTime", formatOrDefault(season.getSeasonStartTime(), TIME_FMT, "20:30"));
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

    private String buildSubject(Season season, boolean registered) {
        String seasonName = season.getName() != null ? season.getName() : "Aktuelle Saison";
        return registered
            ? "FFL | Danke für Deine Anmeldung | " + seasonName
            : "FFL | Kurze Erinnerung: Saison " + seasonName;
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
            + "Wenn Du keine weiteren Mails der FFL erhalten möchtest, kannst Du dich "
            + "<a href=\"" + escapedUrl + "\" target=\"_blank\" style=\"color:#000000;text-decoration:underline;\">hier austragen</a>."
            + "</p>"
            + "<p style=\"font-size:14px;margin:0;line-height:1.5;\">&nbsp;</p>"
            + "</div>";
        return html.replace("</body>", footer + "</body>");
    }

    boolean isRegistered(EmailAddress emailAddress, Set<String> registeredEmails) {
        return emailAddress != null
            && emailAddress.getEmail() != null
            && registeredEmails.contains(emailAddress.getEmail().toLowerCase());
    }

    enum RecipientBucket { DANKE, ERINNERUNG, SKIP }

    RecipientBucket classify(EmailAddress emailAddress, Set<String> registeredEmails, String sendMode) {
        boolean registered = isRegistered(emailAddress, registeredEmails);
        if ("danke".equalsIgnoreCase(sendMode)) {
            return RecipientBucket.DANKE;
        }
        if ("erinnerung".equalsIgnoreCase(sendMode)) {
            return registered ? RecipientBucket.SKIP : RecipientBucket.ERINNERUNG;
        }
        return registered ? RecipientBucket.DANKE : RecipientBucket.ERINNERUNG;
    }

    private String appendUnsubscribePlainText(String text, String unsubscribeUrl) {
        return text + "\r\n\r\nWenn Du keine weiteren Mails der FFL erhalten möchtest, kannst Du dich hier austragen: " + unsubscribeUrl + "\r\n";
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;");
    }
}
