package de.ffl.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * LLM-Client fuer OpenRouter (OpenAI-kompatible REST-API).
 * Nutzt den API-Key, das Modell und den Prompt-Stil aus der SystemConfig.
 */
@Service
public class LlmService {

    private static final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate;

    public LlmService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(15).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(30).toMillis());
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Erzeugt eine 2-3-Satz-Einleitung zum Spieltag.
     *
     * @param apiKey       OpenRouter API-Key
     * @param model        OpenRouter Model-Identifier (z. B. "openai/gpt-4o-mini")
     * @param promptStyle  Stil-/Rahmen-Anweisung aus SystemConfig
     * @param matchdayData frei strukturierbare Daten (werden als JSON an das LLM uebergeben)
     * @return generierter Einleitungstext
     */
    public String generateMatchdayIntro(String apiKey, String model, String promptStyle,
                                        Map<String, Object> matchdayData) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OpenRouter API-Key ist nicht konfiguriert");
        }
        String effectiveModel = (model != null && !model.isBlank()) ? model : "openai/gpt-4o-mini";
        String effectiveStyle = (promptStyle != null && !promptStyle.isBlank())
            ? promptStyle
            : "Schreibe 2-3 Saetze auf Deutsch ueber den Fantasy-Football-Spieltag. "
              + "Hebe den Tagessieger hervor und nenne Besonderheiten. Lockerer, motivierender Ton.";

        String jsonData;
        try {
            jsonData = objectMapper.writeValueAsString(matchdayData);
        } catch (Exception e) {
            throw new RuntimeException("Konnte Spieltags-Daten nicht serialisieren: " + e.getMessage(), e);
        }

        Map<String, Object> body = Map.of(
            "model", effectiveModel,
            "messages", List.of(
                Map.of("role", "system", "content", effectiveStyle),
                Map.of("role", "user", "content",
                    "Hier sind die Spieltags-Daten als JSON. Schreibe die Einleitung.\n\n" + jsonData)
            )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        headers.set("HTTP-Referer", "https://ffl.ipv64.de");
        headers.set("X-Title", "FFL Spieltagsmail");

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        String responseJson;
        try {
            responseJson = restTemplate.postForObject(OPENROUTER_URL, request, String.class);
        } catch (Exception e) {
            throw new RuntimeException("OpenRouter-Anfrage fehlgeschlagen: " + e.getMessage(), e);
        }

        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                throw new RuntimeException("Keine gueltige Antwort von OpenRouter: " + responseJson);
            }
            return content.asText().trim();
        } catch (Exception e) {
            throw new RuntimeException("OpenRouter-Antwort konnte nicht gelesen werden: " + e.getMessage(), e);
        }
    }
}
