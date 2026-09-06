package de.ffl.service;

import de.ffl.domain.SystemConfig;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.repository.SystemConfigRepository;
import de.ffl.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentDownloadTrackingServiceTest {

    @Mock
    private SystemConfigRepository systemConfigRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SpringTemplateEngine templateEngine;
    @Mock
    private SmtpMailTransport smtpMailTransport;

    private DocumentDownloadTrackingService service() {
        return new DocumentDownloadTrackingService(systemConfigRepository, userRepository, templateEngine, smtpMailTransport);
    }

    private SystemConfig config() {
        return SystemConfig.builder()
                .id(1L)
                .gmailSenderEmail("sender@example.com")
                .gmailAppPassword("pw")
                .gmailSmtpServer("smtp.example.com")
                .gmailSmtpPort(587)
                .webUrl("https://ffl.app/")
                .build();
    }

    private User admin() {
        return User.builder()
                .id(1L)
                .login("admin")
                .email("admin@example.com")
                .role(UserRole.ADMIN)
                .build();
    }

    private User user() {
        return User.builder()
                .id(2L)
                .login("mmuster")
                .firstName("Max")
                .lastName("Muster")
                .email("user@example.com")
                .role(UserRole.NORMAL)
                .build();
    }

    @Test
    void sendsAdminMailOnDownload() throws Exception {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(userRepository.findAll()).thenReturn(List.of(admin()));
        when(smtpMailTransport.buildSender(any())).thenReturn(new JavaMailSenderImpl());
        when(templateEngine.process(eq("mail/document-download"), any(Context.class))).thenReturn("<html>mail</html>");

        service().track(user(), "mmuster", "spielplan.pdf", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine).process(eq("mail/document-download"), any(Context.class));
        verify(smtpMailTransport).sendWithRetry(any(), any(), any(), any(), any(), any());
    }

    @Test
    void sendsAdminMailForAnonymousDownload() throws Exception {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(userRepository.findAll()).thenReturn(List.of(admin()));
        when(smtpMailTransport.buildSender(any())).thenReturn(new JavaMailSenderImpl());
        when(templateEngine.process(eq("mail/document-download"), any(Context.class))).thenReturn("<html>mail</html>");

        service().track(null, null, "spielplan.pdf", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine).process(eq("mail/document-download"), any(Context.class));
        verify(smtpMailTransport).sendWithRetry(any(), any(), any(), any(), any(), any());
    }

    @Test
    void skipsWithoutConfig() {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());

        service().track(user(), "mmuster", "spielplan.pdf", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine, never()).process(anyString(), any(Context.class));
    }

    @Test
    void skipsWithoutGmailCredentials() {
        SystemConfig cfg = config();
        cfg.setGmailAppPassword(null);
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(cfg));

        service().track(user(), "mmuster", "spielplan.pdf", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine, never()).process(anyString(), any(Context.class));
    }

    @Test
    void skipsWithoutAdminEmails() {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(userRepository.findAll()).thenReturn(List.of());

        service().track(user(), "mmuster", "spielplan.pdf", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine, never()).process(anyString(), any(Context.class));
    }

    @Test
    void anonymousDownloadRendersAnonymUserName() {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(userRepository.findAll()).thenReturn(List.of(admin()));
        when(smtpMailTransport.buildSender(any())).thenReturn(new JavaMailSenderImpl());
        when(templateEngine.process(eq("mail/document-download"), any(Context.class))).thenAnswer(invocation -> {
            Context ctx = invocation.getArgument(1);
            org.assertj.core.api.Assertions.assertThat(ctx.getVariable("userName")).isEqualTo("Anonym");
            org.assertj.core.api.Assertions.assertThat(ctx.getVariable("login")).isEqualTo("-");
            org.assertj.core.api.Assertions.assertThat(ctx.getVariable("documentName")).isEqualTo("spielplan.pdf");
            return "<html>mail</html>";
        });

        service().track(null, null, "spielplan.pdf", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine).process(eq("mail/document-download"), any(Context.class));
    }

    @Test
    void namedDownloadResolvesDisplayName() {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(userRepository.findAll()).thenReturn(List.of(admin()));
        when(userRepository.findByLoginIgnoreCase("mmuster")).thenReturn(Optional.of(user()));
        when(smtpMailTransport.buildSender(any())).thenReturn(new JavaMailSenderImpl());
        when(templateEngine.process(eq("mail/document-download"), any(Context.class))).thenAnswer(invocation -> {
            Context ctx = invocation.getArgument(1);
            org.assertj.core.api.Assertions.assertThat(ctx.getVariable("userName")).isEqualTo("Max Muster");
            org.assertj.core.api.Assertions.assertThat(ctx.getVariable("login")).isEqualTo("mmuster");
            return "<html>mail</html>";
        });

        service().track(null, "mmuster", "spielplan.pdf", "1.2.3.4", "Mozilla/5.0");

        verify(userRepository).findByLoginIgnoreCase("mmuster");
        verify(templateEngine).process(eq("mail/document-download"), any(Context.class));
    }
}
