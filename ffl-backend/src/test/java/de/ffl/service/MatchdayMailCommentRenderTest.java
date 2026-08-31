package de.ffl.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MatchdayMailCommentRenderTest {

    @Test
    void renderCommentCard_preservesRichTextHtml() {
        String comment = "<p>Hallo <strong>Team</strong>,</p><p>Zeile zwei</p>";
        String html = MatchdayMailTransactionService.renderCommentCard(comment, "#f5f5f5", "#111111", false);

        assertTrue(html.contains("<strong>Team</strong>"), "bold markup should be preserved");
        assertTrue(html.contains("Zeile zwei"), "second paragraph content should be preserved");
        assertTrue(html.startsWith("<div style=\"background:#f5f5f5;"));
    }

    @Test
    void renderCommentCard_removesScripts() {
        String comment = "<p>Text</p><script>alert('xss')</script>";
        String html = MatchdayMailTransactionService.renderCommentCard(comment, "#f5f5f5", "#111111", false);

        assertFalse(html.toLowerCase().contains("<script"), "script tags should be removed");
        assertTrue(html.contains("Text"));
    }

    @Test
    void renderCommentCard_removesEventHandlers() {
        String comment = "<p onclick=\"alert('x')\">Text</p>";
        String html = MatchdayMailTransactionService.renderCommentCard(comment, "#f5f5f5", "#111111", false);

        assertFalse(html.contains("onclick"), "event handler attributes should be removed");
        assertTrue(html.contains("Text"));
    }

    @Test
    void renderCommentCard_removesJavascriptLinks() {
        String comment = "<p><a href=\"javascript:alert('x')\">Link</a></p>";
        String html = MatchdayMailTransactionService.renderCommentCard(comment, "#f5f5f5", "#111111", false);

        assertFalse(html.contains("javascript:"), "javascript links should be removed");
    }

    @Test
    void renderCommentCard_emptyOrNull_returnsEmpty() {
        assertTrue(MatchdayMailTransactionService.renderCommentCard(null, "#f5f5f5", "#111111", false).isEmpty());
        assertTrue(MatchdayMailTransactionService.renderCommentCard("   ", "#f5f5f5", "#111111", false).isEmpty());
    }

    @Test
    void renderCommentCard_whitespaceOnlyHtml_returnsEmpty() {
        assertTrue(MatchdayMailTransactionService.renderCommentCard("<p><br></p>", "#f5f5f5", "#111111", false).isEmpty());
        assertTrue(MatchdayMailTransactionService.renderCommentCard("<p>&nbsp;</p>", "#f5f5f5", "#111111", false).isEmpty());
        assertTrue(MatchdayMailTransactionService.renderCommentCard("<p>   </p>", "#f5f5f5", "#111111", false).isEmpty());
    }
}
