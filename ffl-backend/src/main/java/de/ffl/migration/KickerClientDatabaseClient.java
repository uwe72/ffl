package de.ffl.migration;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;

@Component
public class KickerClientDatabaseClient {

    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    + "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

    private final HttpClient httpClient = buildHttpClient();

    private static HttpClient buildHttpClient() {
        SSLParameters sslParameters = new SSLParameters();
        sslParameters.setProtocols(new String[]{"TLSv1.3"});
        try {
            SSLContext sslContext = SSLContext.getInstance("TLSv1.3");
            sslContext.init(null, null, null);
            return HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .connectTimeout(Duration.ofSeconds(15))
                    .sslContext(sslContext)
                    .sslParameters(sslParameters)
                    .build();
        } catch (NoSuchAlgorithmException | java.security.KeyManagementException e) {
            throw new IllegalStateException("TLSv1.3-Kontext konnte nicht initialisiert werden: " + e.getMessage(), e);
        }
    }

    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public KickerClientDatabase loadDatabase(String stateUrl) {
        JsonNode state = getJson(stateUrl);
        JsonNode hashNode = state.get("hash");
        if (hashNode == null || hashNode.isNull() || hashNode.asText().isBlank()) {
            throw new IllegalStateException("Kein 'hash' in der State-URL gefunden: " + stateUrl);
        }
        String hash = hashNode.asText();
        String databaseUrl = buildDatabaseUrl(stateUrl, hash);
        return getDatabase(databaseUrl);
    }

    String buildDatabaseUrl(String stateUrl, String hash) {
        URI uri = URI.create(stateUrl);
        String path = uri.getPath();
        int lastSlash = path.lastIndexOf('/');
        String fileName = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
        String seasonId = fileName.endsWith(".json")
                ? fileName.substring(0, fileName.length() - ".json".length())
                : fileName;
        if (seasonId.isBlank()) {
            throw new IllegalStateException("Saison-ID konnte nicht aus State-URL abgeleitet werden: " + stateUrl);
        }
        String origin = uri.getScheme() + "://" + uri.getAuthority();
        return origin + "/api/sportsdata/v1/client_database/" + seasonId + "/" + hash + ".json";
    }

    private JsonNode getJson(String url) {
        try (InputStream is = fetch(url)) {
            return objectMapper.readTree(is);
        } catch (IOException e) {
            throw new IllegalStateException("Fehler beim Laden der kicker-State-URL: " + e.getMessage(), e);
        }
    }

    private KickerClientDatabase getDatabase(String url) {
        try (InputStream is = fetch(url)) {
            return objectMapper.readValue(is, KickerClientDatabase.class);
        } catch (IOException e) {
            throw new IllegalStateException("Fehler beim Laden der kicker-Datenbank: " + e.getMessage(), e);
        }
    }

    private InputStream fetch(String url) {
        try {
            HttpResponse<InputStream> response = httpClient.send(
                    HttpRequest.newBuilder(URI.create(url))
                            .GET()
                            .header("User-Agent", USER_AGENT)
                            .timeout(Duration.ofSeconds(30))
                            .build(),
                    HttpResponse.BodyHandlers.ofInputStream()
            );
            if (response.statusCode() != 200) {
                throw new IllegalStateException(
                        "URL konnte nicht geladen werden (HTTP " + response.statusCode() + "): " + url);
            }
            return response.body();
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException("Fehler beim Laden von " + url + ": " + e.getMessage(), e);
        }
    }

    public KickerClientDatabase parseDatabase(String json) {
        try {
            return objectMapper.readValue(json, KickerClientDatabase.class);
        } catch (IOException e) {
            throw new IllegalStateException("Fehler beim Parsen der kicker-Datenbank: " + e.getMessage(), e);
        }
    }
}
