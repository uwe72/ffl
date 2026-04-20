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

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FeedbackService {

    private static final int MAX_PER_HOUR = 3;
    private static final Duration WINDOW = Duration.ofHours(1);

    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;
    private final Map<String, Deque<Instant>> submitsByIp = new ConcurrentHashMap<>();

    public FeedbackService(SystemConfigRepository systemConfigRepository, UserRepository userRepository) {
        this.systemConfigRepository = systemConfigRepository;
        this.userRepository = userRepository;
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
            helper.setText(buildHtmlBody(request), true);
            mailSender.send(msg);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Mailversand fehlgeschlagen: " + e.getMessage(), e);
        }
    }

    private String buildHtmlBody(FeedbackRequest r) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:#0f1419;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:16px;margin:0;\">");
        sb.append("<div style=\"max-width:480px;margin:0 auto;\">");

        sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-radius:8px;padding:16px;margin-bottom:16px;\">");
        sb.append("<h1 style=\"color:#c9a66b;margin:0 0 4px 0;font-size:20px;\">FFL Feedback</h1>");
        sb.append("<div style=\"color:#a0aec0;font-size:14px;\">Neue Nachricht von einem Benutzer</div>");
        sb.append("</div>");

        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:16px;\"><tr>");
        sb.append("<td width=\"50%\" style=\"padding-right:4px;\">");
        sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;padding:12px;\">");
        sb.append("<div style=\"font-size:12px;color:#a0aec0;\">Name</div>");
        sb.append("<div style=\"font-size:16px;font-weight:600;color:#f5f5f5;margin-top:4px;\">").append(escape(r.getName())).append("</div>");
        sb.append("</div></td>");
        sb.append("<td width=\"50%\" style=\"padding-left:4px;\">");
        sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;padding:12px;\">");
        sb.append("<div style=\"font-size:12px;color:#a0aec0;\">E-Mail</div>");
        sb.append("<div style=\"font-size:14px;font-weight:600;color:#f5f5f5;margin-top:4px;\">").append(escape(r.getEmail())).append("</div>");
        sb.append("</div></td>");
        sb.append("</tr></table>");

        sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;padding:12px;margin-bottom:16px;\">");
        sb.append("<div style=\"font-size:12px;color:#a0aec0;\">Betreff</div>");
        sb.append("<div style=\"font-size:16px;font-weight:600;color:#f5f5f5;margin-top:4px;\">").append(escape(r.getSubject())).append("</div>");
        sb.append("</div>");

        sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-radius:8px;padding:16px;margin-bottom:16px;\">");
        sb.append("<div style=\"font-size:12px;color:#a0aec0;margin-bottom:8px;\">Nachricht</div>");
        sb.append("<div style=\"font-size:14px;line-height:1.6;color:#f5f5f5;\">").append(escape(r.getMessage()).replace("\n", "<br>")).append("</div>");
        sb.append("</div>");

        sb.append("<div style=\"color:#6b7280;font-size:12px;text-align:center;\">FFL — Fantasy Football League</div>");
        sb.append("</div></body></html>");
        return sb.toString();
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
