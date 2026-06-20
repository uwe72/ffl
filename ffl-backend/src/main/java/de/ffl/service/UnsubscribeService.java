package de.ffl.service;

import de.ffl.domain.EmailAddress;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.EmailAddressRepository;
import de.ffl.repository.SystemConfigRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Optional;
import java.util.Properties;

@Service
public class UnsubscribeService {

    private static final Logger log = LoggerFactory.getLogger(UnsubscribeService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final EmailAddressRepository emailAddressRepository;
    private final SystemConfigRepository systemConfigRepository;

    public UnsubscribeService(EmailAddressRepository emailAddressRepository,
                              SystemConfigRepository systemConfigRepository) {
        this.emailAddressRepository = emailAddressRepository;
        this.systemConfigRepository = systemConfigRepository;
    }

    public String generateToken(Long emailId) {
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
            .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));
        return computeHmac(emailId, config.getGmailAppPassword());
    }

    public boolean validateToken(Long emailId, String token) {
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        if (config == null || config.getGmailAppPassword() == null) return false;
        String expected = computeHmac(emailId, config.getGmailAppPassword());
        return expected.equals(token);
    }

    public String generateUnsubscribeUrl(Long emailId, String webUrl) {
        String token = generateToken(emailId);
        String base = webUrl != null && !webUrl.isBlank() ? webUrl.replaceAll("/$", "") : "http://localhost:8080";
        return base + "/api/public/unsubscribe?id=" + emailId + "&amp;token=" + token;
    }

    public Optional<EmailAddress> findEmailById(Long emailId) {
        return emailAddressRepository.findById(emailId);
    }

    @Transactional
    public void unsubscribe(Long emailId) {
        Optional<EmailAddress> opt = emailAddressRepository.findById(emailId);
        if (opt.isEmpty()) return;

        EmailAddress emailAddress = opt.get();
        String email = emailAddress.getEmail();
        emailAddressRepository.delete(emailAddress);
        log.info("Unsubscribe: E-Mail-Adresse {} (ID: {}) wurde ausgetragen", email, emailId);

        notifyAdmin(email, emailId);
    }

    private void notifyAdmin(String unsubscribedEmail, Long emailId) {
        try {
            SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
            if (config == null || config.getGmailSenderEmail() == null || config.getGmailAppPassword() == null) {
                log.warn("Admin-Benachrichtigung nicht möglich: Keine Systemkonfiguration");
                return;
            }

            JavaMailSenderImpl mailSender = buildMailSender(config);

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setSubject("FFL | Abmeldung vom Verteiler: " + unsubscribedEmail);

            String html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head>"
                + "<body style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px;\">"
                + "<h2 style=\"color:#c9a66b;\">Abmeldung vom FFL-Verteiler</h2>"
                + "<p>Die folgende E-Mail-Adresse hat sich aus dem FFL-Mailverteiler ausgetragen:</p>"
                + "<p style=\"font-size:18px;font-weight:bold;\">" + escapeHtml(unsubscribedEmail) + "</p>"
                + "<p style=\"color:#6b7280;\">ID: " + emailId + "</p>"
                + "<p style=\"color:#6b7280;font-size:12px;\">Die Adresse wurde automatisch aus der Verwaltung entfernt.</p>"
                + "</body></html>";

            helper.setText(html, true);
            mailSender.send(msg);
            log.info("Admin-Benachrichtigung über Abmeldung von {} gesendet", unsubscribedEmail);
        } catch (Exception e) {
            log.error("Fehler beim Senden der Admin-Benachrichtigung über Abmeldung von {}", unsubscribedEmail, e);
        }
    }

    private String computeHmac(Long emailId, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(keySpec);
            byte[] hash = mac.doFinal(("unsubscribe:" + emailId).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("HMAC-Berechnung fehlgeschlagen", e);
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

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
