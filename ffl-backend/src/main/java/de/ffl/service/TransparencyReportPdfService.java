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
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

import static de.ffl.service.SeasonTransparencyMailService.AllPlayerRowDto;
import static de.ffl.service.SeasonTransparencyMailService.ManagerSquadDto;
import static de.ffl.service.SeasonTransparencyMailService.PlayerRowDto;
import static de.ffl.service.SeasonTransparencyMailService.PositionGroupDto;

@Service
public class TransparencyReportPdfService {

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
    private static final Color SECTION = new Color(120, 113, 108);

    public byte[] generatePdf(String seasonName, int managerCount,
                              List<ManagerSquadDto> squads, List<AllPlayerRowDto> allPlayers) {
        String safeName = seasonName != null && !seasonName.isBlank() ? seasonName : "Aktuelle Saison";
        try {
            BaseFont bf = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            BaseFont bfBold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);

            Font eyebrowFont = new Font(bf, 8, Font.NORMAL, BANNER_EYEBROW);
            Font titleFont = new Font(bfBold, 22, Font.NORMAL, BANNER_TITLE);
            Font subFont = new Font(bf, 12, Font.NORMAL, BANNER_SUB);
            Font metaFont = new Font(bf, 9, Font.NORMAL, BANNER_EYEBROW);
            Font sectionFont = new Font(bfBold, 11, Font.NORMAL, SECTION);
            Font managerFont = new Font(bfBold, 12, Font.NORMAL, TEXT);
            Font groupFont = new Font(bfBold, 9, Font.NORMAL, ACCENT);
            Font headerFont = new Font(bfBold, 9, Font.NORMAL, BANNER_TITLE);
            Font cellFont = new Font(bf, 9, Font.NORMAL, TEXT);
            Font cellBold = new Font(bfBold, 9, Font.NORMAL, TEXT);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 36, 36, 64, 48);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new FooterEvent(bf));
            document.open();

            document.add(headerBand(safeName, managerCount, eyebrowFont, titleFont, subFont, metaFont));
            document.add(sectionTitle("Alle teilnehmenden Manager", sectionFont));
            for (ManagerSquadDto squad : squads) {
                document.add(managerTitle(squad, managerFont));
                document.add(managerSquad(squad, groupFont, headerFont, cellFont));
            }
            document.add(sectionTitle("Alle verwendeten Spieler", sectionFont));
            document.add(allPlayersTable(allPlayers, headerFont, cellFont, cellBold));
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF-Erzeugung fehlgeschlagen: " + e.getMessage(), e);
        }
    }

    private PdfPTable headerBand(String seasonName, int managerCount,
                                 Font eyebrowFont, Font titleFont, Font subFont, Font metaFont) {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.setSpacingAfter(16);

        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(BANNER);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(28);
        cell.setPaddingTop(24);
        cell.setPaddingBottom(24);
        cell.addElement(paragraph("FFL · FANTASY FOOTBALL LEAGUE", eyebrowFont, 6));
        cell.addElement(paragraph("Transparenz-Report", titleFont, 4));
        cell.addElement(paragraph("Saison " + seasonName, subFont, 6));
        cell.addElement(paragraph(managerCount + " teilnehmende Manager", metaFont, 0));

        table.addCell(cell);
        return table;
    }

    private Paragraph sectionTitle(String text, Font font) {
        Paragraph p = new Paragraph(text, font);
        p.setSpacingBefore(18);
        p.setSpacingAfter(8);
        return p;
    }

    private Paragraph managerTitle(ManagerSquadDto squad, Font managerFont) {
        String title = squad.number() + ".) Spieler von " + squad.displayName();
        if (squad.login() != null && !squad.login().isBlank()) {
            title += " (" + squad.login() + ")";
        }
        Paragraph p = new Paragraph(title, managerFont);
        p.setSpacingBefore(10);
        p.setSpacingAfter(4);
        return p;
    }

    private PdfPTable managerSquad(ManagerSquadDto squad, Font groupFont,
                                   Font headerFont, Font cellFont) {
        PdfPTable squadTable = new PdfPTable(new float[]{0.7f, 3.8f, 2.9f, 1.6f});
        squadTable.setWidthPercentage(100);
        squadTable.setSpacingAfter(12);

        String[] headers = {"Pos.", "Spieler", "Verein", "Marktwert"};
        for (int i = 0; i < headers.length; i++) {
            PdfPCell h = new PdfPCell(new Phrase(headers[i], headerFont));
            h.setBackgroundColor(ACCENT);
            h.setBorder(Rectangle.NO_BORDER);
            h.setPadding(7);
            if (i == 3) {
                h.setHorizontalAlignment(Element.ALIGN_RIGHT);
            }
            squadTable.addCell(h);
        }
        squadTable.setHeaderRows(1);

        for (PositionGroupDto group : squad.positionGroups()) {
            PdfPCell groupCell = new PdfPCell(new Phrase(group.label(), new Font(groupFont.getBaseFont(),
                groupFont.getSize(), groupFont.getStyle(), parseColor(group.colorHex()))));
            groupCell.setColspan(4);
            groupCell.setBackgroundColor(ZEBRA);
            groupCell.setBorder(Rectangle.BOTTOM);
            groupCell.setBorderWidthBottom(0.5f);
            groupCell.setBorderColorBottom(ROW_LINE);
            groupCell.setPadding(6);
            squadTable.addCell(groupCell);

            for (PlayerRowDto player : group.players()) {
                squadTable.addCell(dataCell(player.posLabel(), cellFont, Element.ALIGN_CENTER, CARD));
                squadTable.addCell(dataCell(player.name(), cellFont, Element.ALIGN_LEFT, CARD));
                squadTable.addCell(dataCell(player.teamName(), cellFont, Element.ALIGN_LEFT, CARD));
                squadTable.addCell(dataCell(player.prizeFormatted(), cellFont, Element.ALIGN_RIGHT, CARD));
            }
        }
        return squadTable;
    }

    private PdfPTable allPlayersTable(List<AllPlayerRowDto> allPlayers, Font headerFont,
                                      Font cellFont, Font cellBold) {
        float[] widths = {0.8f, 3.9f, 2.7f, 1.5f, 1.2f};
        PdfPTable table = new PdfPTable(widths);
        table.setWidthPercentage(100);

        String[] headers = {"Pos.", "Spieler", "Verein", "Marktwert", "Aufgestellt"};
        int[] rightAligned = {3, 4};
        for (int i = 0; i < headers.length; i++) {
            PdfPCell h = new PdfPCell(new Phrase(headers[i], headerFont));
            h.setBackgroundColor(ACCENT);
            h.setBorder(Rectangle.NO_BORDER);
            h.setPadding(7);
            if (i == 0) {
                h.setHorizontalAlignment(Element.ALIGN_CENTER);
            } else if (contains(rightAligned, i)) {
                h.setHorizontalAlignment(Element.ALIGN_RIGHT);
            }
            table.addCell(h);
        }
        table.setHeaderRows(1);

        int row = 0;
        for (AllPlayerRowDto p : allPlayers) {
            row++;
            Color bg = row % 2 == 0 ? ZEBRA : CARD;
            table.addCell(dataCell(p.positionLabel(), cellFont, Element.ALIGN_CENTER, bg));
            table.addCell(dataCell(p.name(), cellBold, Element.ALIGN_LEFT, bg));
            table.addCell(dataCell(p.teamName(), cellFont, Element.ALIGN_LEFT, bg));
            table.addCell(dataCell(p.prizeFormatted(), cellFont, Element.ALIGN_RIGHT, bg));
            table.addCell(dataCell(p.managerCount() + "×", cellFont, Element.ALIGN_RIGHT, bg));
        }
        return table;
    }

    private boolean contains(int[] arr, int value) {
        for (int i : arr) {
            if (i == value) return true;
        }
        return false;
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

    public String buildFilename(String seasonName) {
        String safeName = seasonName != null ? seasonName : "Aktuelle Saison";
        String safe = safeName.replaceAll("[^a-zA-Z0-9]+", "-").replaceAll("-+", "-").replaceAll("^-|-$", "");
        return "Transparenz-Report-Saison-" + safe + ".pdf";
    }

    private Color parseColor(String hex) {
        try {
            if (hex == null || hex.isBlank() || !hex.startsWith("#") || hex.length() != 7) return ACCENT;
            return new Color(Integer.parseInt(hex.substring(1), 16));
        } catch (NumberFormatException e) {
            return ACCENT;
        }
    }

    private Paragraph paragraph(String text, Font font, float spacingAfter) {
        Paragraph p = new Paragraph(text, font);
        p.setSpacingAfter(spacingAfter);
        return p;
    }

    private static class FooterEvent extends PdfPageEventHelper {
        private final BaseFont bf;
        private int pageCount;

        FooterEvent(BaseFont bf) {
            this.bf = bf;
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
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                new Phrase("Seite " + pageCount, font), right, y, 0);
            cb.restoreState();
        }
    }
}
