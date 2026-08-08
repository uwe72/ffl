package de.ffl.service;

import de.ffl.domain.SystemConfig;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.FeedbackRequest;
import de.ffl.repository.SystemConfigRepository;
import de.ffl.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FeedbackService {

    private static final int MAX_PER_HOUR = 3;
    private static final Duration WINDOW = Duration.ofHours(1);

    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;
    private final SpringTemplateEngine templateEngine;
    private final Map<String, Deque<Instant>> submitsByIp = new ConcurrentHashMap<>();

    public FeedbackService(SystemConfigRepository systemConfigRepository, UserRepository userRepository, SpringTemplateEngine templateEngine) {
        this.systemConfigRepository = systemConfigRepository;
        this.userRepository = userRepository;
        this.templateEngine = templateEngine;
    }

    public static class RateLimitExceededException extends RuntimeException {
        public RateLimitExceededException() { super("Rate limit exceeded"); }
    }

    public void submit(FeedbackRequest request, String clientIp) {
        checkRateLimit(clientIp);

        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
            .orElseThrow(() -> new IllegalStateException("Keine Systemkonfiguration vorhanden"));

        if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
            || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
            throw new IllegalStateException("Gmail-Zugangsdaten sind nicht vollständig konfiguriert");
        }

        List<String> adminEmails = userRepository.findAll().stream()
            .filter(u -> u.getRole() == UserRole.ADMIN)
            .map(User::getEmail)
            .filter(e -> e != null && !e.isBlank())
            .toList();

        if (adminEmails.isEmpty()) {
            throw new IllegalStateException("Kein Admin-Empfänger mit E-Mail-Adresse gefunden");
        }

        JavaMailSenderImpl mailSender = buildMailSender(config);

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setCc(request.getEmail());
            helper.setBcc(adminEmails.toArray(new String[0]));
            helper.setReplyTo(request.getEmail());
            helper.setSubject("[FFL-Feedback] " + request.getSubject());
            helper.setText(buildHtmlBody(request, clientIp, config), true);
            mailSender.send(msg);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Mailversand fehlgeschlagen: " + e.getMessage(), e);
        }
    }

    private String buildHtmlBody(FeedbackRequest r, String clientIp, SystemConfig config) {
        Context context = new Context(Locale.GERMAN);
        context.setVariable("name", r.getName());
        context.setVariable("email", r.getEmail());
        context.setVariable("subject", r.getSubject());
        context.setVariable("messageHtml", escape(r.getMessage()).replace("\n", "<br>"));
        context.setVariable("submittedAt", DateTimeFormatter
            .ofPattern("dd.MM.yyyy HH:mm")
            .withZone(ZoneId.of("Europe/Berlin"))
            .format(Instant.now()));
        context.setVariable("clientIp", clientIp == null ? "-" : clientIp);
        context.setVariable("webUrl", normalizeWebUrl(config.getWebUrl()));
        return templateEngine.process("mail/feedback-message", context);
    }

    private String normalizeWebUrl(String webUrl) {
        if (webUrl == null || webUrl.isBlank()) {
            return null;
        }
        return webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
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
        props.put("mail.smtp.connectiontimeout", "15000");
        props.put("mail.smtp.timeout", "30000");
        props.put("mail.smtp.writetimeout", "30000");
        return sender;
    }

    private void checkRateLimit(String ip) {
        Instant now = Instant.now();
        Instant cutoff = now.minus(WINDOW);
        submitsByIp.compute(ip == null ? "unknown" : ip, (k, existing) -> {
            Deque<Instant> dq = existing != null ? existing : new ArrayDeque<>();
            while (!dq.isEmpty() && dq.peekFirst().isBefore(cutoff)) {
                dq.pollFirst();
            }
            if (dq.size() >= MAX_PER_HOUR) {
                throw new RateLimitExceededException();
            }
            dq.addLast(now);
            return dq;
        });
    }
}
