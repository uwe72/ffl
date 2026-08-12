package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.SystemConfig;
import de.ffl.dto.InvitationPreviewDto;
import de.ffl.dto.PlayerDto;
import de.ffl.dto.PublicSeasonInfoDto;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import de.ffl.service.InvitationMailService;
import de.ffl.service.PlayerService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicSeasonControllerTest {

    @Mock
    private SeasonRepository seasonRepository;

    @Mock
    private SystemConfigRepository systemConfigRepository;

    @Mock
    private PlayerService playerService;

    @Mock
    private InvitationMailService invitationMailService;

    @InjectMocks
    private PublicSeasonController publicSeasonController;

    @Test
    void getPublicSeasonInfo_seasonPresent_returnsOnlyPublicFields() {
        Season season = Season.builder()
            .id(7L)
            .name("2026/27")
            .budget(30_000_000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .finalRegistrationDate(LocalDate.of(2026, 8, 15))
            .iban("DE89370400440532013000")
            .bic("COBADEFFXXX")
            .bankName("Commerzbank")
            .kontoinhaber("FFL Admin")
            .paypalLink("https://paypal.me/ffl")
            .mailText("Geheim")
            .invitationMailText("Geheim-Einladung")
            .spieleinsatzEuro(new BigDecimal("10.00"))
            .serverkostenEuro(new BigDecimal("60.00"))
            .gewinnErsterPlatzProzent(10)
            .build();
        when(seasonRepository.findAll()).thenReturn(List.of(season));

        ResponseEntity<PublicSeasonInfoDto> response = publicSeasonController.getPublicSeasonInfo();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PublicSeasonInfoDto dto = response.getBody();
        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(7L);
        assertThat(dto.getName()).isEqualTo("2026/27");
        assertThat(dto.getBudget()).isEqualTo(30_000_000);
        assertThat(dto.getSeasonState()).isEqualTo(SeasonState.BEFORE_SEASON);
        assertThat(dto.getFinalRegistrationDate()).isEqualTo(LocalDate.of(2026, 8, 15));
    }

    @Test
    void getPublicSeasonInfo_dtoDoesNotExposeSensitiveFields() {
        Season season = Season.builder()
            .id(1L)
            .name("S")
            .budget(1)
            .seasonState(SeasonState.BEFORE_SEASON)
            .iban("DE89370400440532013000")
            .bic("COBADEFFXXX")
            .bankName("Bank")
            .kontoinhaber("Inhaber")
            .paypalLink("https://paypal.me/x")
            .mailText("secret-mail-text")
            .invitationMailText("secret-invitation")
            .build();
        when(seasonRepository.findAll()).thenReturn(List.of(season));

        PublicSeasonInfoDto dto = publicSeasonController.getPublicSeasonInfo().getBody();

        assertThat(dto).isNotNull();
        assertThat(dto).hasFieldOrProperty("id");
        assertThat(dto).hasFieldOrProperty("name");
        assertThat(dto).hasFieldOrProperty("budget");
        assertThat(dto).hasFieldOrProperty("seasonState");
        assertThat(dto).hasFieldOrProperty("finalRegistrationDate");

        java.util.Set<String> declaredFields = java.util.Arrays.stream(PublicSeasonInfoDto.class.getDeclaredFields())
            .map(java.lang.reflect.Field::getName)
            .collect(java.util.stream.Collectors.toSet());
        assertThat(declaredFields).containsExactlyInAnyOrder(
            "id", "name", "budget", "seasonState", "finalRegistrationDate");
    }

    @Test
    void getPublicSeasonInfo_noSeason_returnsNotFound() {
        when(seasonRepository.findAll()).thenReturn(List.of());

        ResponseEntity<PublicSeasonInfoDto> response = publicSeasonController.getPublicSeasonInfo();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getPublicPlayersBySeason_delegatesToPlayerService() {
        PlayerDto player = new PlayerDto();
        player.setId(42L);
        player.setNameKicker("Testspieler");
        when(playerService.findBySeasonId(7L)).thenReturn(List.of(player));

        List<PlayerDto> result = publicSeasonController.getPublicPlayersBySeason(7L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(42L);
        assertThat(result.get(0).getNameKicker()).isEqualTo("Testspieler");
    }

    @Test
    void getPublicPlayersBySeason_emptySeason_returnsEmptyList() {
        when(playerService.findBySeasonId(99L)).thenReturn(List.of());

        List<PlayerDto> result = publicSeasonController.getPublicPlayersBySeason(99L);

        assertThat(result).isEmpty();
    }

    @Test
    void getPublicSeasonInfo_usesFirstSeasonWhenMultiplePresent() {
        Season first = Season.builder().id(1L).name("First").budget(100).seasonState(SeasonState.BEFORE_SEASON).build();
        Season second = Season.builder().id(2L).name("Second").budget(200).seasonState(SeasonState.RUNNING_HINRUNDE).build();
        when(seasonRepository.findAll()).thenReturn(List.of(first, second));

        ResponseEntity<PublicSeasonInfoDto> response = publicSeasonController.getPublicSeasonInfo();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getId()).isEqualTo(1L);
        assertThat(response.getBody().getName()).isEqualTo("First");
    }

    @Test
    void getInvitationPreview_seasonPresent_returnsPreviewFromService() {
        Season season = Season.builder()
            .id(7L)
            .name("2026/27")
            .budget(30_000_000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .seasonStartDate(LocalDate.of(2026, 8, 14))
            .seasonStartTime(LocalTime.of(20, 30))
            .finalRegistrationDate(LocalDate.of(2026, 8, 14))
            .spieleinsatzEuro(new BigDecimal("10.00"))
            .build();
        when(seasonRepository.findAll()).thenReturn(List.of(season));
        SystemConfig config = new SystemConfig();
        config.setWebUrl("https://ffl.example.com/");
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));
        InvitationPreviewDto preview = new InvitationPreviewDto();
        preview.setSeasonName("2026/27");
        preview.setStartDateLong("Freitag, 14. August 2026");
        preview.setDeadlineDate("Freitag, 14. August 2026");
        preview.setDeadlineTime("20:30");
        preview.setWebUrl("https://ffl.example.com");
        when(invitationMailService.buildPreviewDto(season, "https://ffl.example.com/")).thenReturn(preview);

        ResponseEntity<InvitationPreviewDto> response = publicSeasonController.getInvitationPreview();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        InvitationPreviewDto dto = response.getBody();
        assertThat(dto).isNotNull();
        assertThat(dto.getSeasonName()).isEqualTo("2026/27");
        assertThat(dto.getStartDateLong()).isEqualTo("Freitag, 14. August 2026");
        assertThat(dto.getDeadlineDate()).isEqualTo("Freitag, 14. August 2026");
        assertThat(dto.getDeadlineTime()).isEqualTo("20:30");
        assertThat(dto.getWebUrl()).isEqualTo("https://ffl.example.com");
    }

    @Test
    void getInvitationPreview_noSeason_returnsNotFound() {
        when(seasonRepository.findAll()).thenReturn(List.of());

        ResponseEntity<InvitationPreviewDto> response = publicSeasonController.getInvitationPreview();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getInvitationPreview_noSystemConfig_passesNullWebUrl() {
        Season season = Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(30_000_000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .build();
        when(seasonRepository.findAll()).thenReturn(List.of(season));
        when(systemConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());
        InvitationPreviewDto preview = new InvitationPreviewDto();
        preview.setSeasonName("2026/27");
        preview.setWebUrl(null);
        when(invitationMailService.buildPreviewDto(season, null)).thenReturn(preview);

        ResponseEntity<InvitationPreviewDto> response = publicSeasonController.getInvitationPreview();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getWebUrl()).isNull();
    }
}
