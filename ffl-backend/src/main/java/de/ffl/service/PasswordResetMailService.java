package de.ffl.service;

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

import java.util.Properties;

@Service
public class PasswordResetMailService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailService.class);

    private final SystemConfigRepository systemConfigRepository;

    public PasswordResetMailService(SystemConfigRepository systemConfigRepository) {
        this.systemConfigRepository = systemConfigRepository;
    }

    @Async
    public void sendPasswordResetMail(User user, String token) {
        try {
            SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
            if (config == null) {
                log.warn("Keine Systemkonfiguration vorhanden, Passwort-Reset-Mail wird nicht gesendet");
                return;
            }

            if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
                log.warn("Gmail-Zugangsdaten nicht konfiguriert, Passwort-Reset-Mail wird nicht gesendet");
                return;
            }

            JavaMailSenderImpl mailSender = buildMailSender(config);

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");

            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(user.getEmail());
            helper.setSubject("FFL | Passwort zurücksetzen");

            String webUrl = config.getWebUrl();
            if (webUrl == null || webUrl.isBlank()) {
                webUrl = "http://localhost:5173";
            }
            String base = webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
            String resetLink = base + "/reset-password?token=" + token;

            String html = buildResetHtml(user, resetLink, base);
            helper.setText(html, true);

            mailSender.send(msg);
            log.info("Passwort-Reset-Mail gesendet an: {}", user.getEmail());

        } catch (Exception e) {
            log.error("Fehler beim Senden der Passwort-Reset-Mail: {}", e.getMessage(), e);
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

    private String buildResetHtml(User user, String resetLink, String webUrl) {
        String bodyBg = "#f5f5f7";
        String bodyText = "#0a0a0a";
        String cardBgAlt = "#f0f0f0";
        String textPrimary = "#0a0a0a";
        String textSecondary = "#1a3a5c";
        String textTertiary = "#6b7280";
        String linkColor = "#0056CC";

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:").append(bodyBg).append(";color:").append(bodyText).append(";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px 2px;margin:0;\">");
        sb.append("<div style=\"max-width:600px;margin:0 auto;\">");

        String greeting = user.getFirstName() != null && !user.getFirstName().isBlank()
            ? user.getFirstName()
            : user.getLogin();
        sb.append("<p style=\"color:").append(textTertiary).append(";font-size:15px;font-weight:700;line-height:1.5;margin:0 0 14px 0;\">Hallo ").append(escape(greeting)).append("!</p>");

        sb.append("<div style=\"background:").append(cardBgAlt).append(";padding:12px 14px;margin:0 0 14px 0;color:").append(textPrimary).append(";font-size:13px;line-height:1.5;border-radius:12px;border:1px solid #c0c0c0;\">");
        sb.append("Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button unten, um ein neues Passwort zu vergeben.");
        sb.append("</div>");

        sb.append("<div style=\"text-align:center;margin:24px 0;\">");
        sb.append("<a href=\"").append(escape(resetLink)).append("\" style=\"display:inline-block;background:").append(linkColor).append(";color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;\">Passwort zurücksetzen</a>");
        sb.append("</div>");

        sb.append("<div style=\"background:").append(cardBgAlt).append(";padding:12px 14px;margin:0 0 14px 0;color:").append(textTertiary).append(";font-size:12px;line-height:1.5;border-radius:12px;border:1px solid #c0c0c0;\">");
        sb.append("Dieser Link ist <strong>30 Minuten</strong> gültig. Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.");
        sb.append("</div>");

        sb.append("<div style=\"margin-top:16px;color:").append(textTertiary).append(";font-size:11px;line-height:1.5;\">");
        sb.append("Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>");
        sb.append("<a href=\"").append(escape(resetLink)).append("\" style=\"color:").append(linkColor).append(";word-break:break-all;\">").append(escape(resetLink)).append("</a>");
        sb.append("</div>");

        if (webUrl != null && !webUrl.isBlank()) {
            sb.append("<div style=\"margin-top:24px;color:").append(textTertiary).append(";font-size:12px;text-align:center;\">");
            sb.append("<div style=\"font-size:10px;font-weight:700;color:").append(textSecondary).append(";margin-bottom:2px;\">Webseite</div>");
            sb.append("<a href=\"").append(escape(webUrl)).append("\" style=\"color:").append(linkColor).append(";font-weight:700;text-decoration:none;\">FFL - Fantasy Football League</a>");
            sb.append("</div>");
        }

        sb.append("<div style=\"margin-top:16px;padding-top:16px;border-top:1px solid #c0c0c0;color:").append(textTertiary).append(";font-size:12px;text-align:center;line-height:1.6;\">");
        sb.append("Fragen? Antworte einfach direkt auf diese E-Mail.");
        sb.append("</div>");

        sb.append("</div></body></html>");
        return sb.toString();
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
