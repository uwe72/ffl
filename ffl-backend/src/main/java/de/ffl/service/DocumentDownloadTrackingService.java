package de.ffl.service;

import de.ffl.domain.SystemConfig;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.repository.SystemConfigRepository;
import de.ffl.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
public class DocumentDownloadTrackingService {

    private static final Logger log = LoggerFactory.getLogger(DocumentDownloadTrackingService.class);

    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;
    private final SpringTemplateEngine templateEngine;
    private final SmtpMailTransport smtpMailTransport;

    public DocumentDownloadTrackingService(SystemConfigRepository systemConfigRepository,
                                           UserRepository userRepository,
                                           SpringTemplateEngine templateEngine,
                                           SmtpMailTransport smtpMailTransport) {
        this.systemConfigRepository = systemConfigRepository;
        this.userRepository = userRepository;
        this.templateEngine = templateEngine;
        this.smtpMailTransport = smtpMailTransport;
    }

    @Async
    public void track(User user, String login, String documentName, String clientIp, String userAgent) {
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        if (config == null) {
            log.warn("Keine Systemkonfiguration vorhanden, Download-Mail wird nicht gesendet");
            return;
        }
        if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
            log.warn("Gmail-Zugangsdaten nicht konfiguriert, Download-Mail wird nicht gesendet");
            return;
        }

        List<String> adminEmails = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .map(User::getEmail)
                .filter(e -> e != null && !e.isBlank())
                .toList();

        if (adminEmails.isEmpty()) {
            log.warn("Kein Admin-Empfaenger mit E-Mail-Adresse gefunden, Download-Mail wird nicht gesendet");
            return;
        }

        User resolvedUser = user;
        if (resolvedUser == null && login != null && !login.isBlank()) {
            resolvedUser = userRepository.findByLoginIgnoreCase(login).orElse(null);
        }

        JavaMailSenderImpl mailSender = smtpMailTransport.buildSender(config);
        SmtpMailTransport.TransportState transportState = new SmtpMailTransport.TransportState();
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setBcc(adminEmails.toArray(new String[0]));
            helper.setSubject("[FFL] Dokument heruntergeladen");
            helper.setText(buildHtml(resolvedUser, login, documentName, clientIp, userAgent, config), true);

            boolean gesendet = smtpMailTransport.sendWithRetry(transportState, mailSender, msg,
                    config.getGmailSenderEmail(), String.join(", ", adminEmails), null);
            if (gesendet) {
                log.info("Download-Mail fuer Dokument {} gesendet", documentName);
            }
        } catch (Exception e) {
            log.error("Download-Mail konnte nicht gesendet werden: {}", e.getMessage(), e);
        } finally {
            smtpMailTransport.closeQuietly(transportState.transport);
        }
    }

    private String buildHtml(User user, String login, String documentName, String clientIp,
                             String userAgent, SystemConfig config) {
        Context context = new Context(Locale.GERMAN);
        context.setVariable("documentName", documentName == null || documentName.isBlank() ? "-" : documentName);
        context.setVariable("userName", user != null ? buildDisplayName(user, login)
                : (login == null || login.isBlank() ? "Anonym" : login));
        context.setVariable("login", login == null || login.isBlank() ? "-" : login);
        context.setVariable("downloadedAt", DateTimeFormatter
                .ofPattern("dd.MM.yyyy HH:mm 'Uhr'")
                .withZone(ZoneId.of("Europe/Berlin"))
                .format(Instant.now()));
        context.setVariable("clientIp", clientIp == null || clientIp.isBlank() ? "-" : clientIp);
        context.setVariable("userAgent", userAgent == null || userAgent.isBlank() ? "-" : userAgent);
        context.setVariable("webUrl", normalizeWebUrl(config.getWebUrl()));
        return templateEngine.process("mail/document-download", context);
    }

    private String buildDisplayName(User user, String login) {
        StringBuilder sb = new StringBuilder();
        if (user.getFirstName() != null && !user.getFirstName().isBlank()) {
            sb.append(user.getFirstName());
        }
        if (user.getLastName() != null && !user.getLastName().isBlank()) {
            if (sb.length() > 0) {
                sb.append(" ");
            }
            sb.append(user.getLastName());
        }
        if (sb.length() == 0) {
            sb.append(user.getLogin() != null ? user.getLogin()
                    : (login == null || login.isBlank() ? "Anonym" : login));
        }
        return sb.toString();
    }

    private String normalizeWebUrl(String webUrl) {
        if (webUrl == null || webUrl.isBlank()) {
            return null;
        }
        return webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
    }
}
