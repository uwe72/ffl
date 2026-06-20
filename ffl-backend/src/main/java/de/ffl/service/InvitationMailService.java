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

import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class InvitationMailService {

    private static final Logger log = LoggerFactory.getLogger(InvitationMailService.class);
    private static final int BATCH_SIZE = 10;

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

    public SseEmitter streamInvitationMail(Long seasonId, boolean testMode) {
        SseEmitter emitter = new SseEmitter(600_000L);
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
                if (allEmails.isEmpty()) {
                    emitter.send(SseEmitter.event().name("error").data("FEHLER: Keine E-Mail-Adressen in der Verwaltung vorhanden"));
                    emitter.complete();
                    return;
                }

                JavaMailSenderImpl mailSender = buildMailSender(config);
                String htmlContent = buildHtmlContent(season);
                String subject = season.getInvitationMailSubject();

                send(emitter, "Starte Versand an " + allEmails.size() + " Empfänger in " + ((allEmails.size() + BATCH_SIZE - 1) / BATCH_SIZE) + " Batches...");

                List<List<EmailAddress>> batches = partition(allEmails, BATCH_SIZE);
                int batchesSent = 0;
                int totalSent = 0;
                long lastKeepAlive = System.currentTimeMillis();

                for (List<EmailAddress> batch : batches) {
                    try {
                        MimeMessage msg = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                        helper.setFrom(config.getGmailSenderEmail());
                        helper.setTo(config.getGmailSenderEmail());
                        helper.setSubject(subject);
                        helper.setText(htmlContent, true);

                        if (testMode) {
                            helper.setBcc(config.getGmailSenderEmail());
                        } else {
                            String[] bccAddresses = batch.stream()
                                .map(EmailAddress::getEmail)
                                .toArray(String[]::new);
                            helper.setBcc(bccAddresses);
                        }

                        if (!testMode) {
                            mailSender.send(msg);
                        } else {
                            if (batchesSent == 0) {
                                mailSender.send(msg);
                            }
                        }

                        batchesSent++;
                        totalSent += batch.size();

                        String batchEmails = batch.stream()
                            .map(EmailAddress::getEmail)
                            .reduce((a, b) -> a + ", " + b)
                            .orElse("");

                        send(emitter, (testMode ? "[TEST] " : "") + "✓ Batch " + batchesSent + "/" + batches.size() + " gesendet (" + batch.size() + " Empfänger): " + batchEmails);

                        Thread.sleep(1000);

                        long now = System.currentTimeMillis();
                        if (now - lastKeepAlive > 30000) {
                            emitter.send(SseEmitter.event().comment("keep-alive"));
                            lastKeepAlive = now;
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        send(emitter, "✗ Versand unterbrochen");
                        break;
                    } catch (Exception e) {
                        send(emitter, "✗ Fehler bei Batch " + (batchesSent + 1) + ": " + e.getMessage());
                        log.error("Fehler beim Senden der Einladungsmail (Batch {})", batchesSent + 1, e);
                    }
                }

                send(emitter, "");
                send(emitter, "Versand abgeschlossen: " + totalSent + " Empfänger in " + batchesSent + " Batches" + (testMode ? " (TEST-MODUS)" : ""));
                emitter.send(SseEmitter.event().name("complete").data("done"));
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

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return partitions;
    }
}
