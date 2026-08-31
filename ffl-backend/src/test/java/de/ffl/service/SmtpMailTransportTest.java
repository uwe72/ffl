package de.ffl.service;

import de.ffl.domain.SystemConfig;
import jakarta.mail.Address;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmtpMailTransportTest {

    private final SmtpMailTransport transport = new SmtpMailTransport();

    private SmtpMailTransport fastTransport() {
        SmtpMailTransport t = new SmtpMailTransport();
        t.retryBackoffMs = new long[] { 1L, 1L, 1L };
        return t;
    }

    @Test
    void buildSender_configuresHostPortCredentialsAndTimeouts() {
        SystemConfig config = SystemConfig.builder()
            .gmailSmtpServer("smtp.example.com")
            .gmailSmtpPort(587)
            .gmailSenderEmail("sender@example.com")
            .gmailAppPassword("secret")
            .build();

        JavaMailSenderImpl sender = transport.buildSender(config);

        assertThat(sender.getHost()).isEqualTo("smtp.example.com");
        assertThat(sender.getPort()).isEqualTo(587);
        assertThat(sender.getUsername()).isEqualTo("sender@example.com");
        assertThat(sender.getPassword()).isEqualTo("secret");
        assertThat(sender.getJavaMailProperties().getProperty("mail.smtp.auth")).isEqualTo("true");
        assertThat(sender.getJavaMailProperties().getProperty("mail.smtp.starttls.enable")).isEqualTo("true");
        assertThat(sender.getJavaMailProperties().getProperty("mail.smtp.starttls.required")).isEqualTo("true");
        assertThat(sender.getJavaMailProperties().getProperty("mail.smtp.timeout")).isEqualTo("120000");
    }

    @Test
    void buildSender_appliesDefaultsWhenConfigFieldsMissing() {
        SystemConfig config = SystemConfig.builder().build();

        JavaMailSenderImpl sender = transport.buildSender(config);

        assertThat(sender.getHost()).isEqualTo("smtp.gmail.com");
        assertThat(sender.getPort()).isEqualTo(587);
    }

    @Test
    void describeMailError_walksCauseChain() {
        MessagingException root = new MessagingException("root problem");
        MessagingException wrapped = new MessagingException("outer failed", root);

        String result = transport.describeMailError(wrapped);

        assertThat(result).contains("outer failed").contains("root problem");
    }

    @Test
    void describeMailError_fallsBackToClassNameWhenNoMessage() {
        MessagingException ex = new MessagingException("");

        assertThat(transport.describeMailError(ex)).isEqualTo("MessagingException");
    }

    @Test
    void sendWithRetry_succeedsOnFirstAttemptAndReusesConnection() throws Exception {
        Transport smtp = mock(Transport.class);
        JavaMailSenderImpl sender = mock(JavaMailSenderImpl.class);
        MimeMessage msg = mock(MimeMessage.class);
        when(smtp.isConnected()).thenReturn(true);
        when(msg.getAllRecipients()).thenReturn(new Address[0]);

        SmtpMailTransport.TransportState state = new SmtpMailTransport.TransportState();
        state.transport = smtp;

        boolean result = transport.sendWithRetry(state, sender, msg, "label", "a@b.de", null);

        assertThat(result).isTrue();
        assertThat(state.mailsOnConnection).isEqualTo(1);
        verify(smtp).sendMessage(msg, new Address[0]);
    }

    @Test
    void sendWithRetry_retriesThenSucceeds() throws Exception {
        Transport smtp = mock(Transport.class);
        Session session = mock(Session.class);
        JavaMailSenderImpl sender = mock(JavaMailSenderImpl.class);
        MimeMessage msg = mock(MimeMessage.class);
        when(smtp.isConnected()).thenReturn(true);
        when(sender.getSession()).thenReturn(session);
        when(session.getTransport("smtp")).thenReturn(smtp);
        when(msg.getAllRecipients()).thenReturn(new Address[0]);
        doThrow(new MessagingException("boom 1"))
            .doThrow(new MessagingException("boom 2"))
            .doNothing()
            .when(smtp).sendMessage(msg, new Address[0]);

        SmtpMailTransport.TransportState state = new SmtpMailTransport.TransportState();
        state.transport = smtp;

        boolean result = fastTransport().sendWithRetry(state, sender, msg, "label", "a@b.de", null);

        assertThat(result).isTrue();
        assertThat(state.mailsOnConnection).isEqualTo(1);
    }

    @Test
    void sendWithRetry_givesUpAfterMaxAttempts() throws Exception {
        Transport smtp = mock(Transport.class);
        Session session = mock(Session.class);
        JavaMailSenderImpl sender = mock(JavaMailSenderImpl.class);
        MimeMessage msg = mock(MimeMessage.class);
        when(smtp.isConnected()).thenReturn(true);
        when(sender.getSession()).thenReturn(session);
        when(session.getTransport("smtp")).thenReturn(smtp);
        when(msg.getAllRecipients()).thenReturn(new Address[0]);
        doThrow(new MessagingException("persistent failure"))
            .when(smtp).sendMessage(msg, new Address[0]);

        SmtpMailTransport.TransportState state = new SmtpMailTransport.TransportState();
        state.transport = smtp;

        boolean result = fastTransport().sendWithRetry(state, sender, msg, "label", "a@b.de", null);

        assertThat(result).isFalse();
        assertThat(state.transport).isNull();
    }
}
