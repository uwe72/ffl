package de.ffl.service;

import de.ffl.domain.SurveyStatus;
import de.ffl.dto.SurveyPublicDto;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MatchdayMailSurveyHintTest {

    private final String cardBg = "#ffffff";
    private final String textPrimary = "#0a0a0a";
    private final String linkColor = "#0056CC";

    private SurveyPublicDto survey(String title, LocalDateTime deadline) {
        return SurveyPublicDto.builder()
            .id(7L)
            .title(title)
            .description("desc")
            .status(SurveyStatus.GESTARTET)
            .deadline(deadline)
            .questions(List.of())
            .build();
    }

    @Test
    void renderSurveyHint_includesTitleAnonymityDeadlineAndLink() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Wer wird Meister?", LocalDateTime.of(2026, 9, 5, 20, 0)),
            "https://ffl.example.com/", cardBg, textPrimary, linkColor, false);

        assertThat(html).contains("Umfrage: Wer wird Meister?");
        assertThat(html).contains("Anonym, dauert eine Minute");
        assertThat(html).contains("noch bis 05.09.2026");
        assertThat(html).contains("href=\"https://ffl.example.com/umfrage/7\"");
        assertThat(html).contains("Abstimmen");
        assertThat(html).contains("<td align=\"right\"");
        assertThat(html.indexOf("noch bis 05.09.2026")).isLessThan(html.indexOf("Abstimmen"));
        assertThat(html.indexOf("Anonym")).isLessThan(html.indexOf("</table>"));
    }

    @Test
    void renderSurveyHint_nullSurvey_returnsEmpty() {
        assertThat(MatchdayMailTransactionService.renderSurveyHint(
            null, "https://ffl.example.com/", cardBg, textPrimary, linkColor, false)).isEmpty();
    }

    @Test
    void renderSurveyHint_escapesMaliciousTitle() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("<script>alert('x')</script>", LocalDateTime.now()),
            "https://ffl.example.com/", cardBg, textPrimary, linkColor, false);

        assertThat(html).doesNotContain("<script>");
        assertThat(html).contains("&lt;script&gt;");
    }

    @Test
    void renderSurveyHint_nullDeadline_usesFallback() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Test", null),
            "https://ffl.example.com/", cardBg, textPrimary, linkColor, false);

        assertThat(html).contains("noch bis bald");
    }

    @Test
    void renderSurveyHint_noWebUrl_rendersWithoutLink() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Test", LocalDateTime.now()),
            null, cardBg, textPrimary, linkColor, false);

        assertThat(html).contains("Umfrage: Test");
        assertThat(html).doesNotContain("Abstimmen");
    }
}
