package de.ffl.service;

import de.ffl.domain.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SeasonReportHtmlBuilder {

    private static final String BODY_BG = "#f5f5f7";
    private static final String CARD_BG = "#ffffff";
    private static final String TEXT_PRIMARY = "#0a0a0a";
    private static final String TEXT_SECONDARY = "#1a3a5c";
    private static final String BORDER = "#c0c0c0";
    private static final String GOLD = "#c9a66b";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public String buildReportHtml(Season season,
                                   List<ManagerRank> managerRanks,
                                   List<PlayerRank> playerRanks,
                                   List<PrizePayout> payouts,
                                   PrizeDistributionLog distributionLog,
                                   List<ManagerGroup> groups,
                                   Map<Long, List<ManagerRank>> groupRankings,
                                   List<Manager> managers,
                                   List<EmailAddress> emailAddresses,
                                   List<String> managerEmails) {

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:").append(BODY_BG).append(";color:").append(TEXT_PRIMARY)
          .append(";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px;margin:0;\">");
        sb.append("<div style=\"max-width:900px;margin:0 auto;\">");

        sb.append("<h1 style=\"color:").append(GOLD).append(";font-size:24px;font-weight:700;margin:0 0 6px 0;\">")
          .append("Saison-Report: ").append(escape(season.getName())).append("</h1>");
        sb.append("<p style=\"color:#6b7280;font-size:13px;margin:0 0 24px 0;\">")
          .append("Vollst\u00e4ndige Datensicherung vor Saison-Reset</p>");

        buildSeasonDataSection(sb, season);
        buildBankSection(sb, season);
        if (!payouts.isEmpty()) {
            buildPrizeDistributionSection(sb, season, payouts, distributionLog);
        }
        buildManagerRankingSection(sb, managerRanks);
        buildPlayerRankingSection(sb, playerRanks);
        buildGroupsSection(sb, groups, groupRankings);
        buildManagerSquadsSection(sb, managers, season);
        buildEmailSection(sb, emailAddresses, managerEmails);

        sb.append("</div></body></html>");
        return sb.toString();
    }

    private void buildSeasonDataSection(StringBuilder sb, Season season) {
        sectionHeader(sb, "1. Saisondaten");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid ").append(BORDER).append(";border-radius:8px;overflow:hidden;margin-bottom:24px;\">");
        infoRow(sb, "Name", escape(season.getName()), 0);
        infoRow(sb, "Budget", season.getBudget() != null ? String.format("%,d", season.getBudget()).replace(",", ".") + " \u20ac" : "-", 1);
        infoRow(sb, "Saisonphase", translateState(season.getSeasonState()), 2);
        infoRow(sb, "Saisonstart", season.getSeasonStartDate() != null ? season.getSeasonStartDate().format(DATE_FMT) : "-", 3);
        infoRow(sb, "Startzeit", season.getSeasonStartTime() != null ? season.getSeasonStartTime().format(TIME_FMT) + " Uhr" : "-", 4);
        infoRow(sb, "Start R\u00fcckrunde (Spieltag)", season.getStartRoundRueckrunde() != null ? season.getStartRoundRueckrunde().toString() : "16", 5);
        infoRow(sb, "Aktueller Spieltag", season.getCurrentMatchday() != null ? season.getCurrentMatchday().toString() : "-", 6);
        infoRow(sb, "Spieleinsatz", formatCurrency(season.getSpieleinsatzEuro()), 7);
        infoRow(sb, "Serverkosten", formatCurrency(season.getServerkostenEuro()), 8);
        infoRow(sb, "Anzahl Spielleiter", season.getAnzahlSpielleiter() != null ? season.getAnzahlSpielleiter().toString() : "-", 9);
        infoRow(sb, "Gewinn 1. Platz", season.getGewinnErsterPlatzProzent() != null ? season.getGewinnErsterPlatzProzent() + "%" : "-", 10);
        infoRow(sb, "Gewinn letzter Platz", formatCurrency(season.getGewinnLetzterPlatzEuro()), 11);
        sb.append("</table>");
    }

    private void buildBankSection(StringBuilder sb, Season season) {
        sectionHeader(sb, "2. Bankverbindung");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid ").append(BORDER).append(";border-radius:8px;overflow:hidden;margin-bottom:24px;\">");
        infoRow(sb, "PayPal-Link", season.getPaypalLink() != null ? escape(season.getPaypalLink()) : "-", 0);
        infoRow(sb, "Kontoinhaber", season.getKontoinhaber() != null ? escape(season.getKontoinhaber()) : "-", 1);
        infoRow(sb, "Bankname", season.getBankName() != null ? escape(season.getBankName()) : "-", 2);
        infoRow(sb, "IBAN", season.getIban() != null ? escape(season.getIban()) : "-", 3);
        infoRow(sb, "BIC", season.getBic() != null ? escape(season.getBic()) : "-", 4);
        sb.append("</table>");
    }

    private void buildPrizeDistributionSection(StringBuilder sb, Season season, List<PrizePayout> payouts, PrizeDistributionLog log) {
        sectionHeader(sb, "3. Gewinnaussch\u00fcttung");

        if (log != null) {
            sb.append("<div style=\"font-size:13px;margin-bottom:16px;background:").append(CARD_BG)
              .append(";border:1px solid ").append(BORDER).append(";border-radius:8px;padding:12px;\">");
            sb.append("<strong style=\"color:").append(TEXT_SECONDARY).append(";\">Berechnungsparameter:</strong><br>");
            sb.append("Gesamtteilnehmer: ").append(log.getTotalParticipants()).append(" | ");
            sb.append("Zahlende: ").append(log.getPayingParticipants()).append(" | ");
            sb.append("Eins\u00e4tze: ").append(formatCurrency(log.getTotalStakes())).append(" | ");
            sb.append("Serverkosten: ").append(formatCurrency(log.getServerCosts())).append(" | ");
            sb.append("Budget: ").append(formatCurrency(log.getTotalBudget())).append(" | ");
            sb.append("Gewinnr\u00e4nge: ").append(log.getNumWinningRanks());
            sb.append("</div>");
        }

        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid ").append(BORDER).append(";border-radius:8px;overflow:hidden;margin-bottom:24px;\">");
        tableHeaderRow(sb, "Platz", "Manager", "Vorname", "Nachname", "E-Mail", "Punkte", "Gewinn", "Status", "Kommentar");

        int rowIndex = 0;
        for (PrizePayout p : payouts) {
            String rowBg = rowIndex % 2 == 0 ? CARD_BG : "#f5f5f5";
            String name = p.getManager() != null ? escape(p.getManager().getName()) : "-";
            String firstName = p.getManager() != null && p.getManager().getUser() != null && p.getManager().getUser().getFirstName() != null ? escape(p.getManager().getUser().getFirstName()) : "-";
            String lastName = p.getManager() != null && p.getManager().getUser() != null && p.getManager().getUser().getLastName() != null ? escape(p.getManager().getUser().getLastName()) : "-";
            String email = p.getManager() != null && p.getManager().getUser() != null ? escape(p.getManager().getUser().getEmail()) : "-";
            String prize = p.getPrizeAmount() != null ? formatCurrency(p.getPrizeAmount()) : "-";
            String status = p.getPayoutStatus() == PayoutStatus.PAID ? "Ausbezahlt" : "Offen";
            String statusColor = p.getPayoutStatus() == PayoutStatus.PAID ? "#36b37e" : "#ff5630";
            String comment = p.getComment() != null && !p.getComment().isBlank() ? escape(p.getComment()) : "-";

            sb.append("<tr style=\"background:").append(rowBg).append(";\">");
            sb.append(td("center", "font-weight:600;")).append(p.getPosition()).append(".</td>");
            sb.append(td("left", "")).append(name).append("</td>");
            sb.append(td("left", "")).append(firstName).append("</td>");
            sb.append(td("left", "")).append(lastName).append("</td>");
            sb.append(td("left", "font-size:12px;")).append(email).append("</td>");
            sb.append(td("right", "")).append(nz(p.getPointsTotal())).append("</td>");
            sb.append(td("right", "color:" + GOLD + ";font-weight:700;")).append(prize).append("</td>");
            sb.append(td("center", "color:" + statusColor + ";font-weight:600;font-size:12px;")).append(status).append("</td>");
            sb.append(td("left", "font-size:11px;max-width:200px;word-break:break-word;")).append(comment).append("</td>");
            sb.append("</tr>");
            rowIndex++;
        }
        sb.append("</table>");
    }

    private void buildManagerRankingSection(StringBuilder sb, List<ManagerRank> ranks) {
        sectionHeader(sb, "4. Manager-Rangliste (Endstand)");

        if (ranks.isEmpty()) {
            sb.append("<p style=\"color:#6b7280;font-size:13px;margin-bottom:24px;\">Keine Ranking-Daten vorhanden.</p>");
            return;
        }

        List<ManagerRank> sorted = ranks.stream()
            .sorted(Comparator.comparingInt(ManagerRank::getPositionTotal))
            .collect(Collectors.toList());

        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid ").append(BORDER).append(";border-radius:8px;overflow:hidden;margin-bottom:24px;\">");
        tableHeaderRow(sb, "Platz", "Manager", "Vorname", "Nachname", "Punkte gesamt", "Punkte letzter Spieltag");

        int rowIndex = 0;
        for (ManagerRank r : sorted) {
            String rowBg = rowIndex % 2 == 0 ? CARD_BG : "#f5f5f5";
            String name = r.getManager() != null ? escape(r.getManager().getName()) : "-";
            String firstName = r.getManager() != null && r.getManager().getUser() != null && r.getManager().getUser().getFirstName() != null ? escape(r.getManager().getUser().getFirstName()) : "-";
            String lastName = r.getManager() != null && r.getManager().getUser() != null && r.getManager().getUser().getLastName() != null ? escape(r.getManager().getUser().getLastName()) : "-";

            sb.append("<tr style=\"background:").append(rowBg).append(";\">");
            sb.append(td("center", "font-weight:600;")).append(r.getPositionTotal()).append(".</td>");
            sb.append(td("left", "")).append(name).append("</td>");
            sb.append(td("left", "")).append(firstName).append("</td>");
            sb.append(td("left", "")).append(lastName).append("</td>");
            sb.append(td("right", "font-weight:600;")).append(nz(r.getPointsTotal())).append("</td>");
            sb.append(td("right", "")).append(nz(r.getPointsRound())).append("</td>");
            sb.append("</tr>");
            rowIndex++;
        }
        sb.append("</table>");
    }

    private void buildPlayerRankingSection(StringBuilder sb, List<PlayerRank> ranks) {
        sectionHeader(sb, "5. Spieler-Rangliste (Endstand)");

        if (ranks.isEmpty()) {
            sb.append("<p style=\"color:#6b7280;font-size:13px;margin-bottom:24px;\">Keine Ranking-Daten vorhanden.</p>");
            return;
        }

        List<PlayerRank> sorted = ranks.stream()
            .sorted(Comparator.comparingInt(PlayerRank::getPositionTotal))
            .collect(Collectors.toList());

        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid ").append(BORDER).append(";border-radius:8px;overflow:hidden;margin-bottom:24px;\">");
        tableHeaderRow(sb, "Platz", "Spieler", "Position", "Verein", "Punkte gesamt", "Eins\u00e4tze");

        int rowIndex = 0;
        for (PlayerRank r : sorted) {
            String rowBg = rowIndex % 2 == 0 ? CARD_BG : "#f5f5f5";
            Player p = r.getPlayer();
            String playerName = p != null ? escape(p.getNameKicker()) : "-";
            String pos = p != null ? translatePosition(p.getPosition()) : "-";
            String team = p != null && p.getTeams() != null && !p.getTeams().isEmpty()
                ? escape(p.getTeams().get(0).getShortName() != null ? p.getTeams().get(0).getShortName() : p.getTeams().get(0).getName())
                : "-";

            sb.append("<tr style=\"background:").append(rowBg).append(";\">");
            sb.append(td("center", "font-weight:600;")).append(r.getPositionTotal()).append(".</td>");
            sb.append(td("left", "")).append(playerName).append("</td>");
            sb.append(td("center", "")).append(pos).append("</td>");
            sb.append(td("left", "")).append(team).append("</td>");
            sb.append(td("right", "font-weight:600;")).append(nz(r.getPointsTotal())).append("</td>");
            sb.append(td("right", "")).append(nz(r.getNumberMatches())).append("</td>");
            sb.append("</tr>");
            rowIndex++;
        }
        sb.append("</table>");
    }

    private void buildGroupsSection(StringBuilder sb, List<ManagerGroup> groups, Map<Long, List<ManagerRank>> groupRankings) {
        sectionHeader(sb, "6. Gruppen");

        if (groups.isEmpty()) {
            sb.append("<p style=\"color:#6b7280;font-size:13px;margin-bottom:24px;\">Keine Gruppen vorhanden.</p>");
            return;
        }

        for (ManagerGroup group : groups) {
            sb.append("<h4 style=\"color:").append(TEXT_SECONDARY).append(";font-size:14px;font-weight:700;margin:16px 0 8px 0;\">")
              .append(escape(group.getName()));
            if (group.getDescription() != null && !group.getDescription().isBlank()) {
                sb.append(" <span style=\"font-weight:400;color:#6b7280;font-size:12px;\">(").append(escape(group.getDescription())).append(")</span>");
            }
            sb.append("</h4>");

            List<ManagerRank> grpRanks = groupRankings.get(group.getId());
            if (grpRanks != null && !grpRanks.isEmpty()) {
                List<ManagerRank> sorted = grpRanks.stream()
                    .sorted(Comparator.comparingInt(ManagerRank::getPointsTotal).reversed())
                    .collect(Collectors.toList());

                sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;border:1px solid ").append(BORDER).append(";border-radius:8px;overflow:hidden;margin-bottom:16px;\">");
                tableHeaderRow(sb, "Platz", "Manager", "Punkte gesamt");

                int rowIndex = 0;
                int pos = 1;
                for (ManagerRank r : sorted) {
                    String rowBg = rowIndex % 2 == 0 ? CARD_BG : "#f5f5f5";
                    String name = r.getManager() != null ? escape(r.getManager().getName()) : "-";
                    sb.append("<tr style=\"background:").append(rowBg).append(";\">");
                    sb.append(td("center", "font-weight:600;")).append(pos).append(".</td>");
                    sb.append(td("left", "")).append(name).append("</td>");
                    sb.append(td("right", "font-weight:600;")).append(nz(r.getPointsTotal())).append("</td>");
                    sb.append("</tr>");
                    pos++;
                    rowIndex++;
                }
                sb.append("</table>");
            } else {
                sb.append("<p style=\"color:#6b7280;font-size:12px;\">Mitglieder: ");
                if (group.getManagers() != null && !group.getManagers().isEmpty()) {
                    sb.append(group.getManagers().stream()
                        .map(m -> escape(m.getName()))
                        .collect(Collectors.joining(", ")));
                }
                sb.append("</p>");
            }
        }
        sb.append("<div style=\"margin-bottom:24px;\"></div>");
    }

    private void buildManagerSquadsSection(StringBuilder sb, List<Manager> managers, Season season) {
        sectionHeader(sb, "7. Manager-Kader");

        if (managers.isEmpty()) {
            sb.append("<p style=\"color:#6b7280;font-size:13px;margin-bottom:24px;\">Keine Manager vorhanden.</p>");
            return;
        }

        List<Manager> sorted = managers.stream()
            .sorted(Comparator.comparing(m -> m.getName() != null ? m.getName() : "", String.CASE_INSENSITIVE_ORDER))
            .collect(Collectors.toList());

        for (Manager m : sorted) {
            String name = m.getName() != null ? escape(m.getName()) : "Unbekannt";
            String email = m.getUser() != null ? escape(m.getUser().getEmail()) : "-";
            String payment = m.getPaymentState() == PaymentState.PAID ? "Bezahlt" : "Nicht bezahlt";
            String paymentColor = m.getPaymentState() == PaymentState.PAID ? "#36b37e" : "#ff5630";

            sb.append("<div style=\"background:").append(CARD_BG).append(";border:1px solid ").append(BORDER)
              .append(";border-radius:8px;padding:12px;margin-bottom:12px;\">");
            sb.append("<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">");
            sb.append("<strong style=\"color:").append(TEXT_SECONDARY).append(";font-size:14px;\">").append(name).append("</strong>");
            sb.append("<span style=\"font-size:12px;\">").append(email)
              .append(" | Budget: ").append(m.getBudget() != null ? String.format("%,d", m.getBudget()).replace(",", ".") : "-")
              .append(" | <span style=\"color:").append(paymentColor).append(";\">").append(payment).append("</span></span>");
            sb.append("</div>");

            sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:12px;border-collapse:collapse;\">");
            sb.append("<tr style=\"background:#eee;color:").append(TEXT_SECONDARY).append(";font-size:11px;text-transform:uppercase;\">");
            sb.append("<th align=\"left\" style=\"padding:4px 6px;\">Slot</th>");
            sb.append("<th align=\"left\" style=\"padding:4px 6px;\">Spieler</th>");
            sb.append("<th align=\"center\" style=\"padding:4px 6px;\">Position</th>");
            sb.append("<th align=\"right\" style=\"padding:4px 6px;\">Preis</th>");
            sb.append("</tr>");

            int idx = 0;
            playerSlotRow(sb, "Torwart", m.getPlayerGoalkeeper(), idx++);
            playerSlotRow(sb, "Abwehr 1", m.getPlayerDefender1(), idx++);
            playerSlotRow(sb, "Abwehr 2", m.getPlayerDefender2(), idx++);
            playerSlotRow(sb, "Abwehr 3", m.getPlayerDefender3(), idx++);
            playerSlotRow(sb, "Mittelfeld 1", m.getPlayerMidfield1(), idx++);
            playerSlotRow(sb, "Mittelfeld 2", m.getPlayerMidfield2(), idx++);
            playerSlotRow(sb, "Mittelfeld 3", m.getPlayerMidfield3(), idx++);
            playerSlotRow(sb, "Sturm 1", m.getPlayerStriker1(), idx++);
            playerSlotRow(sb, "Sturm 2", m.getPlayerStriker2(), idx++);
            playerSlotRow(sb, "Sturm 3", m.getPlayerStriker3(), idx++);
            playerSlotRow(sb, "Freie Wahl", m.getPlayerFreeChoice(), idx++);

            boolean hasExchanges = m.getPlayerExchangedOld1() != null || m.getPlayerExchangedOld2() != null || m.getPlayerExchangedOld3() != null;
            if (hasExchanges) {
                sb.append("<tr><td colspan=\"4\" style=\"padding:6px 6px 2px 6px;font-size:11px;color:").append(TEXT_SECONDARY).append(";font-weight:600;\">Transfers (R\u00fcckrunde)</td></tr>");
                exchangeRow(sb, m.getPlayerExchangedOld1(), m.getPlayerExchangedNew1(), idx++);
                exchangeRow(sb, m.getPlayerExchangedOld2(), m.getPlayerExchangedNew2(), idx++);
                exchangeRow(sb, m.getPlayerExchangedOld3(), m.getPlayerExchangedNew3(), idx++);
            }

            sb.append("</table></div>");
        }
        sb.append("<div style=\"margin-bottom:24px;\"></div>");
    }

    private void buildEmailSection(StringBuilder sb, List<EmailAddress> emailAddresses, List<String> managerEmails) {
        sectionHeader(sb, "8. E-Mail-Adressen");

        Set<String> allEmails = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        for (String email : managerEmails) {
            if (email != null && !email.isBlank()) allEmails.add(email);
        }

        if (!allEmails.isEmpty()) {
            sb.append("<h4 style=\"color:").append(TEXT_SECONDARY).append(";font-size:13px;font-weight:600;margin:0 0 8px 0;\">Manager-E-Mails (").append(allEmails.size()).append(")</h4>");
            sb.append("<div style=\"background:").append(CARD_BG).append(";border:1px solid ").append(BORDER).append(";border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;word-break:break-all;\">");
            sb.append(allEmails.stream().map(SeasonReportHtmlBuilder::escape).collect(Collectors.joining("; ")));
            sb.append("</div>");
        }

        if (!emailAddresses.isEmpty()) {
            sb.append("<h4 style=\"color:").append(TEXT_SECONDARY).append(";font-size:13px;font-weight:600;margin:0 0 8px 0;\">Adressbuch (").append(emailAddresses.size()).append(")</h4>");
            sb.append("<div style=\"background:").append(CARD_BG).append(";border:1px solid ").append(BORDER).append(";border-radius:8px;padding:12px;margin-bottom:24px;font-size:13px;word-break:break-all;\">");
            sb.append(emailAddresses.stream().map(e -> escape(e.getEmail())).collect(Collectors.joining("; ")));
            sb.append("</div>");
        }
    }

    private void playerSlotRow(StringBuilder sb, String slot, Player player, int idx) {
        String bg = idx % 2 == 0 ? CARD_BG : "#f9f9f9";
        sb.append("<tr style=\"background:").append(bg).append(";\">");
        sb.append("<td style=\"padding:4px 6px;color:#6b7280;\">").append(slot).append("</td>");
        if (player != null) {
            sb.append("<td style=\"padding:4px 6px;\">").append(escape(player.getNameKicker())).append("</td>");
            sb.append("<td align=\"center\" style=\"padding:4px 6px;\">").append(translatePosition(player.getPosition())).append("</td>");
            sb.append("<td align=\"right\" style=\"padding:4px 6px;\">").append(player.getPrize() != null ? String.format("%,d", player.getPrize()).replace(",", ".") : "-").append("</td>");
        } else {
            sb.append("<td style=\"padding:4px 6px;color:#999;\">-</td>");
            sb.append("<td style=\"padding:4px 6px;\"></td>");
            sb.append("<td style=\"padding:4px 6px;\"></td>");
        }
        sb.append("</tr>");
    }

    private void exchangeRow(StringBuilder sb, Player oldPlayer, Player newPlayer, int idx) {
        if (oldPlayer == null && newPlayer == null) return;
        String bg = idx % 2 == 0 ? CARD_BG : "#f9f9f9";
        sb.append("<tr style=\"background:").append(bg).append(";\">");
        sb.append("<td style=\"padding:4px 6px;color:#ff5630;font-size:11px;\">Raus</td>");
        sb.append("<td style=\"padding:4px 6px;color:#ff5630;\">").append(oldPlayer != null ? escape(oldPlayer.getNameKicker()) : "-").append("</td>");
        sb.append("<td style=\"padding:4px 6px;color:#36b37e;font-size:11px;\">Rein: ").append(newPlayer != null ? escape(newPlayer.getNameKicker()) : "-").append("</td>");
        sb.append("<td style=\"padding:4px 6px;\"></td>");
        sb.append("</tr>");
    }

    private void sectionHeader(StringBuilder sb, String title) {
        sb.append("<hr style=\"border:none;border-top:2px solid ").append(GOLD).append(";margin:24px 0 16px 0;\">");
        sb.append("<h2 style=\"color:").append(TEXT_SECONDARY).append(";font-size:16px;font-weight:700;margin:0 0 12px 0;\">").append(title).append("</h2>");
    }

    private void infoRow(StringBuilder sb, String label, String value, int idx) {
        String bg = idx % 2 == 0 ? CARD_BG : "#f5f5f5";
        sb.append("<tr style=\"background:").append(bg).append(";\">");
        sb.append("<td style=\"padding:8px 12px;font-weight:600;color:").append(TEXT_SECONDARY).append(";width:40%;border-bottom:1px solid ").append(BORDER).append(";\">").append(label).append("</td>");
        sb.append("<td style=\"padding:8px 12px;border-bottom:1px solid ").append(BORDER).append(";\">").append(value).append("</td>");
        sb.append("</tr>");
    }

    private void tableHeaderRow(StringBuilder sb, String... headers) {
        sb.append("<tr style=\"background:").append(CARD_BG).append(";color:").append(TEXT_SECONDARY).append(";font-size:11px;text-transform:uppercase;letter-spacing:0.5px;\">");
        for (String h : headers) {
            boolean isNumeric = h.contains("Punkte") || h.contains("Gewinn") || h.contains("Eins\u00e4tze");
            String align = isNumeric ? "right" : (h.equals("Platz") || h.equals("Status") || h.equals("Position") ? "center" : "left");
            sb.append("<th align=\"").append(align).append("\" style=\"padding:10px 8px;font-weight:600;border-bottom:1px solid ").append(BORDER).append(";\">").append(h).append("</th>");
        }
        sb.append("</tr>");
    }

    private String td(String align, String extraStyle) {
        return "<td align=\"" + align + "\" style=\"padding:8px;border-bottom:1px solid " + BORDER + ";" + extraStyle + "\">";
    }

    private String translateState(SeasonState state) {
        if (state == null) return "-";
        return switch (state) {
            case BEFORE_SEASON -> "Vor Saison";
            case RUNNING_HINRUNDE -> "Hinrunde";
            case RUNNING_RUECKRUNDE -> "R\u00fcckrunde";
        };
    }

    private String translatePosition(Position pos) {
        if (pos == null) return "-";
        return switch (pos) {
            case GOALKEEPER -> "TW";
            case DEFENDER -> "AW";
            case MIDFIELD -> "MF";
            case STRIKER -> "ST";
        };
    }

    private String formatCurrency(BigDecimal value) {
        if (value == null) return "-";
        return String.format("%,.2f \u20ac", value).replace(",", "X").replace(".", ",").replace("X", ".");
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String nz(Integer v) {
        return v != null ? String.valueOf(v) : "0";
    }
}
