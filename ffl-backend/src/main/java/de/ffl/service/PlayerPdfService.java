package de.ffl.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.dto.PlayerDto;
import de.ffl.repository.SeasonRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@Service
public class PlayerPdfService {

    private final PlayerService playerService;
    private final SeasonRepository seasonRepository;

    public PlayerPdfService(PlayerService playerService, SeasonRepository seasonRepository) {
        this.playerService = playerService;
        this.seasonRepository = seasonRepository;
    }

    public byte[] generatePlayersPdf(Long seasonId) {
        Season season = seasonRepository.findById(seasonId).orElse(null);
        if (season == null) {
            throw new IllegalArgumentException("Saison nicht gefunden");
        }

        List<PlayerDto> players = playerService.findBySeasonId(seasonId);
        players.sort(Comparator.comparing(
            p -> p.getPositionTotal() == null ? Integer.MAX_VALUE : p.getPositionTotal()));

        String seasonName = season.getName() != null ? season.getName() : String.valueOf(seasonId);

        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4.rotate(), 36, 36, 50, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font subtitleFont = new Font(Font.HELVETICA, 10, Font.NORMAL);
            Font headerFont = new Font(Font.HELVETICA, 9, Font.BOLD);
            Font cellFont = new Font(Font.HELVETICA, 9, Font.NORMAL);

            Paragraph title = new Paragraph("Spielerliste – Saison " + seasonName, titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4);
            document.add(title);

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy");
            Paragraph subtitle = new Paragraph(
                "Erstellt am " + LocalDate.now().format(fmt) + " – " + players.size() + " Spieler",
                subtitleFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(14);
            document.add(subtitle);

            PdfPTable table = new PdfPTable(new float[]{1.2f, 4f, 2.8f, 2.2f, 1.8f, 1.5f, 1.5f});
            table.setWidthPercentage(100);
            table.setSpacingBefore(4);

            String[] headers = {"Pos.", "Spieler", "Verein", "Position", "Marktwert", "Punkte", "Manager"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setBackgroundColor(new java.awt.Color(231, 229, 228));
                cell.setPadding(5);
                table.addCell(cell);
            }

            for (PlayerDto p : players) {
                table.addCell(cell(String.valueOf(p.getPositionTotal() != null ? p.getPositionTotal() : "-"), cellFont, Element.ALIGN_CENTER));
                table.addCell(cell(playerName(p), cellFont, Element.ALIGN_LEFT));
                table.addCell(cell(clubName(p), cellFont, Element.ALIGN_LEFT));
                table.addCell(cell(positionLabel(p.getPosition()), cellFont, Element.ALIGN_LEFT));
                table.addCell(cell(formatPrize(p.getPrize()), cellFont, Element.ALIGN_RIGHT));
                table.addCell(cell(String.valueOf(p.getPoints() != null ? p.getPoints() : 0), cellFont, Element.ALIGN_RIGHT));
                table.addCell(cell(String.valueOf(p.getManagerCount() != null ? p.getManagerCount() : 0), cellFont, Element.ALIGN_CENTER));
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF-Erzeugung fehlgeschlagen: " + e.getMessage(), e);
        }
    }

    public String buildFilename(Long seasonId) {
        Season season = seasonRepository.findById(seasonId).orElse(null);
        String seasonName = season != null && season.getName() != null ? season.getName() : String.valueOf(seasonId);
        String safe = seasonName.replaceAll("[^a-zA-Z0-9]+", "-").replaceAll("-+", "-").replaceAll("^-|-$", "");
        return "Saison-" + safe + "-Spielerliste.pdf";
    }

    private PdfPCell cell(String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setPadding(4);
        return cell;
    }

    private String playerName(PlayerDto p) {
        String first = p.getFirstName() != null ? p.getFirstName() : "";
        String last = p.getLastName() != null ? p.getLastName() : "";
        String name = (first + " " + last).trim();
        if (name.isEmpty() && p.getNameKicker() != null) {
            name = p.getNameKicker();
        }
        return name;
    }

    private String clubName(PlayerDto p) {
        if (p.getTeams() != null && !p.getTeams().isEmpty()) {
            return p.getTeams().get(0).getName();
        }
        return "";
    }

    private String positionLabel(Position position) {
        if (position == null) return "";
        return switch (position) {
            case GOALKEEPER -> "Torwart";
            case DEFENDER -> "Abwehr";
            case MIDFIELD -> "Mittelfeld";
            case STRIKER -> "Sturm";
        };
    }

    private String formatPrize(Integer prize) {
        if (prize == null) return "0";
        return String.format("%,d", prize);
    }
}
