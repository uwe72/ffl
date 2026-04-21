package de.ffl.service;

import de.ffl.domain.Game;
import de.ffl.domain.Manager;
import de.ffl.domain.ManagerRank;
import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Points;
import de.ffl.domain.Round;
import de.ffl.domain.Rule;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.domain.Team;
import de.ffl.repository.GameRepository;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.PointsRepository;
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
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MatchdayMailTransactionService {

    private final SeasonRepository seasonRepository;
    private final ManagerRepository managerRepository;
    private final ManagerRankRepository managerRankRepository;
    private final PlayerRankRepository playerRankRepository;
    private final PlayerRepository playerRepository;
    private final RoundRepository roundRepository;
    private final GameRepository gameRepository;
    private final PointsRepository pointsRepository;
    private final LlmService llmService;

    public MatchdayMailTransactionService(SeasonRepository seasonRepository,
                                          ManagerRepository managerRepository,
                                          ManagerRankRepository managerRankRepository,
                                          PlayerRankRepository playerRankRepository,
                                          PlayerRepository playerRepository,
                                          RoundRepository roundRepository,
                                          GameRepository gameRepository,
                                          PointsRepository pointsRepository,
                                          LlmService llmService) {
        this.seasonRepository = seasonRepository;
        this.managerRepository = managerRepository;
        this.managerRankRepository = managerRankRepository;
        this.playerRankRepository = playerRankRepository;
        this.playerRepository = playerRepository;
        this.roundRepository = roundRepository;
        this.gameRepository = gameRepository;
        this.pointsRepository = pointsRepository;
        this.llmService = llmService;
    }

    public void runMailJob(SseEmitter emitter, Long seasonId, Integer roundNumber, 
                           List<Long> managerIds, JavaMailSenderImpl mailSender, 
                           SystemConfig config) {
        try {
            send(emitter, "Lade Spieltags-Daten…");

            Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Saison " + seasonId + " nicht gefunden"));

            List<Manager> allManagersInSeason = managerRepository.findBySeasonIdWithPlayers(seasonId);
            List<Long> allManagerIds = allManagersInSeason.stream().map(Manager::getId).toList();

            List<ManagerRank> dayRanks = managerRankRepository.findByManagerIdInAndRoundNumber(
                allManagerIds, roundNumber);
            Map<Long, ManagerRank> dayRankByManagerId = new HashMap<>();
            for (ManagerRank mr : dayRanks) {
                dayRankByManagerId.put(mr.getManager().getId(), mr);
            }

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

            Map<Long, ManagerRank> prevRankByManagerId = new HashMap<>();
            if (roundNumber > 1) {
                List<ManagerRank> prevRanks = managerRankRepository.findByManagerIdInAndRoundNumber(
                    allManagerIds, roundNumber - 1);
                for (ManagerRank mr : prevRanks) {
                    prevRankByManagerId.put(mr.getManager().getId(), mr);
                }
            }

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

            Round round = roundRepository.findBySeasonIdAndNumber(seasonId, roundNumber)
                .orElseThrow(() -> new RuntimeException("Spieltag " + roundNumber + " in Saison " + seasonId + " nicht gefunden"));
            Long roundId = round.getId();

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

            Map<Long, List<Team>> teamsByPlayerId = new HashMap<>();
            Map<Long, Player> playerById = new HashMap<>();
            if (!allPlayerIds.isEmpty()) {
                List<Player> playersWithTeams = playerRepository.findByIdsWithTeams(allPlayerIds);
                teamsByPlayerId = playersWithTeams.stream()
                    .collect(Collectors.toMap(Player::getId, Player::getTeams));
                for (Player p : playersWithTeams) {
                    playerById.put(p.getId(), p);
                }
            }

            List<Game> roundGames = gameRepository.findByRoundId(roundId);
            List<Long> gameIds = roundGames.stream().map(Game::getId).toList();
            Map<Long, List<Points>> pointsByPlayerId = new HashMap<>();
            if (!allPlayerIds.isEmpty() && !gameIds.isEmpty()) {
                List<Points> allPoints = pointsRepository.findByPlayerIdInAndGameIdIn(allPlayerIds, gameIds);
                pointsByPlayerId = allPoints.stream()
                    .collect(Collectors.groupingBy(p -> p.getPlayer().getId()));
            }

            send(emitter, "Mail-Server verbunden (" + config.getGmailSmtpServer() + ":" + config.getGmailSmtpPort() + ")");

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
                    MimeMessage msg = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                    helper.setFrom(config.getGmailSenderEmail());
                    helper.setTo(recipientEmail);
                    String managerName = manager.getName();
                    String fullName = buildManagerDisplayName(manager);
                    String subject = "FFL | " + season.getName() + " | " + roundNumber + ". Spieltag | " + fullName + " (" + managerName + ")";
                    helper.setSubject(subject);

                    String html = buildHtmlForManager(manager, season, roundNumber, intro,
                        dayRankByManagerId.get(managerId), topScorerName, topScorerPoints,
                        playerRankByPlayerId, teamsByPlayerId, playerById, pointsByPlayerId,
                        prevRankByManagerId);

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
                                        Map<Long, PlayerRank> playerRankByPlayerId,
                                        Map<Long, List<Team>> teamsByPlayerId,
                                        Map<Long, Player> playerById,
                                        Map<Long, List<Points>> pointsByPlayerId,
                                        Map<Long, ManagerRank> prevRankByManagerId) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:#0f1419;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:16px;margin:0;\">");
        sb.append("<div style=\"max-width:480px;margin:0 auto;\">");

        sb.append("<p style=\"color:#f5f5f5;font-size:15px;line-height:1.5;margin:0 0 16px 0;\">Hallo ")
          .append(escape(manager.getUser() != null ? Optional.ofNullable(manager.getUser().getFirstName()).orElse(manager.getName()) : manager.getName()))
          .append("!</p>");

        sb.append("<div style=\"background:#242d38;border-left:3px solid #c9a66b;padding:12px 16px;margin:0 0 16px 0;color:#e2e8f0;font-style:italic;border-radius:0 6px 6px 0;\">")
          .append(escape(intro)).append("</div>");

        if (ownDayRank != null) {
            sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:16px;\"><tr>");
            
            sb.append("<td width=\"50%\" style=\"padding-right:4px;\">");
            sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;padding:16px;\">");
            sb.append("<div style=\"font-size:24px;font-weight:700;color:#c9a66b;\">FFL ").append(escape(season.getName())).append("</div>");
            sb.append("<div style=\"font-size:12px;color:#a0aec0;margin-top:4px;\">").append(roundNumber).append(". Spieltag</div>");
            sb.append("</div></td>");
            
            sb.append("<td width=\"50%\" style=\"padding-left:4px;\">");
            sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;padding:16px;\">");
            sb.append("<div style=\"font-size:24px;font-weight:700;color:#c9a66b;\">").append(nz(ownDayRank.getPointsTotal()));
            if (ownDayRank.getPointsRound() != null && ownDayRank.getPointsRound() > 0) {
                sb.append(" <span style=\"font-size:14px;color:#48bb78;\">+").append(ownDayRank.getPointsRound()).append("</span>");
            }
            sb.append("</div>");
            sb.append("<div style=\"font-size:12px;color:#a0aec0;margin-top:4px;\">Punkte gesamt</div>");
            sb.append("</div></td>");
            
            sb.append("</tr><tr>");
            
            sb.append("<td width=\"50%\" style=\"padding-right:4px;padding-top:8px;\">");
            sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;padding:16px;\">");
            sb.append("<div style=\"font-size:24px;font-weight:700;color:#c9a66b;\">").append(nz(ownDayRank.getPositionTotal())).append(".");
            ManagerRank prevRank = prevRankByManagerId.get(manager.getId());
            if (prevRank != null && prevRank.getPositionTotal() != null) {
                int diff = prevRank.getPositionTotal() - ownDayRank.getPositionTotal();
                if (diff > 0) {
                    sb.append(" <span style=\"font-size:14px;color:#48bb78;\">↑").append(diff).append("</span>");
                } else if (diff < 0) {
                    sb.append(" <span style=\"font-size:14px;color:#f56565;\">↓").append(Math.abs(diff)).append("</span>");
                }
            }
            sb.append("</div>");
            sb.append("<div style=\"font-size:12px;color:#a0aec0;margin-top:4px;\">Position gesamt</div>");
            sb.append("</div></td>");
            
            sb.append("<td width=\"50%\" style=\"padding-left:4px;padding-top:8px;\">");
            sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #6b7280;border-radius:8px;padding:16px;\">");
            sb.append("<div style=\"font-size:24px;font-weight:700;color:#f5f5f5;\">").append(nz(ownDayRank.getPositionRound())).append(".</div>");
            sb.append("<div style=\"font-size:12px;color:#a0aec0;margin-top:4px;\">Position Spieltag</div>");
            sb.append("</div></td>");
            
            sb.append("</tr></table>");
        }

        List<Player> scoringPlayers = collectScoringPlayers(manager, playerRankByPlayerId, pointsByPlayerId);
        if (!scoringPlayers.isEmpty()) {
            sb.append("<h2 style=\"color:#c9a66b;font-size:16px;margin:16px 0 12px 0;\">")
              .append(ownDayRank != null ? nz(ownDayRank.getPointsRound()) : 0).append(" Punkte am ")
              .append(roundNumber).append(". Spieltag</h2>");
            sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">");
            int col = 0;
            for (Player player : scoringPlayers) {
                if (col == 0) {
                    sb.append("<tr>");
                }
                sb.append("<td width=\"50%\" style=\"padding-right:4px;padding-bottom:8px;vertical-align:top;\">");
                appendScoringPlayerCard(sb, player, manager, playerRankByPlayerId, teamsByPlayerId, pointsByPlayerId);
                sb.append("</td>");
                col++;
                if (col == 2) {
                    sb.append("</tr>");
                    col = 0;
                }
            }
            if (col == 1) {
                sb.append("<td width=\"50%\" style=\"padding-left:4px;padding-bottom:8px;\"></td></tr>");
            }
            sb.append("</table>");
        }

        sb.append("<h2 style=\"color:#c9a66b;font-size:16px;margin:16px 0 12px 0;\">Deine Aufstellung</h2>");

        appendPlayerCard(sb, "TW", "#48bb78", manager.getPlayerGoalkeeper(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "ABW", "#ed8936", manager.getPlayerDefender1(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "ABW", "#ed8936", manager.getPlayerDefender2(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "ABW", "#ed8936", manager.getPlayerDefender3(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "MF", "#c9a66b", manager.getPlayerMidfield1(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "MF", "#c9a66b", manager.getPlayerMidfield2(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "MF", "#c9a66b", manager.getPlayerMidfield3(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "ST", "#a0aec0", manager.getPlayerStriker1(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "ST", "#a0aec0", manager.getPlayerStriker2(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "ST", "#a0aec0", manager.getPlayerStriker3(), playerRankByPlayerId, teamsByPlayerId);
        appendPlayerCard(sb, "FREI", "#f56565", manager.getPlayerFreeChoice(), playerRankByPlayerId, teamsByPlayerId);

        sb.append("<div style=\"margin-top:16px;padding:12px;background:#242d38;border-radius:6px;color:#a0aec0;font-size:14px;\">")
          .append("Tagessieger Spieltag ").append(roundNumber).append(": <strong style=\"color:#c9a66b;\">")
          .append(escape(topScorerName)).append("</strong>");
        if (topScorerPoints != null) {
            sb.append(" (").append(topScorerPoints).append(" Punkte)");
        }
        sb.append("</div>");

        sb.append("<div style=\"margin-top:16px;color:#6b7280;font-size:12px;text-align:center;\">FFL — Fantasy Football League</div>");
        sb.append("</div></body></html>");
        return sb.toString();
    }

    private void appendPlayerCard(StringBuilder sb, String posLabel, String posColor, Player player,
                                  Map<Long, PlayerRank> playerRankByPlayerId,
                                  Map<Long, List<Team>> teamsByPlayerId) {
        if (player == null) return;

        Integer pointsRound = null;
        Integer pointsTotal = null;
        Integer positionTotal = null;
        PlayerRank pr = playerRankByPlayerId.get(player.getId());
        if (pr != null) {
            pointsRound = pr.getPointsRound();
            pointsTotal = pr.getPointsTotal();
            positionTotal = pr.getPositionTotal();
        }

        String teamName = "";
        List<Team> teams = teamsByPlayerId.get(player.getId());
        if (teams != null && !teams.isEmpty()) {
            Team team = teams.get(teams.size() - 1);
            teamName = team.getName();
        }

        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#1a2028;border:1px solid #2d3748;border-radius:8px;margin-bottom:8px;\">");
        sb.append("<tr>");
        sb.append("<td style=\"padding:12px;\">");

        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">");
        sb.append("<tr>");

        sb.append("<td width=\"48\" valign=\"top\" style=\"padding-right:12px;\">");
        sb.append("<div style=\"width:48px;height:48px;border-radius:50%;background:#242d38;text-align:center;line-height:48px;\">")
          .append("<span style=\"font-size:20px;color:#6b7280;\">&#128100;</span>")
          .append("</div>");
        sb.append("</td>");

        sb.append("<td valign=\"middle\">");
        sb.append("<div style=\"font-weight:600;color:#f5f5f5;font-size:14px;\">").append(escape(player.getNameKicker())).append("</div>");
        sb.append("<table cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:4px;\"><tr>");
        sb.append("<td style=\"background:").append(posColor).append(";color:#0f1419;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;\">")
          .append(escape(posLabel)).append("</td>");
        if (!teamName.isEmpty()) {
            sb.append("<td style=\"padding-left:6px;color:#6b7280;font-size:12px;\">").append(escape(teamName)).append("</td>");
        }
        sb.append("</tr></table>");
        sb.append("</td>");

        sb.append("</tr>");
        sb.append("</table>");

        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:10px;\">");
        sb.append("<tr>");

        sb.append("<td width=\"33%\" style=\"font-size:13px;\"><span style=\"color:#6b7280;\">Pos: </span>");
        if (positionTotal != null) {
            sb.append("<span style=\"font-weight:600;color:#f5f5f5;\">").append(positionTotal).append(".</span>");
        } else {
            sb.append("<span style=\"color:#6b7280;\">-</span>");
        }
        sb.append("</td>");

        sb.append("<td width=\"33%\" style=\"font-size:13px;\"><span style=\"color:#6b7280;\">Pkt: </span>")
          .append("<span style=\"font-weight:600;color:#f5f5f5;\">").append(pointsTotal != null ? pointsTotal : "-").append("</span>")
          .append("</td>");

        sb.append("<td width=\"33%\" style=\"font-size:13px;\"><span style=\"color:#6b7280;\">Spieltag: </span>")
          .append("<span style=\"font-weight:600;color:#c9a66b;\">").append(pointsRound != null ? pointsRound : "-").append("</span>")
          .append("</td>");

        sb.append("</tr>");
        sb.append("</table>");

        sb.append("</td>");
        sb.append("</tr>");
        sb.append("</table>");
    }

    private List<Player> collectScoringPlayers(Manager manager,
                                                Map<Long, PlayerRank> playerRankByPlayerId,
                                                Map<Long, List<Points>> pointsByPlayerId) {
        List<Player> scoringPlayers = new ArrayList<>();
        Player[] allPlayers = new Player[] {
            manager.getPlayerGoalkeeper(),
            manager.getPlayerDefender1(), manager.getPlayerDefender2(), manager.getPlayerDefender3(),
            manager.getPlayerMidfield1(), manager.getPlayerMidfield2(), manager.getPlayerMidfield3(),
            manager.getPlayerStriker1(), manager.getPlayerStriker2(), manager.getPlayerStriker3(),
            manager.getPlayerFreeChoice()
        };
        for (Player p : allPlayers) {
            if (p == null) continue;
            PlayerRank pr = playerRankByPlayerId.get(p.getId());
            if (pr != null && pr.getPointsRound() != null && pr.getPointsRound() > 0) {
                scoringPlayers.add(p);
            }
        }
        scoringPlayers.sort((a, b) -> {
            PlayerRank prA = playerRankByPlayerId.get(a.getId());
            PlayerRank prB = playerRankByPlayerId.get(b.getId());
            int ptsA = prA != null && prA.getPointsRound() != null ? prA.getPointsRound() : 0;
            int ptsB = prB != null && prB.getPointsRound() != null ? prB.getPointsRound() : 0;
            return Integer.compare(ptsB, ptsA);
        });
        return scoringPlayers;
    }

    private void appendScoringPlayerCard(StringBuilder sb, Player player, Manager manager,
                                         Map<Long, PlayerRank> playerRankByPlayerId,
                                         Map<Long, List<Team>> teamsByPlayerId,
                                         Map<Long, List<Points>> pointsByPlayerId) {
        PlayerRank pr = playerRankByPlayerId.get(player.getId());
        int pointsRound = pr != null && pr.getPointsRound() != null ? pr.getPointsRound() : 0;
        if (pointsRound == 0) return;

        String teamName = "";
        List<Team> teams = teamsByPlayerId.get(player.getId());
        if (teams != null && !teams.isEmpty()) {
            teamName = teams.get(teams.size() - 1).getName();
        }

        String posLabel = getPositionLabel(player, manager);
        String posColor = getPositionColor(player, manager);

        sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid ").append(posColor).append(";border-radius:8px;padding:12px;\">");
        
        sb.append("<div style=\"font-weight:600;color:#f5f5f5;font-size:14px;\">").append(escape(player.getNameKicker())).append("</div>");
        
        sb.append("<table cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:4px;\"><tr>");
        sb.append("<td style=\"background:").append(posColor).append(";color:#0f1419;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;\">")
          .append(escape(posLabel)).append("</td>");
        if (!teamName.isEmpty()) {
            sb.append("<td style=\"padding-left:6px;color:#6b7280;font-size:11px;\">").append(escape(teamName)).append("</td>");
        }
        sb.append("</tr></table>");

        sb.append("<div style=\"margin-top:8px;font-size:18px;font-weight:700;color:#c9a66b;\">").append(pointsRound).append(" Pkt</div>");

        List<Points> playerPoints = pointsByPlayerId.getOrDefault(player.getId(), List.of());
        Map<Rule, Integer> ruleCounts = new HashMap<>();
        for (Points p : playerPoints) {
            ruleCounts.merge(p.getRule(), 1, Integer::sum);
        }
        if (!ruleCounts.isEmpty()) {
            sb.append("<div style=\"margin-top:6px;\">");
            List<Map.Entry<Rule, Integer>> sortedRules = ruleCounts.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getKey().getPoints() * b.getValue(), a.getKey().getPoints() * a.getValue()))
                .toList();
            for (Map.Entry<Rule, Integer> entry : sortedRules) {
                Rule rule = entry.getKey();
                int count = entry.getValue();
                String color = getRuleColor(rule);
                sb.append("<span style=\"display:inline-block;background:").append(color)
                  .append(";color:#0f1419;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;margin-right:4px;margin-bottom:2px;\">");
                sb.append(escape(getRuleLabel(rule)));
                if (count > 1) {
                    sb.append(" x").append(count);
                }
                sb.append("</span>");
            }
            sb.append("</div>");
        }

        sb.append("</div>");
    }

    private String getRuleColor(Rule rule) {
        return switch (rule) {
            case GOAL_STRIKER -> "#a0aec0";
            case GOAL_MIDFIELDER -> "#c9a66b";
            case GOAL_DEFENDER -> "#ed8936";
            case GOAL_GOALKEEPER -> "#48bb78";
            case GOAL_GOALKEEPER_BY_PENALTY -> "#68d391";
            case TO_NULL_GOALKEEPER -> "#3b82f6";
            case TO_NULL_DEFENDER -> "#06b6d4";
        };
    }

    private String getPositionLabel(Player player, Manager manager) {
        if (player.equals(manager.getPlayerGoalkeeper())) return "TW";
        if (player.equals(manager.getPlayerDefender1())) return "ABW";
        if (player.equals(manager.getPlayerDefender2())) return "ABW";
        if (player.equals(manager.getPlayerDefender3())) return "ABW";
        if (player.equals(manager.getPlayerMidfield1())) return "MF";
        if (player.equals(manager.getPlayerMidfield2())) return "MF";
        if (player.equals(manager.getPlayerMidfield3())) return "MF";
        if (player.equals(manager.getPlayerStriker1())) return "ST";
        if (player.equals(manager.getPlayerStriker2())) return "ST";
        if (player.equals(manager.getPlayerStriker3())) return "ST";
        if (player.equals(manager.getPlayerFreeChoice())) return "FREI";
        return "SP";
    }

    private String getPositionColor(Player player, Manager manager) {
        if (player.equals(manager.getPlayerGoalkeeper())) return "#48bb78";
        if (player.equals(manager.getPlayerDefender1())) return "#ed8936";
        if (player.equals(manager.getPlayerDefender2())) return "#ed8936";
        if (player.equals(manager.getPlayerDefender3())) return "#ed8936";
        if (player.equals(manager.getPlayerMidfield1())) return "#c9a66b";
        if (player.equals(manager.getPlayerMidfield2())) return "#c9a66b";
        if (player.equals(manager.getPlayerMidfield3())) return "#c9a66b";
        if (player.equals(manager.getPlayerStriker1())) return "#a0aec0";
        if (player.equals(manager.getPlayerStriker2())) return "#a0aec0";
        if (player.equals(manager.getPlayerStriker3())) return "#a0aec0";
        if (player.equals(manager.getPlayerFreeChoice())) return "#f56565";
        return "#6b7280";
    }

    private String getRuleLabel(Rule rule) {
        return switch (rule) {
            case GOAL_STRIKER -> "Tor Stürmer";
            case GOAL_MIDFIELDER -> "Tor Mittelfeld";
            case GOAL_DEFENDER -> "Tor Verteidiger";
            case TO_NULL_GOALKEEPER -> "Zu Null Torwart";
            case TO_NULL_DEFENDER -> "Zu Null Verteidiger";
            case GOAL_GOALKEEPER -> "Tor Torwart";
            case GOAL_GOALKEEPER_BY_PENALTY -> "Tor Torwart (Elfmeter)";
        };
    }

    private static int nz(Integer v) { return v != null ? v : 0; }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
