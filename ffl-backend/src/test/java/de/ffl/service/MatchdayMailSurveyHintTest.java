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
    private final String textSecondary = "#1a3a5c";
    private final String linkColor = "#0056CC";

    private SurveyPublicDto survey(String title, LocalDateTime deadline) {
        return survey(title, deadline, "desc");
    }

    private SurveyPublicDto survey(String title, LocalDateTime deadline, String description) {
        return SurveyPublicDto.builder()
            .id(7L)
            .title(title)
            .description(description)
            .status(SurveyStatus.GESTARTET)
            .deadline(deadline)
            .questions(List.of())
            .build();
    }

    @Test
    void renderSurveyHint_includesTitleAnonymityDeadlineAndLink() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Wer wird Meister?", LocalDateTime.of(2026, 9, 5, 20, 0)),
            "https://ffl.example.com/", cardBg, textPrimary, textSecondary, linkColor, false);

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
            null, "https://ffl.example.com/", cardBg, textPrimary, textSecondary, linkColor, false)).isEmpty();
    }

    @Test
    void renderSurveyHint_escapesMaliciousTitle() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("<script>alert('x')</script>", LocalDateTime.now()),
            "https://ffl.example.com/", cardBg, textPrimary, textSecondary, linkColor, false);

        assertThat(html).doesNotContain("<script>");
        assertThat(html).contains("&lt;script&gt;");
    }

    @Test
    void renderSurveyHint_nullDeadline_usesFallback() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Test", null),
            "https://ffl.example.com/", cardBg, textPrimary, textSecondary, linkColor, false);

        assertThat(html).contains("noch bis bald");
    }

    @Test
    void renderSurveyHint_noWebUrl_rendersWithoutLink() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Test", LocalDateTime.now()),
            null, cardBg, textPrimary, textSecondary, linkColor, false);

        assertThat(html).contains("Umfrage: Test");
        assertThat(html).doesNotContain("Abstimmen");
    }

    @Test
    void renderSurveyHint_withDescription_rendersItalicDescriptionLine() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Test", LocalDateTime.now(), "Bitte gebt eure Meinung ab."),
            "https://ffl.example.com/", cardBg, textPrimary, textSecondary, linkColor, false);

        assertThat(html).contains("Bitte gebt eure Meinung ab.");
        assertThat(html).contains("font-style:italic");
        assertThat(html).contains("color:" + textSecondary);
        int titleEnd = html.indexOf("Umfrage: Test") + "Umfrage: Test".length();
        int desc = html.indexOf("Bitte gebt eure Meinung ab.");
        int meta = html.indexOf("Anonym");
        assertThat(desc).isGreaterThan(titleEnd);
        assertThat(desc).isLessThan(meta);
    }

    @Test
    void renderSurveyHint_escapesMaliciousDescription() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Test", LocalDateTime.now(), "<script>alert('x')</script>"),
            "https://ffl.example.com/", cardBg, textPrimary, textSecondary, linkColor, false);

        assertThat(html).doesNotContain("<script>");
        assertThat(html).contains("&lt;script&gt;");
    }

    @Test
    void renderSurveyHint_blankDescription_omitsDescriptionLine() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Test", LocalDateTime.now(), "   "),
            "https://ffl.example.com/", cardBg, textPrimary, textSecondary, linkColor, false);

        assertThat(html).doesNotContain("font-style:italic");
        assertThat(html).contains("Anonym, dauert eine Minute");
    }

    @Test
    void renderSurveyHint_nullDescription_omitsDescriptionLine() {
        String html = MatchdayMailTransactionService.renderSurveyHint(
            survey("Test", LocalDateTime.now(), null),
            "https://ffl.example.com/", cardBg, textPrimary, textSecondary, linkColor, false);

        assertThat(html).doesNotContain("font-style:italic");
        assertThat(html).contains("Anonym, dauert eine Minute");
    }
}
