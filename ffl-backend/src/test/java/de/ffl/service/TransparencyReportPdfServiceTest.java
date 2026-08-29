package de.ffl.service;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import org.junit.jupiter.api.Test;

import java.util.List;

import static de.ffl.service.SeasonTransparencyMailService.AllPlayerRowDto;
import static de.ffl.service.SeasonTransparencyMailService.ManagerSquadDto;
import static de.ffl.service.SeasonTransparencyMailService.PlayerRowDto;
import static de.ffl.service.SeasonTransparencyMailService.PositionGroupDto;
import static org.assertj.core.api.Assertions.assertThat;

class TransparencyReportPdfServiceTest {

    private final TransparencyReportPdfService pdfService = new TransparencyReportPdfService();

    @Test
    void generatePdf_shouldProduceValidPdfWithTables() throws Exception {
        ManagerSquadDto squad = new ManagerSquadDto(
            1,
            "Max Mustermann",
            "maxi",
            List.of(
                new PositionGroupDto("Torwart", "#57534e",
                    List.of(new PlayerRowDto("TW", "#57534e", "Manuel Neuer", "Bayern München", "5.000.000 €"))),
                new PositionGroupDto("Sturm", "#be123c",
                    List.of(new PlayerRowDto("ST", "#be123c", "Harry Kane", "Bayern München", "12.000.000 €")))
            )
        );

        List<AllPlayerRowDto> allPlayers = List.of(
            new AllPlayerRowDto("Manuel Neuer", "TW", "#57534e", "5.000.000 €", "Bayern München", 42),
            new AllPlayerRowDto("Harry Kane", "ST", "#be123c", "12.000.000 €", "Bayern München", 7)
        );

        byte[] pdf = pdfService.generatePdf("2025/26", 1, List.of(squad), allPlayers);

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");

        PdfReader reader = new PdfReader(pdf);
        try {
            assertThat(reader.getNumberOfPages()).isGreaterThanOrEqualTo(1);
            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            StringBuilder allText = new StringBuilder();
            for (int i = 1; i <= reader.getNumberOfPages(); i++) {
                allText.append(extractor.getTextFromPage(i)).append('\n');
            }
            String text = allText.toString();
            assertThat(text).contains("Transparenz-Report");
            assertThat(text).contains("Saison 2025/26");
            assertThat(text).contains("1 teilnehmende Manager");
            assertThat(text).contains("Alle teilnehmenden Manager");
            assertThat(text).contains("1.) Spieler von Max Mustermann");
            assertThat(text).contains("Torwart");
            assertThat(text).contains("Manuel Neuer");
            assertThat(text).contains("Bayern München");
            assertThat(text).contains("Harry Kane");
            assertThat(text).contains("Alle verwendeten Spieler");
            assertThat(text).contains("42×");
            assertThat(text).contains("FFL · FANTASY FOOTBALL LEAGUE");
            assertThat(text).contains("Seite 1 von");
        } finally {
            reader.close();
        }
    }

    @Test
    void buildFilename_shouldContainSeasonNameAndPdfExtension() {
        assertThat(pdfService.buildFilename("2025/26")).isEqualTo("Transparenz-Report-Saison-2025-26.pdf");
        assertThat(pdfService.buildFilename("2025 / 26")).isEqualTo("Transparenz-Report-Saison-2025-26.pdf");
        assertThat(pdfService.buildFilename(null)).isEqualTo("Transparenz-Report-Saison-Aktuelle-Saison.pdf");
    }
}
