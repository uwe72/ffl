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

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PwaInstallTrackingService {

    private static final Logger log = LoggerFactory.getLogger(PwaInstallTrackingService.class);

    private static final int MAX_PER_HOUR = 5;
    private static final Duration WINDOW = Duration.ofHours(1);

    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;
    private final SpringTemplateEngine templateEngine;
    private final SmtpMailTransport smtpMailTransport;
    private final Map<String, Deque<Instant>> submitsByUser = new ConcurrentHashMap<>();

    public PwaInstallTrackingService(SystemConfigRepository systemConfigRepository,
                                     UserRepository userRepository,
                                     SpringTemplateEngine templateEngine,
                                     SmtpMailTransport smtpMailTransport) {
        this.systemConfigRepository = systemConfigRepository;
        this.userRepository = userRepository;
        this.templateEngine = templateEngine;
        this.smtpMailTransport = smtpMailTransport;
    }

    @Async
    public void track(String login, String clientIp, String userAgent) {
        String key = (login == null || login.isBlank()) ? "unknown" : login;
        if (!checkRateLimit(key)) {
            log.info("Install-Klick-Tracking fuer User {} uebersprungen (Rate-Limit)", key);
            return;
        }

        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        if (config == null) {
            log.warn("Keine Systemkonfiguration vorhanden, Install-Klick-Mail wird nicht gesendet");
            return;
        }
        if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
            log.warn("Gmail-Zugangsdaten nicht konfiguriert, Install-Klick-Mail wird nicht gesendet");
            return;
        }

        List<String> adminEmails = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .map(User::getEmail)
                .filter(e -> e != null && !e.isBlank())
                .toList();

        if (adminEmails.isEmpty()) {
            log.warn("Kein Admin-Empfaenger mit E-Mail-Adresse gefunden, Install-Klick-Mail wird nicht gesendet");
            return;
        }

        User user = (login == null || login.isBlank()) ? null
                : userRepository.findByLoginIgnoreCase(login).orElse(null);

        JavaMailSenderImpl mailSender = smtpMailTransport.buildSender(config);
        SmtpMailTransport.TransportState transportState = new SmtpMailTransport.TransportState();
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setBcc(adminEmails.toArray(new String[0]));
            helper.setSubject("[FFL] \u201eInstallieren\u201c-Button geklickt");
            helper.setText(buildHtml(user, login, clientIp, userAgent, config), true);

            boolean gesendet = smtpMailTransport.sendWithRetry(transportState, mailSender, msg,
                    config.getGmailSenderEmail(), String.join(", ", adminEmails), null);
            if (gesendet) {
                log.info("Install-Klick-Mail fuer User {} gesendet", key);
            }
        } catch (Exception e) {
            log.error("Install-Klick-Mail konnte nicht gesendet werden: {}", e.getMessage(), e);
        } finally {
            smtpMailTransport.closeQuietly(transportState.transport);
        }
    }

    private String buildHtml(User user, String login, String clientIp, String userAgent, SystemConfig config) {
        Context context = new Context(Locale.GERMAN);
        context.setVariable("userName", buildDisplayName(user, login));
        context.setVariable("login", login == null || login.isBlank() ? "-" : login);
        context.setVariable("clickedAt", DateTimeFormatter
                .ofPattern("dd.MM.yyyy HH:mm 'Uhr'")
                .withZone(ZoneId.of("Europe/Berlin"))
                .format(Instant.now()));
        context.setVariable("clientIp", clientIp == null || clientIp.isBlank() ? "-" : clientIp);
        context.setVariable("userAgent", userAgent == null || userAgent.isBlank() ? "-" : userAgent);
        context.setVariable("webUrl", normalizeWebUrl(config.getWebUrl()));
        return templateEngine.process("mail/pwa-install-click", context);
    }

    private String buildDisplayName(User user, String login) {
        if (user == null) {
            return login == null || login.isBlank() ? "Unbekannt" : login;
        }
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
            sb.append(user.getLogin());
        }
        return sb.toString();
    }

    private String normalizeWebUrl(String webUrl) {
        if (webUrl == null || webUrl.isBlank()) {
            return null;
        }
        return webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
    }

    private boolean checkRateLimit(String key) {
        Instant now = Instant.now();
        Instant cutoff = now.minus(WINDOW);
        boolean[] allowed = { false };
        submitsByUser.compute(key, (k, existing) -> {
            Deque<Instant> dq = existing != null ? existing : new ArrayDeque<>();
            while (!dq.isEmpty() && dq.peekFirst().isBefore(cutoff)) {
                dq.pollFirst();
            }
            if (dq.size() < MAX_PER_HOUR) {
                dq.addLast(now);
                allowed[0] = true;
            }
            return dq;
        });
        return allowed[0];
    }
}
