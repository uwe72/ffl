package de.ffl.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MatchdayMailCommentRenderTest {

    @Test
    void renderCommentCard_preservesRichTextHtml() {
        String comment = "<p>Hallo <strong>Team</strong>,</p><p>Zeile zwei</p>";
        String html = MatchdayMailTransactionService.renderCommentCard(comment, null, "#f5f5f5", "#111111", false);

        assertTrue(html.contains("<strong>Team</strong>"), "bold markup should be preserved");
        assertTrue(html.contains("Zeile zwei"), "second paragraph content should be preserved");
        assertTrue(html.startsWith("<div style=\"background:#f5f5f5;"));
    }

    @Test
    void renderCommentCard_removesScripts() {
        String comment = "<p>Text</p><script>alert('xss')</script>";
        String html = MatchdayMailTransactionService.renderCommentCard(comment, null, "#f5f5f5", "#111111", false);

        assertFalse(html.toLowerCase().contains("<script"), "script tags should be removed");
        assertTrue(html.contains("Text"));
    }

    @Test
    void renderCommentCard_removesEventHandlers() {
        String comment = "<p onclick=\"alert('x')\">Text</p>";
        String html = MatchdayMailTransactionService.renderCommentCard(comment, null, "#f5f5f5", "#111111", false);

        assertFalse(html.contains("onclick"), "event handler attributes should be removed");
        assertTrue(html.contains("Text"));
    }

    @Test
    void renderCommentCard_removesJavascriptLinks() {
        String comment = "<p><a href=\"javascript:alert('x')\">Link</a></p>";
        String html = MatchdayMailTransactionService.renderCommentCard(comment, null, "#f5f5f5", "#111111", false);

        assertFalse(html.contains("javascript:"), "javascript links should be removed");
    }

    @Test
    void renderCommentCard_emptyOrNull_returnsEmpty() {
        assertTrue(MatchdayMailTransactionService.renderCommentCard(null, null, "#f5f5f5", "#111111", false).isEmpty());
        assertTrue(MatchdayMailTransactionService.renderCommentCard("   ", null, "#f5f5f5", "#111111", false).isEmpty());
    }

    @Test
    void renderCommentCard_whitespaceOnlyHtml_returnsEmpty() {
        assertTrue(MatchdayMailTransactionService.renderCommentCard("<p><br></p>", null, "#f5f5f5", "#111111", false).isEmpty());
        assertTrue(MatchdayMailTransactionService.renderCommentCard("<p>&nbsp;</p>", null, "#f5f5f5", "#111111", false).isEmpty());
        assertTrue(MatchdayMailTransactionService.renderCommentCard("<p>   </p>", null, "#f5f5f5", "#111111", false).isEmpty());
    }

    @Test
    void renderCommentCard_rendersHeadingAboveComment() {
        String html = MatchdayMailTransactionService.renderCommentCard(
            "<p>Text</p>", "Hinweis zum Spieltag", "#f5f5f5", "#111111", false);

        assertTrue(html.startsWith("<div style=\"background:#f5f5f5;"), "card wrapper should stay first");
        int headingIndex = html.indexOf("\u2139\uFE0F Hinweis zum Spieltag");
        assertTrue(headingIndex > 0, "heading with info emoji should be rendered");
        assertTrue(html.indexOf("Text") > headingIndex, "heading should appear above the comment");
        assertTrue(html.contains("font-weight:700"), "heading should be bold");
        assertTrue(html.contains("color:#b7791f"), "heading should use light theme accent color");
    }

    @Test
    void renderCommentCard_headingEscapesHtml() {
        String html = MatchdayMailTransactionService.renderCommentCard(
            "<p>Text</p>", "<b>Auf</b> & <script>x</script>", "#f5f5f5", "#111111", false);

        assertTrue(html.contains("&lt;b&gt;Auf&lt;/b&gt; &amp;"), "heading html should be escaped");
        assertFalse(html.contains("<script"), "heading must not inject raw html");
    }

    @Test
    void renderCommentCard_headingDarkThemeUsesYellowAccent() {
        String html = MatchdayMailTransactionService.renderCommentCard(
            "<p>Text</p>", "Hinweis", "#1c1c1e", "#fafaf9", true);

        assertTrue(html.contains("color:#FFD60A"), "heading should use dark theme accent color");
    }

    @Test
    void renderCommentCard_blankHeadingBehavesLikeNoHeading() {
        String plain = MatchdayMailTransactionService.renderCommentCard("<p>Text</p>", null, "#f5f5f5", "#111111", false);
        String blank = MatchdayMailTransactionService.renderCommentCard("<p>Text</p>", "   ", "#f5f5f5", "#111111", false);

        assertEquals(plain, blank, "blank heading must produce identical output to null");
        assertFalse(blank.contains("\u2139\uFE0F"));
    }

    @Test
    void renderCommentCard_headingTrimsWhitespace() {
        String html = MatchdayMailTransactionService.renderCommentCard(
            "<p>Text</p>", "  Überschrift  ", "#f5f5f5", "#111111", false);

        assertTrue(html.contains("Überschrift"));
        assertFalse(html.contains("  Überschrift"), "heading should be trimmed");
    }
}
