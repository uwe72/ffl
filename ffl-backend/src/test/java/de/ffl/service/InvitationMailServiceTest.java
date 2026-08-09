package de.ffl.service;

import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.EmailAddressRepository;
import de.ffl.repository.SeasonRepository;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvitationMailServiceTest {

    @Mock
    private SystemConfigRepository systemConfigRepository;
    @Mock
    private SeasonRepository seasonRepository;
    @Mock
    private EmailAddressRepository emailAddressRepository;
    @Mock
    private UnsubscribeService unsubscribeService;
    @Mock
    private SpringTemplateEngine templateEngine;

    private InvitationMailService service() {
        return new InvitationMailService(systemConfigRepository, seasonRepository,
            emailAddressRepository, unsubscribeService, templateEngine);
    }

    private SystemConfig config() {
        return SystemConfig.builder()
            .id(1L)
            .gmailSenderEmail("admin@example.com")
            .gmailAppPassword("secret")
            .gmailSmtpServer("smtp.example.com")
            .gmailSmtpPort(587)
            .webUrl("https://ffl.example.com")
            .build();
    }

    private Season season() {
        return Season.builder()
            .id(1L)
            .name("2025/26")
            .build();
    }

    @Test
    void generatePreviewHtml_containsUnsubscribeFooterPlaceholder() {
        Season season = season();
        when(seasonRepository.findById(1L)).thenReturn(Optional.of(season));
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(unsubscribeService.getUnsubscribePlaceholderUrl()).thenReturn("{ABMELDE-LINK}");
        when(templateEngine.process(eq("mail/invitation"), any(Context.class)))
            .thenReturn("<html><body><h1>Einladung</h1></body></html>");

        String html = service().generatePreviewHtml(1L);

        assertThat(html).contains("{ABMELDE-LINK}");
        assertThat(html).contains("hier austragen");
        assertThat(html).contains("</body>");
    }

    @Test
    void generatePreviewHtml_worksWhenConfigMissing() {
        Season season = season();
        when(seasonRepository.findById(1L)).thenReturn(Optional.of(season));
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());
        when(unsubscribeService.getUnsubscribePlaceholderUrl()).thenReturn("{ABMELDE-LINK}");
        when(templateEngine.process(eq("mail/invitation"), any(Context.class)))
            .thenReturn("<html><body><h1>Einladung</h1></body></html>");

        String html = service().generatePreviewHtml(1L);

        assertThat(html).contains("{ABMELDE-LINK}");
    }
}
