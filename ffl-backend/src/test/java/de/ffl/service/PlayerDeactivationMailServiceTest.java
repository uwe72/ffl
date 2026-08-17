package de.ffl.service;

import de.ffl.domain.SeasonState;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.SystemConfigRepository;
import de.ffl.service.PlayerDeactivationMailService.ManagerNotificationDto;
import de.ffl.service.PlayerDeactivationMailService.PlayerRowDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlayerDeactivationMailServiceTest {

    @Mock
    private SystemConfigRepository systemConfigRepository;
    @Mock
    private SpringTemplateEngine templateEngine;

    private PlayerDeactivationMailService service() {
        return new PlayerDeactivationMailService(systemConfigRepository, templateEngine);
    }

    private SystemConfig config() {
        return SystemConfig.builder()
                .id(1L)
                .gmailSenderEmail("admin@example.com")
                .gmailAppPassword("pw")
                .gmailSmtpServer("smtp.example.com")
                .gmailSmtpPort(587)
                .webUrl("https://ffl.app/")
                .build();
    }

    private ManagerNotificationDto notification() {
        return new ManagerNotificationDto("manager@example.com", "Max Mustermann",
                List.of(new PlayerRowDto("ST", "#be123c", "#fce7f3", "Keita Baldé", "SV Musterverein")));
    }

    @Test
    void sendsRegardlessOfEnvironment() {
        lenient().when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config()));
        when(templateEngine.process(eq("mail/player-deactivation"), any(Context.class)))
                .thenReturn("<html>mail</html>");

        service().sendDeactivationNotifications(
                List.of(notification()), "2026/27", SeasonState.BEFORE_SEASON);

        verify(templateEngine).process(eq("mail/player-deactivation"), any(Context.class));
    }

    @Test
    void doesNotSendInRueckrunde() {
        service().sendDeactivationNotifications(
                List.of(notification()), "2026/27", SeasonState.RUNNING_RUECKRUNDE);

        verify(systemConfigRepository, never()).findFirstByOrderByIdAsc();
    }

    @Test
    void doesNotSendWhenNoNotifications() {
        service().sendDeactivationNotifications(
                List.of(), "2026/27", SeasonState.BEFORE_SEASON);

        verify(systemConfigRepository, never()).findFirstByOrderByIdAsc();
    }

    @Test
    void doesNotSendWhenConfigMissing() {
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());

        service().sendDeactivationNotifications(
                List.of(notification()), "2026/27", SeasonState.RUNNING_HINRUNDE);

        verify(templateEngine, never()).process(eq("mail/player-deactivation"), any(Context.class));
    }

    @Test
    void buildHtml_beforeSeason_passesVariablesAndBeforeSeasonHint() {
        when(templateEngine.process(eq("mail/player-deactivation"), any(Context.class)))
                .thenAnswer(invocation -> {
                    Context ctx = invocation.getArgument(1);
                    return "greeting=" + ctx.getVariable("greeting")
                            + "|season=" + ctx.getVariable("seasonName")
                            + "|players=" + ((List<?>) ctx.getVariable("players")).size()
                            + "|beforeSeason=" + ctx.getVariable("beforeSeason")
                            + "|web=" + ctx.getVariable("webUrl");
                });

        String html = service().buildHtml(notification(), "2026/27", true, "https://ffl.app");

        assertThat(html).contains("greeting=Max Mustermann");
        assertThat(html).contains("season=2026/27");
        assertThat(html).contains("players=1");
        assertThat(html).contains("beforeSeason=true");
        assertThat(html).contains("web=https://ffl.app");
    }

    @Test
    void buildHtml_hinrunde_passesBeforeSeasonFalse() {
        when(templateEngine.process(eq("mail/player-deactivation"), any(Context.class)))
                .thenAnswer(invocation -> {
                    Context ctx = invocation.getArgument(1);
                    return "beforeSeason=" + ctx.getVariable("beforeSeason");
                });

        String html = service().buildHtml(notification(), "2026/27", false, "https://ffl.app");

        assertThat(html).contains("beforeSeason=false");
    }
}
