package de.ffl.service;

import de.ffl.domain.SystemConfig;
import jakarta.mail.MessagingException;
import jakarta.mail.Transport;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Properties;

/**
 * Zentrale SMTP-Versandlogik für alle Mailtypen.
 * <p>
 * Phase A: Eine einzelne SMTP-Verbindung wird über viele Mails wiederverwendet
 * (Reconnect nach {@link #MAX_MAILS_PER_CONNECTION} Mails oder wenn die Verbindung getrennt ist).
 * <p>
 * Phase B: {@link #sendWithRetry} versucht den Versand mit Backoff mehrfach,
 * bevor eine Mail endgültig als fehlgeschlagen gilt.
 */
@Component
public class SmtpMailTransport {

    private static final Logger log = LoggerFactory.getLogger(SmtpMailTransport.class);

    public static final int MAX_MAILS_PER_CONNECTION = 40;
    public static final int MAX_ATTEMPTS = 3;

    long[] retryBackoffMs = { 10_000L, 30_000L, 60_000L };

    public JavaMailSenderImpl buildSender(SystemConfig config) {
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

    public static final class TransportState {
        Transport transport;
        int mailsOnConnection;
    }

    public Transport connect(JavaMailSenderImpl mailSender) throws MessagingException {
        Transport transport = mailSender.getSession().getTransport("smtp");
        transport.connect(mailSender.getHost(), mailSender.getPort(),
                mailSender.getUsername(), mailSender.getPassword());
        return transport;
    }

    public void closeQuietly(Transport transport) {
        if (transport != null) {
            try {
                transport.close();
            } catch (MessagingException ignored) {
            }
        }
    }

    public boolean sendWithRetry(TransportState state, JavaMailSenderImpl mailSender,
                                 MimeMessage msg, String label, String recipient,
                                 SseEmitter emitter) throws InterruptedException {
        int attempt = 0;
        while (true) {
            attempt++;
            try {
                if (state.transport == null || !state.transport.isConnected()
                        || state.mailsOnConnection >= MAX_MAILS_PER_CONNECTION) {
                    closeQuietly(state.transport);
                    state.transport = connect(mailSender);
                    state.mailsOnConnection = 0;
                    send(emitter, "Neue SMTP-Verbindung ...");
                }
                msg.saveChanges();
                state.transport.sendMessage(msg, msg.getAllRecipients());
                state.mailsOnConnection++;
                return true;
            } catch (MessagingException e) {
                log.error("SMTP-Fehler bei Mail an {} ({}): {}", recipient, label, e.getMessage(), e);
                closeQuietly(state.transport);
                state.transport = null;
                if (attempt >= MAX_ATTEMPTS) {
                    send(emitter, "✗ " + label + " (" + recipient + "): " + describeMailError(e));
                    return false;
                }
                long backoff = retryBackoffMs[attempt - 1];
                send(emitter, "⏳ Retry " + attempt + "/" + MAX_ATTEMPTS + " in "
                        + (backoff / 1000) + "s (" + describeMailError(e) + ")");
                Thread.sleep(backoff);
            }
        }
    }

    public String describeMailError(Throwable e) {
        StringBuilder sb = new StringBuilder();
        Throwable cur = e;
        while (cur != null) {
            String msg = cur.getMessage();
            if (msg != null && !msg.isBlank()) {
                if (sb.length() > 0) {
                    sb.append(" -> ");
                }
                sb.append(msg);
            }
            cur = cur.getCause();
        }
        return sb.length() > 0 ? sb.toString() : e.getClass().getSimpleName();
    }

    public void send(SseEmitter emitter, String message) {
        if (emitter == null) {
            return;
        }
        try {
            emitter.send(SseEmitter.event().data(message));
        } catch (Exception e) {
            log.warn("SSE send failed: {}", e.getMessage());
        }
    }
}
