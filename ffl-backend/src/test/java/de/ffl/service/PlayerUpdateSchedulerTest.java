package de.ffl.service;

import de.ffl.config.EnvironmentProvider;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.migration.NewSeasonSetupService;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import de.ffl.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlayerUpdateSchedulerTest {

    @Mock
    private SystemConfigRepository configRepository;
    @Mock
    private SeasonRepository seasonRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NewSeasonSetupService setupService;
    @Mock
    private SpringTemplateEngine templateEngine;

    private PlayerUpdateScheduler scheduler;

    private PlayerUpdateScheduler scheduler() {
        EnvironmentProvider environmentProvider = new EnvironmentProvider("test");
        return new PlayerUpdateScheduler(configRepository, seasonRepository, userRepository, setupService, templateEngine, environmentProvider);
    }

    private SystemConfig configEnabled(String cron, LocalDateTime lastRun) {
        return SystemConfig.builder()
                .id(1L)
                .autoUpdateEnabled(true)
                .autoUpdateCron(cron)
                .autoUpdateSourceUrl("https://example.test/db.json")
                .autoUpdateLastRun(lastRun)
                .gmailSenderEmail("admin@example.com")
                .gmailAppPassword("pw")
                .gmailSmtpServer("smtp.example.com")
                .gmailSmtpPort(587)
                .build();
    }

    @Test
    void tick_disabled_doesNothing() {
        SystemConfig config = SystemConfig.builder().autoUpdateEnabled(false).build();
        when(configRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));

        scheduler().tick();

        verify(setupService, never()).updatePlayers(anyString(), any());
    }

    @Test
    void tick_noCron_doesNothing() {
        SystemConfig config = configEnabled(null, null);
        when(configRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));

        scheduler().tick();

        verify(setupService, never()).updatePlayers(anyString(), any());
    }

    @Test
    void tick_cronDoesNotMatch_doesNothing() {
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        int wrongMinute = (now.getMinute() + 1) % 60;
        SystemConfig config = configEnabled("0 " + wrongMinute + " * * * *", null);
        when(configRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));

        scheduler().tick();

        verify(setupService, never()).updatePlayers(anyString(), any());
    }

    @Test
    void tick_sameMinuteAsLastRun_doesNothing() {
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        SystemConfig config = configEnabled("0 " + now.getMinute() + " * * * *", now);
        when(configRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));

        scheduler().tick();

        verify(setupService, never()).updatePlayers(anyString(), any());
    }

    private String cronMatchingMinute(LocalDateTime t) {
        return "0 " + t.getMinute() + " " + t.getHour() + " " + t.getDayOfMonth() + " " + t.getMonthValue() + " *";
    }

    @Test
    void tick_cronMatchesAndNoLastRun_executesAndSavesLastRun() {
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        SystemConfig config = configEnabled(cronMatchingMinute(now), null);
        when(configRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));
        when(setupService.updatePlayers(anyString(), any()))
                .thenReturn(new NewSeasonSetupService.UpdateResult(2, 1, 0));
        when(seasonRepository.findAll()).thenReturn(List.of(Season.builder().name("2026/27").build()));
        when(templateEngine.process(eq("mail/player-update"), any(Context.class)))
                .thenReturn("<html>rendered</html>");
        when(userRepository.findAll()).thenReturn(List.of());

        scheduler().tick();

        verify(setupService, times(1)).updatePlayers(anyString(), any());
        ArgumentCaptor<SystemConfig> captor = ArgumentCaptor.forClass(SystemConfig.class);
        verify(configRepository).save(captor.capture());
        assertThat(captor.getValue().getAutoUpdateLastRun()).isNotNull();
    }

    @Test
    void tick_updateThrows_stillSavesLastRun() {
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        SystemConfig config = configEnabled(cronMatchingMinute(now), null);
        when(configRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));
        when(setupService.updatePlayers(anyString(), any()))
                .thenThrow(new RuntimeException("kicker down"));
        when(seasonRepository.findAll()).thenReturn(List.of(Season.builder().name("2026/27").build()));
        when(templateEngine.process(eq("mail/player-update"), any(Context.class)))
                .thenReturn("<html>error rendered</html>");
        when(userRepository.findAll()).thenReturn(List.of());

        scheduler().tick();

        ArgumentCaptor<SystemConfig> captor = ArgumentCaptor.forClass(SystemConfig.class);
        verify(configRepository).save(captor.capture());
        assertThat(captor.getValue().getAutoUpdateLastRun()).isNotNull();
    }

    @Test
    void buildSubject_noChanges() {
        String subject = scheduler().buildSubject(new NewSeasonSetupService.UpdateResult(0, 0, 0));
        assertThat(subject).isEqualTo("FFL | Spieler-Update | keine Änderungen");
    }

    @Test
    void buildSubject_newPlayersOnly() {
        String subject = scheduler().buildSubject(new NewSeasonSetupService.UpdateResult(3, 0, 0));
        assertThat(subject).isEqualTo("FFL | Spieler-Update | 3 neue Spieler");
    }

    @Test
    void buildSubject_newPlayersAndTeamChanges() {
        String subject = scheduler().buildSubject(new NewSeasonSetupService.UpdateResult(3, 2, 0));
        assertThat(subject).isEqualTo("FFL | Spieler-Update | 3 neue Spieler, 2 Vereinswechsel");
    }

    @Test
    void buildSubject_onlyTeamChanges() {
        String subject = scheduler().buildSubject(new NewSeasonSetupService.UpdateResult(0, 1, 0));
        assertThat(subject).isEqualTo("FFL | Spieler-Update | 0 neue Spieler, 1 Vereinswechsel");
    }

    @Test
    void buildSubject_includesDeactivations() {
        String subject = scheduler().buildSubject(new NewSeasonSetupService.UpdateResult(3, 1, 2));
        assertThat(subject).isEqualTo("FFL | Spieler-Update | 3 neue Spieler, 1 Vereinswechsel, 2 deaktiviert");
    }

    @Test
    void buildSubject_onlyDeactivations() {
        String subject = scheduler().buildSubject(new NewSeasonSetupService.UpdateResult(0, 0, 5));
        assertThat(subject).isEqualTo("FFL | Spieler-Update | 0 neue Spieler, 5 deaktiviert");
    }

    @Test
    void buildHtml_passesAllVariablesToTemplate() {
        List<String> lines = List.of("=== Spieler-Update abgeschlossen ===", "Neue Spieler angelegt: 2");
        when(templateEngine.process(eq("mail/player-update"), any(Context.class)))
                .thenAnswer(invocation -> {
                    Context ctx = invocation.getArgument(1);
                    return "season=" + ctx.getVariable("seasonName")
                            + "|success=" + ctx.getVariable("success")
                            + "|players=" + ctx.getVariable("playersCreated")
                            + "|changes=" + ctx.getVariable("teamChanges")
                            + "|deactivated=" + ctx.getVariable("playersDeactivated")
                            + "|run=" + ctx.getVariable("runTime")
                            + "|logSize=" + ((List<?>) ctx.getVariable("logLines")).size()
                            + "|web=" + ctx.getVariable("webUrl")
                            + "|env=" + ctx.getVariable("environment");
                });

        String html = scheduler().buildHtml("2026/27", true,
                new NewSeasonSetupService.UpdateResult(2, 0, 3), "08.08.2026 08:00", lines, "https://ffl.app", "TEST");

        assertThat(html).contains("season=2026/27");
        assertThat(html).contains("success=true");
        assertThat(html).contains("players=2");
        assertThat(html).contains("changes=0");
        assertThat(html).contains("deactivated=3");
        assertThat(html).contains("run=08.08.2026 08:00");
        assertThat(html).contains("logSize=2");
        assertThat(html).contains("web=https://ffl.app");
        assertThat(html).contains("env=TEST");
    }

    @Test
    void buildHtml_errorPassesSuccessFalseAndZeroCounts() {
        List<String> lines = List.of("FEHLER: kicker down");
        when(templateEngine.process(eq("mail/player-update"), any(Context.class)))
                .thenAnswer(invocation -> {
                    Context ctx = invocation.getArgument(1);
                    return "success=" + ctx.getVariable("success")
                            + "|players=" + ctx.getVariable("playersCreated")
                            + "|changes=" + ctx.getVariable("teamChanges");
                });

        String html = scheduler().buildHtml("2026/27", false, null, "08.08.2026 08:00", lines, null, "TEST");

        assertThat(html).contains("success=false");
        assertThat(html).contains("players=0");
        assertThat(html).contains("changes=0");
    }

    @Test
    void buildHtml_nullWebUrlPassedAsNull() {
        List<String> lines = List.of("log");
        when(templateEngine.process(eq("mail/player-update"), any(Context.class)))
                .thenAnswer(invocation -> {
                    Context ctx = invocation.getArgument(1);
                    return "web=" + ctx.getVariable("webUrl");
                });

        String html = scheduler().buildHtml("2026/27", true,
                new NewSeasonSetupService.UpdateResult(0, 0, 0), "08.08.2026 08:00", lines, null, "TEST");

        assertThat(html).contains("web=null");
    }

    @Test
    void buildHtml_passesEnvironmentToTemplate() {
        List<String> lines = List.of("log");
        when(templateEngine.process(eq("mail/player-update"), any(Context.class)))
                .thenAnswer(invocation -> {
                    Context ctx = invocation.getArgument(1);
                    return "env=" + ctx.getVariable("environment");
                });

        EnvironmentProvider prodProvider = new EnvironmentProvider("docker");
        PlayerUpdateScheduler prodScheduler = new PlayerUpdateScheduler(
                configRepository, seasonRepository, userRepository, setupService, templateEngine, prodProvider);

        String html = prodScheduler.buildHtml("2026/27", true,
                new NewSeasonSetupService.UpdateResult(0, 0, 0), "08.08.2026 08:00", lines, null, prodProvider.getEnvironment());

        assertThat(prodProvider.getEnvironment()).isEqualTo("PROD");
        assertThat(html).contains("env=PROD");
    }
}
