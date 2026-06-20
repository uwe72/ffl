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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class InvitationMailService {

    private static final Logger log = LoggerFactory.getLogger(InvitationMailService.class);

    private final SystemConfigRepository systemConfigRepository;
    private final SeasonRepository seasonRepository;
    private final EmailAddressRepository emailAddressRepository;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    public InvitationMailService(SystemConfigRepository systemConfigRepository,
                                 SeasonRepository seasonRepository,
                                 EmailAddressRepository emailAddressRepository) {
        this.systemConfigRepository = systemConfigRepository;
        this.seasonRepository = seasonRepository;
        this.emailAddressRepository = emailAddressRepository;
    }

    public String generatePreviewHtml(Long seasonId) {
        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new RuntimeException("Saison " + seasonId + " nicht gefunden"));

        if (season.getInvitationMailText() == null || season.getInvitationMailText().isBlank()) {
            throw new RuntimeException("Kein Einladungsmail-Text für diese Saison hinterlegt");
        }

        return buildHtmlContent(season);
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

                if (season.getInvitationMailText() == null || season.getInvitationMailText().isBlank()) {
                    emitter.send(SseEmitter.event().name("error").data("FEHLER: Kein Einladungsmail-Text hinterlegt"));
                    emitter.complete();
                    return;
                }

                if (season.getInvitationMailSubject() == null || season.getInvitationMailSubject().isBlank()) {
                    emitter.send(SseEmitter.event().name("error").data("FEHLER: Kein Betreff für die Einladungsmail hinterlegt"));
                    emitter.complete();
                    return;
                }

                List<EmailAddress> allEmails = emailAddressRepository.findAll();
                Map<Long, EmailAddress> emailsById = allEmails.stream()
                    .collect(Collectors.toMap(EmailAddress::getId, e -> e));

                JavaMailSenderImpl mailSender = buildMailSender(config);
                String htmlContent = buildHtmlContent(season);
                String subject = season.getInvitationMailSubject();

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
                        MimeMessage msg = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                        helper.setFrom(config.getGmailSenderEmail());
                        helper.setTo(testMode ? config.getGmailSenderEmail() : recipientEmail);
                        helper.setSubject(subject);
                        helper.setText(htmlContent, true);

                        if (!testMode) {
                            mailSender.send(msg);
                        } else {
                            if (sent == 0) {
                                mailSender.send(msg);
                            }
                        }

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

    private String buildHtmlContent(Season season) {
        String bodyBg = "#f5f5f7";
        String textPrimary = "#0a0a0a";

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:").append(bodyBg).append(";color:").append(textPrimary).append(";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px;margin:0;word-break:keep-all;overflow-wrap:anywhere;hyphens:none;\">");
        sb.append("<div style=\"max-width:700px;margin:0 auto;\">");

        if (season.getInvitationMailText() != null && !season.getInvitationMailText().isBlank()) {
            sb.append("<div style='margin-bottom:24px;word-break:keep-all;overflow-wrap:anywhere;hyphens:none;'>");
            sb.append(PrizeDistributionHtmlBuilder.prepareMailText(season.getInvitationMailText()));
            sb.append("</div>");
        }

        sb.append("</div></body></html>");
        return sb.toString();
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
}
