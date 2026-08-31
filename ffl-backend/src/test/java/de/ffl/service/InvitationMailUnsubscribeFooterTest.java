package de.ffl.service;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.dto.InvitationPreviewDto;
import de.ffl.repository.EmailAddressRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class InvitationMailUnsubscribeFooterTest {

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
            emailAddressRepository, unsubscribeService, templateEngine, new SmtpMailTransport());
    }

    @Test
    void footer_escapesAmpersandInUnsubscribeUrl() {
        String html = service().insertUnsubscribeFooter(
            "<html><body><h1>Einladung</h1></body></html>",
            "https://ffl.example.com/api/public/unsubscribe?id=5&token=abc.def");

        assertThat(html).contains("href=\"https://ffl.example.com/api/public/unsubscribe?id=5&amp;token=abc.def\"");
        assertThat(html).doesNotContain("id=5&token=abc.def\"");
        assertThat(html).contains("hier austragen");
        assertThat(html).contains("</body>");
    }

    @Test
    void footer_placeholderUrl_isInsertedAsIs() {
        String html = service().insertUnsubscribeFooter(
            "<html><body><h1>Einladung</h1></body></html>",
            "{ABMELDE-LINK}");

        assertThat(html).contains("href=\"{ABMELDE-LINK}\"");
        assertThat(html).contains("hier austragen");
    }

    @Test
    void buildPreviewDto_formatsFieldsLikeMailTemplate() {
        Season season = Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(30_000_000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .seasonStartDate(LocalDate.of(2026, 8, 14))
            .seasonStartTime(LocalTime.of(20, 30))
            .finalRegistrationDate(LocalDate.of(2026, 8, 14))
            .spieleinsatzEuro(new BigDecimal("10.00"))
            .serverkostenEuro(new BigDecimal("60.00"))
            .gewinnErsterPlatzProzent(10)
            .gewinnLetzterPlatzEuro(new BigDecimal("15.00"))
            .anzahlSpielleiter(2)
            .startRoundRueckrunde(18)
            .build();
        Locale.setDefault(Locale.GERMANY);

        InvitationPreviewDto dto = service().buildPreviewDto(season, "https://ffl.example.com/");

        assertThat(dto.getSeasonName()).isEqualTo("2026/27");
        assertThat(dto.getStartDateLong()).isEqualTo("Freitag, 14. August 2026");
        assertThat(dto.getDeadlineDate()).isEqualTo("Freitag, 14. August 2026");
        assertThat(dto.getDeadlineTime()).isEqualTo("20:30");
        assertThat(dto.getStartRoundRueckrunde()).isEqualTo("18");
        assertThat(dto.getSpieleinsatz()).isEqualTo("10");
        assertThat(dto.getServerkosten()).isEqualTo("60");
        assertThat(dto.getGewinnProzent()).isEqualTo("10");
        assertThat(dto.getGewinnLetzter()).isEqualTo("15");
        assertThat(dto.getAnzahlSpielleiter()).isEqualTo("2");
        assertThat(dto.getBudget()).isEqualTo("30.000.000");
        assertThat(dto.getWebUrl()).isEqualTo("https://ffl.example.com");
        assertThat(dto.getPlayersUrl()).isEqualTo("https://ffl.example.com/players");
        assertThat(dto.getDocumentsUrl()).isEqualTo("https://ffl.example.com/documents");
    }

    @Test
    void buildPreviewDto_nullWebUrl_yieldsNullUrls() {
        Season season = Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(30_000_000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .build();

        InvitationPreviewDto dto = service().buildPreviewDto(season, null);

        assertThat(dto.getWebUrl()).isNull();
        assertThat(dto.getPlayersUrl()).isNull();
        assertThat(dto.getDocumentsUrl()).isNull();
    }

    @Test
    void buildPreviewDto_missingDates_useFallbacks() {
        Season season = Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(30_000_000)
            .seasonState(SeasonState.BEFORE_SEASON)
            .build();

        InvitationPreviewDto dto = service().buildPreviewDto(season, null);

        assertThat(dto.getStartDateLong()).isEqualTo("siehe Webseite");
        assertThat(dto.getDeadlineDate()).isEqualTo("siehe Webseite");
        assertThat(dto.getDeadlineTime()).isEqualTo("20:30");
        assertThat(dto.getBudget()).isEqualTo("30.000.000");
        assertThat(dto.getSpieleinsatz()).isEqualTo("10");
    }
}
