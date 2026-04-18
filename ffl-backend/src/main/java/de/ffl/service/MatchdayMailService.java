package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerRank;
import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Round;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.RoundRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Orchestriert den Versand der personalisierten Spieltagsmail:
 * 1) Sammelt Spieltagsdaten, 2) holt LLM-Einleitung, 3) baut HTML pro Manager,
 * 4) versendet per Gmail-SMTP, 5) streamt Fortschritt per SSE analog SeasonService.
 */
@Service
public class MatchdayMailService {

    private final SystemConfigRepository systemConfigRepository;
    private final SeasonRepository seasonRepository;
    private final ManagerRepository managerRepository;
    private final ManagerRankRepository managerRankRepository;
    private final PlayerRankRepository playerRankRepository;
    private final RoundRepository roundRepository;
    private final LlmService llmService;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    public MatchdayMailService(SystemConfigRepository systemConfigRepository,
                               SeasonRepository seasonRepository,
                               ManagerRepository managerRepository,
                               ManagerRankRepository managerRankRepository,
                               PlayerRankRepository playerRankRepository,
                               RoundRepository roundRepository,
                               LlmService llmService) {
        this.systemConfigRepository = systemConfigRepository;
        this.seasonRepository = seasonRepository;
        this.managerRepository = managerRepository;
        this.managerRankRepository = managerRankRepository;
        this.playerRankRepository = playerRankRepository;
        this.roundRepository = roundRepository;
        this.llmService = llmService;
    }

    public SseEmitter streamMatchdayMail(Long seasonId, Integer roundNumber, List<Long> managerIds) {
        SseEmitter emitter = new SseEmitter(600_000L);
        executor.execute(() -> runMailJob(emitter, seasonId, roundNumber, managerIds));
        return emitter;
    }

    @Transactional(readOnly = true)
    protected void runMailJob(SseEmitter emitter, Long seasonId, Integer roundNumber, List<Long> managerIds) {
        try {
            send(emitter, "Lade Spieltags-Daten…");

            Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Saison " + seasonId + " nicht gefunden"));

            SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new RuntimeException("Keine Systemkonfiguration vorhanden"));

            if (config.getGmailSenderEmail() == null || config.getGmailSenderEmail().isBlank()
                || config.getGmailAppPassword() == null || config.getGmailAppPassword().isBlank()) {
                throw new RuntimeException("Gmail-Zugangsdaten sind nicht vollstaendig konfiguriert");
            }

            // --- Alle Manager der Saison fuer Tages-Ranking ---
            List<Manager> allManagersInSeason = managerRepository.findBySeasonIdWithPlayers(seasonId);
            List<Long> allManagerIds = allManagersInSeason.stream().map(Manager::getId).toList();

            List<ManagerRank> dayRanks = managerRankRepository.findByManagerIdInAndRoundNumber(
                allManagerIds, roundNumber);
            Map<Long, ManagerRank> dayRankByManagerId = new HashMap<>();
            for (ManagerRank mr : dayRanks) {
                dayRankByManagerId.put(mr.getManager().getId(), mr);
            }

            // --- Top-Scorer des Spieltags ---
            ManagerRank topScorerRank = dayRanks.stream()
                .max(Comparator.comparing(r -> Optional.ofNullable(r.getPointsRound()).orElse(0)))
                .orElse(null);
            String topScorerName = "-";
            Integer topScorerPoints = null;
            if (topScorerRank != null) {
                Manager m = allManagersInSeason.stream()
                    .filter(mm -> mm.getId().equals(topScorerRank.getManager().getId()))
                    .findFirst().orElse(null);
                if (m != null) {
                    topScorerName = buildManagerDisplayName(m);
                }
                topScorerPoints = topScorerRank.getPointsRound();
            }

            // --- LLM-Einleitung ---
            send(emitter, "Generiere LLM-Einleitung…");
            List<Map<String, Object>> managerPoints = new ArrayList<>();
            for (Manager m : allManagersInSeason) {
                ManagerRank mr = dayRankByManagerId.get(m.getId());
                if (mr == null) continue;
                Map<String, Object> entry = new HashMap<>();
                entry.put("name", buildManagerDisplayName(m));
                entry.put("pointsRound", mr.getPointsRound());
                entry.put("positionRound", mr.getPositionRound());
                entry.put("pointsTotal", mr.getPointsTotal());
                entry.put("positionTotal", mr.getPositionTotal());
                managerPoints.add(entry);
            }
            managerPoints.sort((a, b) -> Integer.compare(
                (Integer) b.getOrDefault("pointsRound", 0),
                (Integer) a.getOrDefault("pointsRound", 0)));

            Map<String, Object> summary = new HashMap<>();
            summary.put("saison", season.getName());
            summary.put("spieltag", roundNumber);
            summary.put("topScorer", topScorerName);
            summary.put("topScorerPoints", topScorerPoints);
            summary.put("managerPoints", managerPoints);

            String intro;
            try {
                intro = llmService.generateMatchdayIntro(
                    config.getOpenrouterApiKey(),
                    config.getOpenrouterModel(),
                    config.getMatchdayMailPrompt(),
                    summary);
                send(emitter, "LLM-Einleitung erhalten.");
            } catch (Exception e) {
                send(emitter, "⚠ LLM-Fehler, verwende Fallback-Einleitung: " + e.getMessage());
                intro = "Spieltag " + roundNumber + " in der Saison " + season.getName() + " ist abgeschlossen. "
                      + "Tagessieger: " + topScorerName
                      + (topScorerPoints != null ? " mit " + topScorerPoints + " Punkten" : "") + ".";
            }

            // --- Round-ID einmal aufloesen (um Lazy-Proxy auf PlayerRank.round zu vermeiden) ---
            Round round = roundRepository.findBySeasonIdAndNumber(seasonId, roundNumber)
                .orElseThrow(() -> new RuntimeException("Spieltag " + roundNumber + " in Saison " + seasonId + " nicht gefunden"));
            Long roundId = round.getId();

            // --- Spieler-Ranks fuer alle selektierten Manager auf einmal laden ---
            List<Long> allPlayerIds = new ArrayList<>();
            for (Long mid : managerIds) {
                Manager m = allManagersInSeason.stream().filter(x -> x.getId().equals(mid)).findFirst().orElse(null);
                if (m == null) continue;
                collectPlayerIds(m, allPlayerIds);
            }
            Map<Long, PlayerRank> playerRankByPlayerId = new HashMap<>();
            if (!allPlayerIds.isEmpty()) {
                List<PlayerRank> prs = playerRankRepository.findByPlayerIdInAndRoundId(allPlayerIds, roundId);
                for (PlayerRank pr : prs) {
                    playerRankByPlayerId.put(pr.getPlayer().getId(), pr);
                }
            }

            // --- Mailer konfigurieren ---
            JavaMailSenderImpl mailSender = buildMailSender(config);
            send(emitter, "Mail-Server verbunden (" + config.getGmailSmtpServer() + ":" + config.getGmailSmtpPort() + ")");

            // --- Versand pro selektierten Manager ---
            int sent = 0;
            int failed = 0;
            for (Long managerId : managerIds) {
                Manager manager = allManagersInSeason.stream()
                    .filter(m -> m.getId().equals(managerId))
                    .findFirst().orElse(null);
                if (manager == null) {
                    send(emitter, "✗ Manager-ID " + managerId + " nicht in Saison gefunden");
                    failed++;
                    continue;
                }
                String recipientEmail = manager.getUser() != null ? manager.getUser().getEmail() : null;
                if (recipientEmail == null || recipientEmail.isBlank()) {
                    send(emitter, "✗ " + buildManagerDisplayName(manager) + " hat keine Mailadresse");
                    failed++;
                    continue;
                }
                try {
                    String html = buildHtmlForManager(manager, season, roundNumber, intro,
                        dayRankByManagerId.get(managerId), topScorerName, topScorerPoints,
                        playerRankByPlayerId);

                    MimeMessage msg = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                    helper.setFrom(config.getGmailSenderEmail());
                    helper.setTo(recipientEmail);
                    helper.setSubject("FFL " + season.getName() + " — Spieltag " + roundNumber);
                    helper.setText(html, true);

                    mailSender.send(msg);
                    send(emitter, "✓ " + buildManagerDisplayName(manager) + " (" + recipientEmail + ")");
                    sent++;
                } catch (Exception e) {
                    send(emitter, "✗ " + buildManagerDisplayName(manager) + " (" + recipientEmail + "): " + e.getMessage());
                    failed++;
                }
            }

            send(emitter, "Fertig: " + sent + " versendet, " + failed + " fehlgeschlagen.");
            emitter.send(SseEmitter.event().name("complete").data(""));
            emitter.complete();
        } catch (Exception e) {
            try {
                emitter.send(SseEmitter.event().name("error").data("FEHLER: " + e.getMessage()));
            } catch (IOException ignored) {
            }
            emitter.completeWithError(e);
        }
    }

    private void send(SseEmitter emitter, String message) throws IOException {
        emitter.send(SseEmitter.event().data(message));
    }

    private JavaMailSenderImpl buildMailSender(SystemConfig config) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(config.getGmailSmtpServer() != null ? config.getGmailSmtpServer() : "smtp.gmail.com");
        sender.setPort(config.getGmailSmtpPort() != null ? config.getGmailSmtpPort() : 587);
        sender.setUsername(config.getGmailSenderEmail());
        sender.setPassword(config.getGmailAppPassword());

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "15000");
        props.put("mail.smtp.timeout", "30000");
        props.put("mail.smtp.writetimeout", "30000");
        return sender;
    }

    private String buildManagerDisplayName(Manager m) {
        if (m.getUser() != null) {
            String fn = Optional.ofNullable(m.getUser().getFirstName()).orElse("");
            String ln = Optional.ofNullable(m.getUser().getLastName()).orElse("");
            String full = (fn + " " + ln).trim();
            if (!full.isBlank()) return full;
        }
        return m.getName();
    }

    private static void collectPlayerIds(Manager m, List<Long> out) {
        Player[] players = new Player[] {
            m.getPlayerGoalkeeper(),
            m.getPlayerDefender1(), m.getPlayerDefender2(), m.getPlayerDefender3(),
            m.getPlayerMidfield1(), m.getPlayerMidfield2(), m.getPlayerMidfield3(),
            m.getPlayerStriker1(), m.getPlayerStriker2(), m.getPlayerStriker3(),
            m.getPlayerFreeChoice()
        };
        for (Player p : players) {
            if (p != null) out.add(p.getId());
        }
    }

    private String buildHtmlForManager(Manager manager, Season season, Integer roundNumber, String intro,
                                       ManagerRank ownDayRank, String topScorerName, Integer topScorerPoints,
                                       Map<Long, PlayerRank> playerRankByPlayerId) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head>");
        sb.append("<body style=\"background:#0f1419;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:20px;\">");
        sb.append("<div style=\"max-width:680px;margin:0 auto;background:#1a2028;border:1px solid #2d3748;border-radius:8px;padding:24px;\">");

        sb.append("<h1 style=\"color:#c9a66b;margin:0 0 4px 0;\">FFL ").append(escape(season.getName())).append("</h1>");
        sb.append("<div style=\"color:#a0aec0;font-size:14px;margin-bottom:20px;\">Spieltag ").append(roundNumber).append("</div>");

        sb.append("<p style=\"color:#f5f5f5;font-size:15px;line-height:1.5;\">Hallo ")
          .append(escape(manager.getUser() != null ? Optional.ofNullable(manager.getUser().getFirstName()).orElse(manager.getName()) : manager.getName()))
          .append("!</p>");

        sb.append("<div style=\"background:#242d38;border-left:3px solid #c9a66b;padding:12px 16px;margin:16px 0;color:#e2e8f0;font-style:italic;\">")
          .append(escape(intro)).append("</div>");

        // Eigenes Ranking
        if (ownDayRank != null) {
            sb.append("<h2 style=\"color:#c9a66b;font-size:18px;margin-top:24px;\">Dein Spieltag</h2>");
            sb.append("<table style=\"width:100%;border-collapse:collapse;margin-bottom:16px;\">");
            sb.append(tr("Punkte Spieltag", String.valueOf(nz(ownDayRank.getPointsRound()))));
            sb.append(tr("Position Spieltag", String.valueOf(nz(ownDayRank.getPositionRound()))));
            sb.append(tr("Punkte gesamt", String.valueOf(nz(ownDayRank.getPointsTotal()))));
            sb.append(tr("Position gesamt", String.valueOf(nz(ownDayRank.getPositionTotal()))));
            sb.append("</table>");
        }

        // Team-Aufstellung mit Punkten dieses Spieltags
        sb.append("<h2 style=\"color:#c9a66b;font-size:18px;margin-top:24px;\">Deine Aufstellung</h2>");
        sb.append("<table style=\"width:100%;border-collapse:collapse;\">");
        sb.append("<thead><tr style=\"background:#2d3748;color:#a0aec0;text-align:left;\">")
          .append("<th style=\"padding:8px;\">Position</th>")
          .append("<th style=\"padding:8px;\">Spieler</th>")
          .append("<th style=\"padding:8px;text-align:right;\">Punkte Spieltag</th>")
          .append("<th style=\"padding:8px;text-align:right;\">Punkte gesamt</th>")
          .append("</tr></thead><tbody>");

        appendPlayerRow(sb, "TW", manager.getPlayerGoalkeeper(), playerRankByPlayerId);
        appendPlayerRow(sb, "ABW", manager.getPlayerDefender1(), playerRankByPlayerId);
        appendPlayerRow(sb, "ABW", manager.getPlayerDefender2(), playerRankByPlayerId);
        appendPlayerRow(sb, "ABW", manager.getPlayerDefender3(), playerRankByPlayerId);
        appendPlayerRow(sb, "MF", manager.getPlayerMidfield1(), playerRankByPlayerId);
        appendPlayerRow(sb, "MF", manager.getPlayerMidfield2(), playerRankByPlayerId);
        appendPlayerRow(sb, "MF", manager.getPlayerMidfield3(), playerRankByPlayerId);
        appendPlayerRow(sb, "ST", manager.getPlayerStriker1(), playerRankByPlayerId);
        appendPlayerRow(sb, "ST", manager.getPlayerStriker2(), playerRankByPlayerId);
        appendPlayerRow(sb, "ST", manager.getPlayerStriker3(), playerRankByPlayerId);
        appendPlayerRow(sb, "FREI", manager.getPlayerFreeChoice(), playerRankByPlayerId);

        sb.append("</tbody></table>");

        // Tages-Sieger
        sb.append("<div style=\"margin-top:24px;padding:12px;background:#242d38;border-radius:6px;color:#a0aec0;font-size:14px;\">")
          .append("Tagessieger Spieltag ").append(roundNumber).append(": <strong style=\"color:#c9a66b;\">")
          .append(escape(topScorerName)).append("</strong>");
        if (topScorerPoints != null) {
            sb.append(" (").append(topScorerPoints).append(" Punkte)");
        }
        sb.append("</div>");

        sb.append("<div style=\"margin-top:24px;color:#6b7280;font-size:12px;text-align:center;\">FFL — Fantasy Football League</div>");
        sb.append("</div></body></html>");
        return sb.toString();
    }

    private void appendPlayerRow(StringBuilder sb, String posLabel, Player player,
                                 Map<Long, PlayerRank> playerRankByPlayerId) {
        if (player == null) return;
        Integer pointsRound = null;
        Integer pointsTotal = null;
        PlayerRank pr = playerRankByPlayerId.get(player.getId());
        if (pr != null) {
            pointsRound = pr.getPointsRound();
            pointsTotal = pr.getPointsTotal();
        }
        String teamName = "";
        if (player.getTeams() != null && !player.getTeams().isEmpty()) {
            teamName = player.getTeams().get(player.getTeams().size() - 1).getName();
        }
        sb.append("<tr style=\"border-bottom:1px solid #2d3748;\">")
          .append("<td style=\"padding:8px;color:#a0aec0;\">").append(escape(posLabel)).append("</td>")
          .append("<td style=\"padding:8px;\"><strong>").append(escape(player.getNameKicker())).append("</strong>")
          .append("<span style=\"color:#6b7280;font-size:12px;margin-left:6px;\">").append(escape(teamName)).append("</span></td>")
          .append("<td style=\"padding:8px;text-align:right;color:#c9a66b;\">").append(pointsRound != null ? pointsRound : "-").append("</td>")
          .append("<td style=\"padding:8px;text-align:right;\">").append(pointsTotal != null ? pointsTotal : "-").append("</td>")
          .append("</tr>");
    }

    private String tr(String label, String value) {
        return "<tr style=\"border-bottom:1px solid #2d3748;\">"
             + "<td style=\"padding:6px 8px;color:#a0aec0;\">" + escape(label) + "</td>"
             + "<td style=\"padding:6px 8px;text-align:right;color:#c9a66b;font-weight:bold;\">" + escape(value) + "</td>"
             + "</tr>";
    }

    private static int nz(Integer v) { return v != null ? v : 0; }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
