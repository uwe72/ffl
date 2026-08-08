package de.ffl.service;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import de.ffl.dto.DocumentDto;
import de.ffl.repository.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerPdfServiceTest extends AbstractSeasonTestBase {

    @Autowired
    private PlayerPdfService playerPdfService;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private DocumentRepository documentRepository;

    @BeforeEach
    void setUp() throws Exception {
        loadTestData();
    }

    @Test
    void generatePlayersPdf_shouldProduceValidPdfWithAllPlayers() throws Exception {
        byte[] pdf = playerPdfService.generatePlayersPdf(season.getId());

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
            assertThat(text).contains("Spielerliste");
            assertThat(text).contains("Saison 2025/26");
            assertThat(text).contains("Manuel Neuer");
            assertThat(text).contains("Bayern München");
            assertThat(text).contains("Marktwert");
            assertThat(text).contains("Manager");
            assertThat(text).contains("FFL · FANTASY FOOTBALL LEAGUE");
            assertThat(text).contains("SPIELER GESAMT");
            assertThat(text).contains("MARKTWERT GESAMT");
            assertThat(text).contains("MANAGER GESAMT");
            assertThat(text).contains("FFL — Fantasy Football League");
            assertThat(text).contains("Seite 1 von");
        } finally {
            reader.close();
        }
    }

    @Test
    void buildFilename_shouldContainSeasonNameAndPdfExtension() {
        String filename = playerPdfService.buildFilename(season.getId());
        assertThat(filename).isEqualTo("Saison-2025-26-Spielerliste.pdf");
    }

    @Test
    void storeGenerated_shouldPersistPdfAsDocument() {
        byte[] pdf = playerPdfService.generatePlayersPdf(season.getId());
        String filename = playerPdfService.buildFilename(season.getId());

        DocumentDto created = documentService.storeGenerated(pdf, filename, "application/pdf", "test-admin");

        assertThat(created.getFilename()).isEqualTo(filename);
        assertThat(created.getContentType()).isEqualTo("application/pdf");
        assertThat(created.getFileSize()).isEqualTo(pdf.length);
        assertThat(created.getUploadedBy()).isEqualTo("test-admin");
        assertThat(documentRepository.findById(created.getId())).isPresent();
    }

    @Test
    void generatePlayersPdf_shouldThrowForUnknownSeason() {
        try {
            playerPdfService.generatePlayersPdf(999999L);
            assertThat(false).as("Sollte IllegalArgumentException werfen").isTrue();
        } catch (IllegalArgumentException e) {
            assertThat(e.getMessage()).contains("Saison nicht gefunden");
        }
    }
}
