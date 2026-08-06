package de.ffl.migration;

import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class KickerPlayerCsvClient {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public List<KickerPlayerCsvRow> loadCsv(String url) {
        try {
            HttpResponse<InputStream> response = httpClient.send(
                    HttpRequest.newBuilder(URI.create(url))
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.ofInputStream()
            );
            if (response.statusCode() != 200) {
                throw new IllegalStateException(
                        "CSV konnte nicht geladen werden (HTTP " + response.statusCode() + "): " + url);
            }
            try (InputStream is = response.body();
                 BufferedReader reader = new BufferedReader(
                         new InputStreamReader(is, StandardCharsets.UTF_8))) {
                return parseCsv(reader);
            }
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException("Fehler beim Laden der kicker-CSV: " + e.getMessage(), e);
        }
    }

    public List<KickerPlayerCsvRow> parseCsv(String csv) {
        try (BufferedReader reader = new BufferedReader(new StringReader(csv))) {
            return parseCsv(reader);
        } catch (IOException e) {
            throw new IllegalStateException("Fehler beim Parsen der kicker-CSV: " + e.getMessage(), e);
        }
    }

    private List<KickerPlayerCsvRow> parseCsv(BufferedReader reader) throws IOException {
        List<KickerPlayerCsvRow> rows = new ArrayList<>();
        String header = reader.readLine();
        if (header == null || header.isBlank()) {
            throw new IllegalStateException("CSV ist leer");
        }
        String[] columns = header.split(";");
        int idxKickerId = indexOfOrThrow(columns, "ID");
        int idxFirstName = indexOfOrThrow(columns, "Vorname");
        int idxLastName = indexOfOrThrow(columns, "Nachname");
        int idxDisplayShort = indexOfOrThrow(columns, "Angezeigter Name (kurz)");
        int idxDisplayFull = indexOfOrThrow(columns, "Angezeigter Name");
        int idxTeam = indexOfOrThrow(columns, "Verein");
        int idxPosition = indexOfOrThrow(columns, "Position");
        int idxMarketValue = indexOfOrThrow(columns, "Marktwert");
        int idxPoints = indexOfOrThrow(columns, "Punkte");
        int idxGradeAvg = indexOfOrThrow(columns, "Notendurchschnitt");

        String line;
        while ((line = reader.readLine()) != null) {
            if (line.isBlank()) continue;
            String[] parts = splitCsvLine(line);
            if (parts.length < columns.length) continue;
            rows.add(new KickerPlayerCsvRow(
                    valueOrNull(parts, idxKickerId),
                    valueOrNull(parts, idxFirstName),
                    valueOrNull(parts, idxLastName),
                    valueOrNull(parts, idxDisplayShort),
                    valueOrNull(parts, idxDisplayFull),
                    valueOrNull(parts, idxTeam),
                    valueOrNull(parts, idxPosition),
                    parseIntSafe(valueOrNull(parts, idxMarketValue)),
                    parseIntSafe(valueOrNull(parts, idxPoints)),
                    parseDoubleSafe(valueOrNull(parts, idxGradeAvg))
            ));
        }
        return rows;
    }

    private int indexOfOrThrow(String[] columns, String name) {
        for (int i = 0; i < columns.length; i++) {
            if (columns[i].trim().equalsIgnoreCase(name)) return i;
        }
        throw new IllegalStateException("CSV-Spalte '" + name + "' nicht gefunden");
    }

    private String[] splitCsvLine(String line) {
        return line.split(";", -1);
    }

    private String valueOrNull(String[] parts, int idx) {
        if (idx < 0 || idx >= parts.length) return null;
        String s = parts[idx].trim();
        return s.isEmpty() ? null : s;
    }

    private Integer parseIntSafe(String value) {
        if (value == null || value.isBlank()) return 0;
        try {
            String normalized = value.replace(".", "");
            return Integer.parseInt(normalized);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Double parseDoubleSafe(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}