package de.ffl.service;

import de.ffl.domain.SystemConfig;
import de.ffl.dto.TestMailResultDto;
import de.ffl.repository.SystemConfigRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class MatchdayMailService {

    private final SystemConfigRepository systemConfigRepository;
    private final MatchdayMailTransactionService transactionService;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    private static final Logger log = LoggerFactory.getLogger(MatchdayMailService.class);

    public MatchdayMailService(SystemConfigRepository systemConfigRepository,
                               MatchdayMailTransactionService transactionService) {
        this.systemConfigRepository = systemConfigRepository;
        this.transactionService = transactionService;
    }

    public TestMailResultDto sendTestMail(String toEmail) {
        try {
            SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));

            String email = config.getGmailSenderEmail();
            String password = config.getGmailAppPassword();
            String server = config.getGmailSmtpServer() != null ? config.getGmailSmtpServer() : "smtp.gmail.com";
            Integer port = config.getGmailSmtpPort() != null ? config.getGmailSmtpPort() : 587;

            log.info("Test-Mail Konfiguration:");
            log.info("  Email: {}", email);
            log.info("  Passwort: {}", password);
            log.info("  Server: {}", server);
            log.info("  Port: {}", port);
            log.info("  Empfänger: {}", toEmail);

            if (email == null || email.isBlank() || password == null || password.isBlank()) {
                return new TestMailResultDto(false, "Gmail-Zugangsdaten sind nicht vollständig konfiguriert", email, password, server, port);
            }

            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost(server);
            mailSender.setPort(port);
            mailSender.setUsername(email);
            mailSender.setPassword(password);

            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            props.put("mail.smtp.connectiontimeout", "30000");
            props.put("mail.smtp.timeout", "120000");
            props.put("mail.smtp.writetimeout", "120000");

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss"));
            String subject = "FFL Test-Mail";
            String htmlContent = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head>" +
                "<body style=\"font-family:Arial,Helvetica,sans-serif;padding:20px;\">" +
                "<h2 style=\"color:#c9a66b;\">FFL Test-Mail</h2>" +
                "<p>Dies ist eine Test-Mail von der Fantasy Football League.</p>" +
                "<p style=\"color:#6b7280;font-size:12px;\">Gesendet am: " + timestamp + "</p>" +
                "</body></html>";

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(email);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(msg);

            log.info("Test-Mail erfolgreich gesendet an: {}", toEmail);
            return new TestMailResultDto(true, "Test-Mail erfolgreich an " + toEmail + " gesendet", email, password, server, port);

        } catch (Exception e) {
            log.error("Fehler beim Senden der Test-Mail: {}", e.getMessage(), e);
            SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
            String email = config != null ? config.getGmailSenderEmail() : null;
            String password = config != null ? config.getGmailAppPassword() : null;
            String server = config != null && config.getGmailSmtpServer() != null ? config.getGmailSmtpServer() : "smtp.gmail.com";
            Integer port = config != null && config.getGmailSmtpPort() != null ? config.getGmailSmtpPort() : 587;
            return new TestMailResultDto(false, "Fehler: " + e.getMessage(), email, password, server, port);
        }
    }

    public SseEmitter streamMatchdayMail(Long seasonId, Integer roundNumber, List<Long> managerIds, String comment, boolean testMode) {
        SseEmitter emitter = new SseEmitter(600_000L);
        executor.execute(() -> {
            try {
                SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
                    .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));

                if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                    || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
                    emitter.send(SseEmitter.event().name("error").data("FEHLER: Gmail-Zugangsdaten sind nicht vollstaendig konfiguriert"));
                    emitter.complete();
                    return;
                }

                JavaMailSenderImpl mailSender = buildMailSender(config);
                transactionService.runMailJob(emitter, seasonId, roundNumber, managerIds, mailSender, config, comment, testMode);
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
}
