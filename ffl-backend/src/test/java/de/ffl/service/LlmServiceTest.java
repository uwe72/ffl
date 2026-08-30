package de.ffl.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LlmServiceTest {

    @Test
    void baseUrlWithoutPath_getsChatCompletionsAppended() {
        assertEquals(
            "https://litellm.prod.ki-plattform.exxcellent.de/v1/chat/completions",
            LlmService.normalizeChatCompletionsUrl("https://litellm.prod.ki-plattform.exxcellent.de/v1"));
    }

    @Test
    void fullChatCompletionsUrl_staysUnchanged() {
        assertEquals(
            "https://openrouter.ai/api/v1/chat/completions",
            LlmService.normalizeChatCompletionsUrl("https://openrouter.ai/api/v1/chat/completions"));
    }

    @Test
    void trailingSlash_isStrippedBeforeAppending() {
        assertEquals(
            "https://litellm.prod.ki-plattform.exxcellent.de/v1/chat/completions",
            LlmService.normalizeChatCompletionsUrl("https://litellm.prod.ki-plattform.exxcellent.de/v1///"));
    }

    @Test
    void fullChatCompletionsUrlWithTrailingSlash_isNormalized() {
        assertEquals(
            "https://litellm.prod.ki-plattform.exxcellent.de/v1/chat/completions",
            LlmService.normalizeChatCompletionsUrl("https://litellm.prod.ki-plattform.exxcellent.de/v1/chat/completions/"));
    }

    @Test
    void surroundingWhitespace_isTrimmed() {
        assertEquals(
            "https://litellm.prod.ki-plattform.exxcellent.de/v1/chat/completions",
            LlmService.normalizeChatCompletionsUrl("  https://litellm.prod.ki-plattform.exxcellent.de/v1  "));
    }
}
