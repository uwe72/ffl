package de.ffl.service;

import de.ffl.domain.EmailAddress;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.EmailAddressRepository;
import de.ffl.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UnsubscribeServiceTest {

    @Mock
    private EmailAddressRepository emailAddressRepository;
    @Mock
    private SystemConfigRepository systemConfigRepository;
    @Mock
    private SpringTemplateEngine templateEngine;

    private UnsubscribeService service() {
        return new UnsubscribeService(emailAddressRepository, systemConfigRepository, templateEngine);
    }

    private SystemConfig config(String appPassword) {
        return SystemConfig.builder()
            .id(1L)
            .gmailAppPassword(appPassword)
            .gmailSenderEmail("admin@example.com")
            .gmailSmtpServer("smtp.example.com")
            .gmailSmtpPort(587)
            .webUrl("https://ffl.example.com")
            .build();
    }

    @Test
    void token_valid_roundTrip() {
        when(systemConfigRepository.findFirstByOrderByIdAsc())
            .thenReturn(Optional.of(config("secret")));

        UnsubscribeService svc = service();
        String token = svc.generateToken(42L);

        assertThat(svc.validateToken(42L, token)).isTrue();
    }

    @Test
    void token_expired_isInvalid() {
        when(systemConfigRepository.findFirstByOrderByIdAsc())
            .thenReturn(Optional.of(config("secret")));

        UnsubscribeService svc = service();
        long expiredTimestamp = System.currentTimeMillis() / 1000L - (31L * 24 * 60 * 60);
        String token = svc.generateToken(42L, expiredTimestamp);

        assertThat(svc.validateToken(42L, token)).isFalse();
    }

    @Test
    void token_futureTimestamp_isInvalid() {
        when(systemConfigRepository.findFirstByOrderByIdAsc())
            .thenReturn(Optional.of(config("secret")));

        UnsubscribeService svc = service();
        long futureTimestamp = System.currentTimeMillis() / 1000L + 3600L;
        String token = svc.generateToken(42L, futureTimestamp);

        long now = System.currentTimeMillis() / 1000L;
        assertThat(svc.validateToken(42L, token, now)).isFalse();
    }

    @Test
    void token_tamperedSignature_isInvalid() {
        when(systemConfigRepository.findFirstByOrderByIdAsc())
            .thenReturn(Optional.of(config("secret")));

        UnsubscribeService svc = service();
        String token = svc.generateToken(42L);

        char last = token.charAt(token.length() - 1);
        char replacement = (last == 'A') ? 'B' : 'A';
        String tampered = token.substring(0, token.length() - 1) + replacement;

        assertThat(svc.validateToken(42L, tampered)).isFalse();
    }

    @Test
    void token_wrongId_isInvalid() {
        when(systemConfigRepository.findFirstByOrderByIdAsc())
            .thenReturn(Optional.of(config("secret")));

        UnsubscribeService svc = service();
        String token = svc.generateToken(42L);

        assertThat(svc.validateToken(99L, token)).isFalse();
    }

    @Test
    void token_null_isInvalid() {
        assertThat(service().validateToken(42L, null)).isFalse();
    }

    @Test
    void token_malformed_isInvalid() {
        when(systemConfigRepository.findFirstByOrderByIdAsc())
            .thenReturn(Optional.of(config("secret")));

        assertThat(service().validateToken(42L, "not-a-valid-token")).isFalse();
    }

    @Test
    void generateUnsubscribeUrl_containsPlainAmpersand() {
        when(systemConfigRepository.findFirstByOrderByIdAsc())
            .thenReturn(Optional.of(config("secret")));

        String url = service().generateUnsubscribeUrl(5L, "https://ffl.example.com");

        assertThat(url).contains("&token=");
        assertThat(url).doesNotContain("&amp;");
        assertThat(url).startsWith("https://ffl.example.com/api/public/unsubscribe?id=5&token=");
    }

    @Test
    void unsubscribePlaceholderUrl_isStaticConstant() {
        assertThat(service().getUnsubscribePlaceholderUrl()).isEqualTo("{ABMELDE-LINK}");
    }

    @Test
    void unsubscribe_deletesAddressAndRendersAdminNotification() {
        SystemConfig config = config("secret");
        when(systemConfigRepository.findFirstByOrderByIdAsc())
            .thenReturn(Optional.of(config));
        EmailAddress addr = EmailAddress.builder().id(7L).email("user@example.com").build();
        when(emailAddressRepository.findById(7L)).thenReturn(Optional.of(addr));
        when(templateEngine.process(eq("mail/admin-unsubscribe-notification"), any(Context.class)))
            .thenReturn("<html>admin-notif</html>");

        service().unsubscribe(7L);

        verify(emailAddressRepository).delete(addr);
        verify(templateEngine).process(eq("mail/admin-unsubscribe-notification"), any(Context.class));
    }

    @Test
    void unsubscribe_unknownId_doesNothing() {
        when(emailAddressRepository.findById(99L)).thenReturn(Optional.empty());

        service().unsubscribe(99L);

        verify(emailAddressRepository, never()).delete(any());
        verify(templateEngine, never()).process(anyString(), any(Context.class));
    }
}
