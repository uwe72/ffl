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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PwaInstallTrackingServiceTest {

    @Mock
    private SystemConfigRepository systemConfigRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SpringTemplateEngine templateEngine;
    @Mock
    private SmtpMailTransport smtpMailTransport;

    private PwaInstallTrackingService service() {
        return new PwaInstallTrackingService(systemConfigRepository, userRepository, templateEngine, smtpMailTransport);
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

    @Test
    void sendsAdminMailOnInstallClick() throws Exception {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(userRepository.findAll()).thenReturn(List.of(admin()));
        when(userRepository.findByLoginIgnoreCase("mmuster")).thenReturn(Optional.empty());
        when(smtpMailTransport.buildSender(any())).thenReturn(new JavaMailSenderImpl());
        when(templateEngine.process(eq("mail/pwa-install-click"), any(Context.class))).thenReturn("<html>mail</html>");

        service().track("mmuster", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine).process(eq("mail/pwa-install-click"), any(Context.class));
        verify(smtpMailTransport).sendWithRetry(any(), any(), any(), any(), any(), any());
    }

    @Test
    void skipsWithoutConfig() {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());

        service().track("mmuster", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine, never()).process(anyString(), any(Context.class));
    }

    @Test
    void skipsWithoutGmailCredentials() {
        SystemConfig cfg = config();
        cfg.setGmailAppPassword(null);
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(cfg));

        service().track("mmuster", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine, never()).process(anyString(), any(Context.class));
    }

    @Test
    void skipsWithoutAdminEmails() {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(userRepository.findAll()).thenReturn(List.of());

        service().track("mmuster", "1.2.3.4", "Mozilla/5.0");

        verify(templateEngine, never()).process(anyString(), any(Context.class));
    }

    @Test
    void rateLimitsPerUser() {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(userRepository.findAll()).thenReturn(List.of(admin()));
        when(userRepository.findByLoginIgnoreCase("mmuster")).thenReturn(Optional.empty());
        when(smtpMailTransport.buildSender(any())).thenReturn(new JavaMailSenderImpl());
        when(templateEngine.process(eq("mail/pwa-install-click"), any(Context.class))).thenReturn("<html>mail</html>");

        PwaInstallTrackingService svc = service();
        for (int i = 0; i < 6; i++) {
            svc.track("mmuster", "1.2.3.4", "Mozilla/5.0");
        }

        verify(templateEngine, times(5)).process(eq("mail/pwa-install-click"), any(Context.class));
    }
}
