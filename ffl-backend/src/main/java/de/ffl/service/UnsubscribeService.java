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
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Optional;
import java.util.Properties;

@Service
public class UnsubscribeService {

    private static final Logger log = LoggerFactory.getLogger(UnsubscribeService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final long TOKEN_TTL_SECONDS = 30L * 24 * 60 * 60;
    private static final String UNSUBSCRIBE_PLACEHOLDER_URL = "{ABMELDE-LINK}";

    private final EmailAddressRepository emailAddressRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final SpringTemplateEngine templateEngine;

    public UnsubscribeService(EmailAddressRepository emailAddressRepository,
                              SystemConfigRepository systemConfigRepository,
                              SpringTemplateEngine templateEngine) {
        this.emailAddressRepository = emailAddressRepository;
        this.systemConfigRepository = systemConfigRepository;
        this.templateEngine = templateEngine;
    }

    public String generateToken(Long emailId) {
        return generateToken(emailId, System.currentTimeMillis() / 1000L);
    }

    public String generateToken(Long emailId, long createdAtSec) {
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
            .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));
        return computeSignedToken(emailId, createdAtSec, config.getGmailAppPassword());
    }

    public boolean validateToken(Long emailId, String token) {
        return validateToken(emailId, token, System.currentTimeMillis() / 1000L);
    }

    public boolean validateToken(Long emailId, String token, long nowSec) {
        if (token == null) return false;
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        if (config == null || config.getGmailAppPassword() == null) return false;

        int sep = token.lastIndexOf('.');
        if (sep < 0) return false;
        String payloadB64 = token.substring(0, sep);
        String signature = token.substring(sep + 1);

        String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(payloadB64), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return false;
        }

        int colon = payload.indexOf(':');
        if (colon < 0) return false;
        String idPart = payload.substring(0, colon);
        String tsPart = payload.substring(colon + 1);
        if (!idPart.equals(String.valueOf(emailId))) return false;

        long createdAtSec;
        try {
            createdAtSec = Long.parseLong(tsPart);
        } catch (NumberFormatException e) {
            return false;
        }

        if (createdAtSec > nowSec) return false;
        if (nowSec - createdAtSec > TOKEN_TTL_SECONDS) return false;

        String expected = computeSignedToken(emailId, createdAtSec, config.getGmailAppPassword());
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] actualBytes = token.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expectedBytes, actualBytes);
    }

    public String generateUnsubscribeUrl(Long emailId, String webUrl) {
        String token = generateToken(emailId);
        String base = webUrl != null && !webUrl.isBlank() ? webUrl.replaceAll("/$", "") : "http://localhost:8080";
        return base + "/api/public/unsubscribe?id=" + emailId + "&token=" + token;
    }

    public String getUnsubscribePlaceholderUrl() {
        return UNSUBSCRIBE_PLACEHOLDER_URL;
    }

    public String getWebUrl() {
        return systemConfigRepository.findFirstByOrderByIdAsc()
                .map(SystemConfig::getWebUrl)
                .filter(u -> u != null && !u.isBlank())
                .map(u -> u.replaceAll("/$", ""))
                .orElse("http://localhost:8080");
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

            String html = buildAdminNotificationHtml(unsubscribedEmail, emailId, config.getWebUrl());
            if (html == null) {
                log.warn("Admin-Benachrichtigung nicht möglich: Template konnte nicht gerendert werden");
                return;
            }

            JavaMailSenderImpl mailSender = buildMailSender(config);

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setSubject("FFL | Abmeldung vom Verteiler: " + unsubscribedEmail);
            helper.setText(html, true);

            mailSender.send(msg);
            log.info("Admin-Benachrichtigung über Abmeldung von {} gesendet", unsubscribedEmail);
        } catch (Exception e) {
            log.error("Fehler beim Senden der Admin-Benachrichtigung über Abmeldung von {}", unsubscribedEmail, e);
        }
    }

    private String buildAdminNotificationHtml(String email, Long emailId, String webUrl) {
        try {
            Context context = new Context();
            context.setVariable("email", email);
            context.setVariable("emailId", String.valueOf(emailId));
            context.setVariable("webUrl", webUrl);
            return templateEngine.process("mail/admin-unsubscribe-notification", context);
        } catch (Exception e) {
            log.error("Fehler beim Rendern des Admin-Abmeldungs-Templates", e);
            return null;
        }
    }

    private String computeSignedToken(Long emailId, long createdAtSec, String secret) {
        String payload = emailId + ":" + createdAtSec;
        String payloadB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String signature = computeHmac(payload, secret);
        return payloadB64 + "." + signature;
    }

    private String computeHmac(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(keySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
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
}
