package de.ffl.service;

import de.ffl.domain.Survey;
import de.ffl.domain.SystemConfig;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.SurveyResponseDetailDto;
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

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Properties;

@Service
public class SurveyNotificationService {

    private static final Logger log = LoggerFactory.getLogger(SurveyNotificationService.class);

    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;
    private final SpringTemplateEngine templateEngine;

    public SurveyNotificationService(SystemConfigRepository systemConfigRepository,
                                     UserRepository userRepository,
                                     SpringTemplateEngine templateEngine) {
        this.systemConfigRepository = systemConfigRepository;
        this.userRepository = userRepository;
        this.templateEngine = templateEngine;
    }

    @Async
    public void notifyAdmin(Survey survey, SurveyResponseDetailDto detail) {
        try {
            SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
            if (config == null || config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
                log.warn("[Survey] Keine Gmail-Konfiguration, Admin-Mail nicht versendet (survey={})", survey.getId());
                return;
            }

            List<String> adminEmails = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .map(User::getEmail)
                .filter(e -> e != null && !e.isBlank())
                .toList();
            if (adminEmails.isEmpty()) {
                log.warn("[Survey] Kein Admin-Empfänger gefunden, Admin-Mail nicht versendet (survey={})", survey.getId());
                return;
            }

            JavaMailSenderImpl mailSender = buildMailSender(config);
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(config.getGmailSenderEmail());
            helper.setTo(config.getGmailSenderEmail());
            helper.setBcc(adminEmails.toArray(new String[0]));
            helper.setSubject("[FFL-Umfrage] Neue Antwort: " + survey.getTitle());
            helper.setText(buildHtmlBody(survey, detail, config), true);
            mailSender.send(msg);
            log.info("[Survey] Admin-Mail zu Antwort (survey={}) versendet", survey.getId());
        } catch (Exception e) {
            log.warn("[Survey] Admin-Mail fehlgeschlagen (survey={}): {}", survey.getId(), e.getMessage());
        }
    }

    private String buildHtmlBody(Survey survey, SurveyResponseDetailDto detail, SystemConfig config) {
        Context context = new Context(Locale.GERMAN);
        context.setVariable("surveyTitle", survey.getTitle());
        context.setVariable("submittedAt", DateTimeFormatter
            .ofPattern("dd.MM.yyyy HH:mm")
            .withZone(ZoneId.of("Europe/Berlin"))
            .format(detail.getSubmittedAt()));
        context.setVariable("answers", detail.getAnswers());
        context.setVariable("webUrl", normalizeWebUrl(config.getWebUrl()));
        return templateEngine.process("mail/survey-answer", context);
    }

    private String normalizeWebUrl(String webUrl) {
        if (webUrl == null || webUrl.isBlank()) {
            return null;
        }
        return webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
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
}
