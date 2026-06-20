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

@Service
public class LlmService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate;

    public LlmService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(15).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(30).toMillis());
        this.restTemplate = new RestTemplate(factory);
    }

    public String generateMatchdayIntro(String baseUrl, String apiKey, String model, String promptStyle,
                                        Map<String, Object> matchdayData) {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new IllegalStateException("LLM Base-URL ist nicht konfiguriert");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("LLM API-Key ist nicht konfiguriert");
        }
        String effectiveModel = (model != null && !model.isBlank()) ? model : "openai/gpt-4o-mini";
        String effectiveStyle = (promptStyle != null && !promptStyle.isBlank())
            ? promptStyle
            : "Du schreibst die Einleitung einer Spieltagsmail fuer eine Fantasy-Football-Liga auf Deutsch.\n"
              + "Ton: locker, pointiert, leicht humorvoll, ABER durchgehend konkret.\n"
              + "Laenge: 3-5 Saetze, ein Absatz, keine Aufzaehlungszeichen, keine Anrede, kein Gruss.\n\n"
              + "STRIKT VERBOTEN (solche Saetze sofort streichen):\n"
              + "- Einleitungsfloskeln wie \"Willkommen zum ...\", \"Was fuer ein Spieltag\", \"Aufregend\", \"Spannend\".\n"
              + "- Leere Ankuendigungen wie \"Lasst uns die Highlights genauer betrachten\", \"werfen wir einen Blick\", \"unter die Lupe nehmen\".\n"
              + "- Bewertungen ohne Zahl (\"grossartig\", \"stark\", \"ordentlich ins Zeug gelegt\").\n"
              + "- Erwaehnung von Abstuerzen oder negativen Bewegungen (Manager, die Plaetze verloren haben).\n"
              + "- Keine Wiederholung der Saison/Spieltagsnummer im Text - das steht schon im Betreff.\n\n"
              + "ERSTER SATZ (fix, unveraenderlich):\n"
              + "\"Der **Punktedurchschnitt** aller Manager lag an diesem Spieltag bei **X Punkten**.\" (X = avgPointsRound, ganze Zahl)\n\n"
              + "WEITERER PFLICHT-INHALT (konkret, mit Zahlen aus dem JSON):\n"
              + "1) Tagessieger (topScorer) mit seiner Punktzahl (topScorerPoints).\n"
              + "2) Mindestens EIN konkreter Spieler aus topPlayers ODER topScorersAll: Name, Tagespunkte, und in Klammern ownerCount, Format: \"Max Mueller (14 Pkt, in 3 Kadern)\". Bevorzugt aus topPlayers, sonst aus topScorersAll.\n"
              + "3) Mindestens EIN konkreter Aufsteiger aus bigMovers ODER topMovers (nur positive deltaTotal): Name und Plaetze, Format: \"Anna Schmidt kletterte 17 Plaetze nach oben\". Bevorzugt aus bigMovers, sonst aus topMovers.\n\n"
              + "Arbeite ausschliesslich mit den uebergebenen JSON-Daten. Erfinde keine Namen oder Zahlen.\n"
              + "Wenn topPlayers/bigMovers leer sind, nutze topScorersAll/topMovers.\n\n"
              + "FORMATIERUNG: Hebe Manager-Namen, Spieler-Namen und die Punktzahl im ersten Satz mit Markdown-Bold hervor (**Name** oder **Zahl**).\n"
              + "KEINE anderen Zahlen fett.\n"
              + "Beispiel: \"Der **Punktedurchschnitt** aller Manager lag an diesem Spieltag bei **12 Punkten**. Tagessieger **Eric Erdmann** mit 23 Punkten, **Max Mueller** holte 14 Punkte (in 3 Kadern) und **Anna Schmidt** kletterte 17 Plaetze nach oben.\"";

        String jsonData;
        try {
            jsonData = objectMapper.writeValueAsString(matchdayData);
        } catch (Exception e) {
            throw new RuntimeException("Konnte Spieltags-Daten nicht serialisieren: " + e.getMessage(), e);
        }

        Map<String, Object> body = Map.of(
            "model", effectiveModel,
            "temperature", 0.7,
            "max_tokens", 400,
            "messages", List.of(
                Map.of("role", "system", "content", effectiveStyle),
                Map.of("role", "user", "content",
                    "Hier sind die Spieltags-Daten als JSON. Schreibe die Einleitung.\n\n" + jsonData)
            )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        String responseJson;
        try {
            responseJson = restTemplate.postForObject(baseUrl, request, String.class);
        } catch (Exception e) {
            throw new RuntimeException("LLM-Anfrage fehlgeschlagen: " + e.getMessage(), e);
        }

        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                throw new RuntimeException("Keine gueltige Antwort vom LLM: " + responseJson);
            }
            return content.asText().trim();
        } catch (Exception e) {
            throw new RuntimeException("LLM-Antwort konnte nicht gelesen werden: " + e.getMessage(), e);
        }
    }
}
