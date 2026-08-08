package de.ffl.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.dto.PlayerDto;
import de.ffl.repository.SeasonRepository;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@Service
public class PlayerPdfService {

    private static final Color BANNER = new Color(28, 25, 23);
    private static final Color BANNER_EYEBROW = new Color(168, 162, 158);
    private static final Color BANNER_TITLE = new Color(250, 250, 249);
    private static final Color BANNER_SUB = new Color(237, 233, 227);
    private static final Color ACCENT = new Color(63, 58, 52);
    private static final Color CARD = new Color(255, 255, 255);
    private static final Color ZEBRA = new Color(245, 245, 244);
    private static final Color ROW_LINE = new Color(231, 229, 228);
    private static final Color OUTER = new Color(214, 211, 209);
    private static final Color MUTED = new Color(87, 83, 78);
    private static final Color FAINT = new Color(120, 113, 108);
    private static final Color TEXT = new Color(28, 25, 23);
    private static final Color POS_TW = new Color(87, 83, 78);
    private static final Color POS_ABW = new Color(15, 118, 110);
    private static final Color POS_MIT = new Color(67, 56, 202);
    private static final Color POS_STU = new Color(190, 18, 60);

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
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));

        try {
            BaseFont bf = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            BaseFont bfBold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);

            Font eyebrowFont = new Font(bf, 8, Font.NORMAL, BANNER_EYEBROW);
            Font titleFont = new Font(bfBold, 22, Font.NORMAL, BANNER_TITLE);
            Font subFont = new Font(bf, 12, Font.NORMAL, BANNER_SUB);
            Font metaFont = new Font(bf, 9, Font.NORMAL, BANNER_EYEBROW);
            Font kpiLabelFont = new Font(bf, 8, Font.NORMAL, FAINT);
            Font kpiValueFont = new Font(bfBold, 13, Font.NORMAL, TEXT);
            Font headerFont = new Font(bfBold, 9, Font.NORMAL, BANNER_TITLE);
            Font cellFont = new Font(bf, 9, Font.NORMAL, TEXT);
            Font cellBold = new Font(bfBold, 9, Font.NORMAL, TEXT);
            Font cellAccent = new Font(bfBold, 9, Font.NORMAL, ACCENT);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4.rotate(), 36, 36, 64, 48);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new FooterEvent(bf));
            document.open();

            document.add(headerBand(seasonName, dateStr, players.size(), eyebrowFont, titleFont, subFont, metaFont));
            document.add(kpiStrip(players, kpiLabelFont, kpiValueFont));
            document.add(playerTable(players, headerFont, cellFont, cellBold, cellAccent));
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF-Erzeugung fehlgeschlagen: " + e.getMessage(), e);
        }
    }

    private PdfPTable headerBand(String seasonName, String dateStr, int playerCount,
                                 Font eyebrowFont, Font titleFont, Font subFont, Font metaFont) {
        PdfPTable table = new PdfPTable(new float[]{1f, 1f});
        table.setWidthPercentage(100);
        table.setSpacingAfter(16);

        PdfPCell left = new PdfPCell();
        left.setBackgroundColor(BANNER);
        left.setBorder(Rectangle.NO_BORDER);
        left.setPadding(28);
        left.setPaddingTop(24);
        left.setPaddingBottom(24);
        left.setVerticalAlignment(Element.ALIGN_MIDDLE);
        left.addElement(paragraph("FFL · FANTASY FOOTBALL LEAGUE", eyebrowFont, 6));
        left.addElement(paragraph("Spielerliste", titleFont, 4));
        left.addElement(paragraph("Saison " + seasonName, subFont, 0));

        PdfPCell right = new PdfPCell();
        right.setBackgroundColor(BANNER);
        right.setBorder(Rectangle.NO_BORDER);
        right.setPadding(28);
        right.setVerticalAlignment(Element.ALIGN_MIDDLE);
        right.addElement(paragraphRight(dateStr, metaFont));
        right.addElement(paragraphRight(playerCount + " Spieler", metaFont));

        table.addCell(left);
        table.addCell(right);
        return table;
    }

    private PdfPTable kpiStrip(List<PlayerDto> players, Font labelFont, Font valueFont) {
        int count = players.size();
        long totalPrize = players.stream().mapToLong(p -> p.getPrize() != null ? p.getPrize() : 0).sum();
        long totalPoints = players.stream().mapToLong(p -> p.getPoints() != null ? p.getPoints() : 0).sum();
        long totalManagers = players.stream().mapToLong(p -> p.getManagerCount() != null ? p.getManagerCount() : 0).sum();
        double avgPoints = count > 0 ? (double) totalPoints / count : 0;

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingAfter(18);

        kpiCell(table, "Spieler gesamt", String.format("%,d", count), labelFont, valueFont);
        kpiCell(table, "Marktwert gesamt", formatPrizeTotal(totalPrize), labelFont, valueFont);
        kpiCell(table, "Ø Punkte", formatAvg(avgPoints), labelFont, valueFont);
        kpiCell(table, "Manager gesamt", String.format("%,d", totalManagers), labelFont, valueFont);
        return table;
    }

    private void kpiCell(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(CARD);
        cell.setBorderColor(OUTER);
        cell.setBorderWidth(0.5f);
        cell.setPadding(12);
        cell.setPaddingTop(11);
        cell.setPaddingBottom(11);
        cell.addElement(paragraph(label.toUpperCase(), labelFont, 4));
        cell.addElement(paragraph(value, valueFont, 0));
        table.addCell(cell);
    }

    private PdfPTable playerTable(List<PlayerDto> players, Font headerFont, Font cellFont,
                                  Font cellBold, Font cellAccent) {
        float[] widths = {0.10f, 1.0f, 4.0f, 2.6f, 1.7f, 1.6f, 1.3f, 1.1f};
        PdfPTable table = new PdfPTable(widths);
        table.setWidthPercentage(100);

        String[] headers = {"", "Pos.", "Spieler", "Verein", "Position", "Marktwert", "Punkte", "Manager"};
        for (int i = 0; i < headers.length; i++) {
            PdfPCell h = new PdfPCell(new Phrase(headers[i], headerFont));
            h.setBackgroundColor(ACCENT);
            h.setBorder(Rectangle.NO_BORDER);
            h.setPadding(7);
            if (i == 0) {
                h.setPadding(0);
            } else if (i == 5 || i == 6) {
                h.setHorizontalAlignment(Element.ALIGN_RIGHT);
            } else if (i == 7) {
                h.setHorizontalAlignment(Element.ALIGN_CENTER);
            } else if (i == 1) {
                h.setHorizontalAlignment(Element.ALIGN_CENTER);
            } else {
                h.setHorizontalAlignment(Element.ALIGN_LEFT);
            }
            table.addCell(h);
        }
        table.setHeaderRows(1);

        int rank = 0;
        for (PlayerDto p : players) {
            rank++;
            Color bg = rank % 2 == 0 ? ZEBRA : CARD;
            Color stripe = positionColor(p.getPosition());

            PdfPCell stripeCell = new PdfPCell();
            stripeCell.setBackgroundColor(stripe);
            stripeCell.setBorder(Rectangle.NO_BORDER);
            stripeCell.setPadding(0);
            table.addCell(stripeCell);

            String rankStr = p.getPositionTotal() != null ? String.valueOf(p.getPositionTotal()) : "-";
            Font rankFont = rank <= 3 ? cellAccent : cellBold;
            table.addCell(dataCell(rankStr, rankFont, Element.ALIGN_CENTER, bg));

            table.addCell(dataCell(playerName(p), cellFont, Element.ALIGN_LEFT, bg));
            table.addCell(dataCell(clubName(p), cellFont, Element.ALIGN_LEFT, bg));
            table.addCell(dataCell(positionLabel(p.getPosition()), cellFont, Element.ALIGN_LEFT, bg));
            table.addCell(dataCell(formatPrize(p.getPrize()), cellFont, Element.ALIGN_RIGHT, bg));
            table.addCell(dataCell(String.valueOf(p.getPoints() != null ? p.getPoints() : 0), cellFont, Element.ALIGN_RIGHT, bg));
            table.addCell(dataCell(String.valueOf(p.getManagerCount() != null ? p.getManagerCount() : 0), cellFont, Element.ALIGN_CENTER, bg));
        }

        return table;
    }

    private PdfPCell dataCell(String text, Font font, int alignment, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBackgroundColor(bg);
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderWidthBottom(0.5f);
        cell.setBorderColorBottom(ROW_LINE);
        cell.setPadding(7);
        cell.setPaddingTop(6);
        cell.setPaddingBottom(6);
        return cell;
    }

    public String buildFilename(Long seasonId) {
        Season season = seasonRepository.findById(seasonId).orElse(null);
        String seasonName = season != null && season.getName() != null ? season.getName() : String.valueOf(seasonId);
        String safe = seasonName.replaceAll("[^a-zA-Z0-9]+", "-").replaceAll("-+", "-").replaceAll("^-|-$", "");
        return "Saison-" + safe + "-Spielerliste.pdf";
    }

    private Paragraph paragraph(String text, Font font, float spacingAfter) {
        Paragraph p = new Paragraph(text, font);
        p.setSpacingAfter(spacingAfter);
        return p;
    }

    private Paragraph paragraphRight(String text, Font font) {
        Paragraph p = new Paragraph(text, font);
        p.setAlignment(Element.ALIGN_RIGHT);
        return p;
    }

    private Color positionColor(Position position) {
        if (position == null) return MUTED;
        return switch (position) {
            case GOALKEEPER -> POS_TW;
            case DEFENDER -> POS_ABW;
            case MIDFIELD -> POS_MIT;
            case STRIKER -> POS_STU;
        };
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

    private String formatPrizeTotal(long total) {
        if (total >= 1_000_000) {
            double mio = total / 1_000_000.0;
            return String.format("%.1f Mio. €", mio).replace('.', ',');
        }
        return String.format("%,d €", total);
    }

    private String formatAvg(double avg) {
        if (avg == Math.floor(avg)) {
            return String.format("%,d", (long) avg);
        }
        return String.format("%.1f", avg).replace('.', ',');
    }

    private static class FooterEvent extends PdfPageEventHelper {
        private final BaseFont bf;
        private PdfTemplate total;
        private int pageCount;

        FooterEvent(BaseFont bf) {
            this.bf = bf;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            total = writer.getDirectContent().createTemplate(50, 12);
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            pageCount++;
            PdfContentByte cb = writer.getDirectContent();
            cb.saveState();
            float left = document.leftMargin();
            float right = writer.getPageSize().getWidth() - document.rightMargin();
            float y = 30;

            cb.setLineWidth(0.5f);
            cb.setColorStroke(OUTER);
            cb.moveTo(left, y + 10);
            cb.lineTo(right, y + 10);
            cb.stroke();

            Font font = new Font(bf, 8, Font.NORMAL, FAINT);
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,
                new Phrase("FFL — Fantasy Football League", font), left, y, 0);

            String prefix = "Seite " + pageCount + " von ";
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                new Phrase(prefix, font), right, y, 0);
            float prefixWidth = bf.getWidthPoint(prefix, 8);
            cb.addTemplate(total, right - prefixWidth, y);
            cb.restoreState();
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            total.beginText();
            total.setFontAndSize(bf, 8);
            total.setColorFill(FAINT);
            total.showText(String.valueOf(pageCount));
            total.endText();
        }
    }
}
