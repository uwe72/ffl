package de.ffl.service;

import de.ffl.domain.Game;
import de.ffl.domain.Manager;
import de.ffl.domain.ManagerGroup;
import de.ffl.domain.ManagerRank;
import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Points;
import de.ffl.domain.Position;
import de.ffl.domain.Round;
import de.ffl.domain.Rule;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.domain.Team;
import de.ffl.repository.GameRepository;
import de.ffl.repository.ManagerGroupRepository;
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
    private final ManagerGroupRepository managerGroupRepository;
    private final LlmService llmService;

    public MatchdayMailTransactionService(SeasonRepository seasonRepository,
                                          ManagerRepository managerRepository,
                                          ManagerRankRepository managerRankRepository,
                                          PlayerRankRepository playerRankRepository,
                                          PlayerRepository playerRepository,
                                          RoundRepository roundRepository,
                                          GameRepository gameRepository,
                                          PointsRepository pointsRepository,
                                          ManagerGroupRepository managerGroupRepository,
                                          LlmService llmService) {
        this.seasonRepository = seasonRepository;
        this.managerRepository = managerRepository;
        this.managerRankRepository = managerRankRepository;
        this.playerRankRepository = playerRankRepository;
        this.playerRepository = playerRepository;
        this.roundRepository = roundRepository;
        this.gameRepository = gameRepository;
        this.pointsRepository = pointsRepository;
        this.managerGroupRepository = managerGroupRepository;
        this.llmService = llmService;
    }

    public void runMailJob(SseEmitter emitter, Long seasonId, Integer roundNumber,
                           List<Long> managerIds, JavaMailSenderImpl mailSender,
                           SystemConfig config, String comment) {
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

            Map<Long, Manager> managersById = new HashMap<>();
            for (Manager m : allManagersInSeason) {
                managersById.put(m.getId(), m);
            }
            List<ManagerRank> dayRanksSorted = dayRanks.stream()
                .filter(r -> r.getPositionTotal() != null)
                .sorted(Comparator.comparingInt(ManagerRank::getPositionTotal))
                .collect(Collectors.toList());

            Round round = roundRepository.findBySeasonIdAndNumber(seasonId, roundNumber)
                .orElseThrow(() -> new RuntimeException("Spieltag " + roundNumber + " in Saison " + seasonId + " nicht gefunden"));
            Long roundId = round.getId();

            List<Long> allPlayerIds = new ArrayList<>();
            Map<Long, Integer> ownerCountByPlayerId = new HashMap<>();
            Map<Long, List<String>> ownersByPlayerId = new HashMap<>();
            for (Manager m : allManagersInSeason) {
                List<Long> mPlayerIds = new ArrayList<>();
                collectPlayerIds(m, mPlayerIds);
                String mName = buildManagerDisplayName(m);
                for (Long pid : mPlayerIds) {
                    if (!allPlayerIds.contains(pid)) allPlayerIds.add(pid);
                    ownerCountByPlayerId.merge(pid, 1, Integer::sum);
                    ownersByPlayerId.computeIfAbsent(pid, k -> new ArrayList<>()).add(mName);
                }
            }

            Map<Long, PlayerRank> playerRankByPlayerId = new HashMap<>();
            if (!allPlayerIds.isEmpty()) {
                List<PlayerRank> prs = playerRankRepository.findByPlayerIdInAndRoundId(allPlayerIds, roundId);
                for (PlayerRank pr : prs) {
                    playerRankByPlayerId.put(pr.getPlayer().getId(), pr);
                }
            }

            Map<Long, List<PlayerRank>> seasonRanksByPlayerId = new HashMap<>();
            if (!allPlayerIds.isEmpty()) {
                List<PlayerRank> seasonRanks = playerRankRepository.findByPlayerIdInWithRound(allPlayerIds);
                for (PlayerRank pr : seasonRanks) {
                    if (pr.getRound() == null || pr.getRound().getNumber() == null) continue;
                    if (pr.getRound().getNumber() > roundNumber) continue;
                    seasonRanksByPlayerId.computeIfAbsent(pr.getPlayer().getId(), k -> new ArrayList<>()).add(pr);
                }
            }

            int transferRound = season.getStartRoundRueckrunde() != null ? season.getStartRoundRueckrunde() : 16;

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

            send(emitter, "Generiere LLM-Einleitung…");
            List<Map<String, Object>> managerPoints = new ArrayList<>();
            List<Map<String, Object>> allMovers = new ArrayList<>();
            for (Manager m : allManagersInSeason) {
                ManagerRank mr = dayRankByManagerId.get(m.getId());
                if (mr == null) continue;
                ManagerRank prev = prevRankByManagerId.get(m.getId());
                Integer positionTotalPrev = prev != null ? prev.getPositionTotal() : null;
                Integer deltaTotal = (positionTotalPrev != null && mr.getPositionTotal() != null)
                    ? positionTotalPrev - mr.getPositionTotal() : null;

                Map<String, Object> entry = new HashMap<>();
                entry.put("name", buildManagerDisplayName(m));
                entry.put("pointsRound", mr.getPointsRound());
                entry.put("positionRound", mr.getPositionRound());
                entry.put("pointsTotal", mr.getPointsTotal());
                entry.put("positionTotal", mr.getPositionTotal());
                entry.put("positionTotalPrev", positionTotalPrev);
                entry.put("deltaTotal", deltaTotal);
                managerPoints.add(entry);

                if (deltaTotal != null && deltaTotal != 0) {
                    Map<String, Object> mover = new HashMap<>();
                    mover.put("name", buildManagerDisplayName(m));
                    mover.put("deltaTotal", deltaTotal);
                    mover.put("positionTotal", mr.getPositionTotal());
                    mover.put("positionTotalPrev", positionTotalPrev);
                    allMovers.add(mover);
                }
            }
            managerPoints.sort((a, b) -> Integer.compare(
                (Integer) b.getOrDefault("pointsRound", 0),
                (Integer) a.getOrDefault("pointsRound", 0)));
            allMovers.sort((a, b) -> Integer.compare(
                Math.abs((Integer) b.get("deltaTotal")),
                Math.abs((Integer) a.get("deltaTotal"))));

            List<Map<String, Object>> bigMovers = allMovers.stream()
                .filter(mv -> Math.abs((Integer) mv.get("deltaTotal")) >= 15)
                .collect(Collectors.toList());
            List<Map<String, Object>> topMovers = allMovers.stream()
                .limit(5)
                .collect(Collectors.toList());

            List<Map<String, Object>> allScorers = new ArrayList<>();
            for (Map.Entry<Long, PlayerRank> e : playerRankByPlayerId.entrySet()) {
                PlayerRank pr = e.getValue();
                Integer pts = pr.getPointsRound();
                if (pts == null || pts <= 0) continue;
                Player p = playerById.get(e.getKey());
                if (p == null) continue;
                String teamName = "";
                List<Team> teams = teamsByPlayerId.get(e.getKey());
                if (teams != null && !teams.isEmpty()) {
                    teamName = teams.get(teams.size() - 1).getName();
                }
                Map<String, Object> tp = new HashMap<>();
                tp.put("name", p.getNameKicker());
                tp.put("team", teamName);
                tp.put("points", pts);
                tp.put("ownerCount", ownerCountByPlayerId.getOrDefault(e.getKey(), 0));
                List<String> owners = ownersByPlayerId.getOrDefault(e.getKey(), List.of());
                tp.put("owners", owners.size() <= 5 ? owners : owners.subList(0, 5));
                allScorers.add(tp);
            }
            allScorers.sort((a, b) -> Integer.compare(
                (Integer) b.getOrDefault("points", 0),
                (Integer) a.getOrDefault("points", 0)));
            List<Map<String, Object>> topPlayers = allScorers.stream()
                .filter(tp -> (Integer) tp.get("points") >= 10)
                .collect(Collectors.toList());
            List<Map<String, Object>> topScorersAll = allScorers.stream()
                .limit(5)
                .collect(Collectors.toList());

            List<Map<String, Object>> topManagersByPoints = managerPoints.stream()
                .limit(5)
                .collect(Collectors.toList());

            Map<String, Object> summary = new HashMap<>();
            summary.put("saison", season.getName());
            summary.put("spieltag", roundNumber);
            summary.put("topScorer", topScorerName);
            summary.put("topScorerPoints", topScorerPoints);
            summary.put("topManagersByPoints", topManagersByPoints);
            summary.put("bigMovers", bigMovers);
            summary.put("topMovers", topMovers);
            summary.put("topPlayers", topPlayers);
            summary.put("topScorersAll", topScorersAll);

            try {
                System.out.println("[MatchdayMail] LLM-Summary: " + new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(summary));
            } catch (Exception ignored) {}

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

                    List<RankingRow> rankingExcerpt = buildRankingExcerpt(dayRanksSorted, managerId);
                    List<ManagerGroup> managerGroups = managerGroupRepository.findByManagerIdWithManagers(managerId);

                    String html = buildHtmlForManager(manager, season, roundNumber, intro,
                        dayRankByManagerId.get(managerId), topScorerName, topScorerPoints,
                        playerRankByPlayerId, teamsByPlayerId, playerById, pointsByPlayerId,
                        prevRankByManagerId, seasonRanksByPlayerId, transferRound, config.getWebUrl(),
                        rankingExcerpt, managersById, managerGroups, dayRankByManagerId, comment);

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
            m.getPlayerFreeChoice(),
            m.getPlayerExchangedNew1(), m.getPlayerExchangedNew2(), m.getPlayerExchangedNew3()
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
                                        Map<Long, ManagerRank> prevRankByManagerId,
                                        Map<Long, List<PlayerRank>> seasonRanksByPlayerId,
                                        int transferRound, String webUrl,
                                        List<RankingRow> rankingExcerpt,
                                        Map<Long, Manager> managersById,
                                        List<ManagerGroup> managerGroups,
                                        Map<Long, ManagerRank> dayRankByManagerId,
                                        String comment) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:#0f1419;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;padding:16px;margin:0;\">");
        sb.append("<div style=\"max-width:480px;margin:0 auto;\">");

        sb.append("<p style=\"color:#f5f5f5;font-size:15px;line-height:1.5;margin:0 0 16px 0;\">Hallo ")
          .append(escape(manager.getUser() != null ? Optional.ofNullable(manager.getUser().getFirstName()).orElse(manager.getName()) : manager.getName()))
          .append("!</p>");

        sb.append("<div style=\"background:#242d38;border-left:3px solid #ed8936;padding:12px 16px;margin:0 0 16px 0;color:#e2e8f0;font-style:italic;border-radius:8px;\">")
          .append(renderIntroMarkdown(intro)).append("</div>");

        if (ownDayRank != null) {
            sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:16px;\"><tr>");
            
            sb.append("<td width=\"50%\" style=\"padding-right:4px;\">");
            sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;padding:16px;\">");
            sb.append("<div style=\"font-size:24px;font-weight:700;color:#c9a66b;\">").append(escape(season.getName())).append("</div>");
            sb.append("<div style=\"font-size:12px;color:#a0aec0;margin-top:4px;\">").append(roundNumber).append(". Spieltag</div>");
            sb.append("</div></td>");
            
            sb.append("<td width=\"50%\" style=\"padding-left:4px;\">");
            sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;padding:16px;\">");
            sb.append("<div style=\"font-size:24px;font-weight:700;color:#c9a66b;\">").append(nz(ownDayRank.getPointsTotal()));
            if (ownDayRank.getPointsRound() != null && ownDayRank.getPointsRound() > 0) {
                sb.append(" <span style=\"font-size:14px;color:#48bb78;\">↑").append(ownDayRank.getPointsRound()).append("</span>");
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

        if (comment != null && !comment.isBlank()) {
            sb.append("<div style=\"background:#242d38;border-left:3px solid #ed8936;border-radius:8px;padding:12px 16px;margin:16px 0;color:#e2e8f0;font-size:14px;line-height:1.5;white-space:pre-wrap;\">")
              .append(escape(comment)).append("</div>");
        }

        List<Player> scoringPlayers = collectScoringPlayers(manager, playerRankByPlayerId, pointsByPlayerId, roundNumber, transferRound);
        if (!scoringPlayers.isEmpty()) {
            sb.append("<h2 style=\"color:#c9a66b;font-size:16px;margin:16px 0 12px 0;\">Deine punktenden Spieler</h2>");
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

        if (rankingExcerpt != null && !rankingExcerpt.isEmpty()) {
            appendRankingTable(sb, rankingExcerpt, manager.getId(), prevRankByManagerId, managersById);
            if (webUrl != null && !webUrl.isBlank()) {
                String base = webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
                sb.append("<div style=\"margin-top:8px;text-align:right;font-size:12px;\">")
                  .append("<a href=\"").append(escape(base)).append("/managers\" style=\"color:#60a5fa;text-decoration:underline;\">")
                  .append("Gesamtrangliste</a></div>");
            }
        }

        List<RosterEntry> roster = collectFullRoster(manager, playerById);
        sb.append("<h2 style=\"color:#c9a66b;font-size:16px;margin:16px 0 12px 0;\">Deine ")
          .append(roster.size()).append(" Spieler</h2>");

        Map<Long, Integer> mePointsByPlayer = new HashMap<>();
        for (RosterEntry e : roster) {
            mePointsByPlayer.put(e.player.getId(),
                computePointsForMe(e, seasonRanksByPlayerId, transferRound, roundNumber));
        }
        roster.sort((a, b) -> Integer.compare(
            mePointsByPlayer.getOrDefault(b.player.getId(), 0),
            mePointsByPlayer.getOrDefault(a.player.getId(), 0)));

        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">");
        int rcol = 0;
        for (RosterEntry e : roster) {
            if (rcol == 0) sb.append("<tr>");
            sb.append("<td width=\"50%\" style=\"padding-right:4px;padding-bottom:8px;vertical-align:top;\">");
            appendRosterCard(sb, e, mePointsByPlayer.getOrDefault(e.player.getId(), 0),
                playerRankByPlayerId, teamsByPlayerId);
            sb.append("</td>");
            rcol++;
            if (rcol == 2) { sb.append("</tr>"); rcol = 0; }
        }
        if (rcol == 1) {
            sb.append("<td width=\"50%\" style=\"padding-left:4px;padding-bottom:8px;\"></td></tr>");
        }
        sb.append("</table>");

        if (managerGroups != null && !managerGroups.isEmpty()) {
            List<ManagerGroup> sortedGroups = managerGroups.stream()
                .sorted(Comparator.comparing(g -> Optional.ofNullable(g.getName()).orElse("")))
                .toList();
            for (ManagerGroup group : sortedGroups) {
                appendManagerGroupTable(sb, group, manager.getId(), dayRankByManagerId,
                    prevRankByManagerId, managersById);
            }
        }

        sb.append("<div style=\"margin-top:16px;color:#6b7280;font-size:12px;text-align:center;\">");
        if (webUrl != null && !webUrl.isBlank()) {
            sb.append("<div style=\"font-size:10px;color:#f5f5f5;margin-bottom:2px;\">Webseite</div>");
            sb.append("<a href=\"").append(escape(webUrl)).append("\" style=\"color:#60a5fa;text-decoration:underline;\">FFL - Fantasy Football League</a>");
        } else {
            sb.append("FFL - Fantasy Football League");
        }
        sb.append("</div>");
        sb.append("</div></body></html>");
        return sb.toString();
    }

    private static final class RankingRow {
        final ManagerRank rank;
        final boolean isGap;
        RankingRow(ManagerRank rank, boolean isGap) {
            this.rank = rank;
            this.isGap = isGap;
        }
    }

    private List<RankingRow> buildRankingExcerpt(List<ManagerRank> sortedByPos, Long ownManagerId) {
        if (sortedByPos == null || sortedByPos.isEmpty()) return List.of();
        int n = sortedByPos.size();
        int ownIdx = -1;
        for (int i = 0; i < n; i++) {
            if (sortedByPos.get(i).getManager().getId().equals(ownManagerId)) {
                ownIdx = i;
                break;
            }
        }
        java.util.TreeSet<Integer> indices = new java.util.TreeSet<>();
        for (int i = 0; i < Math.min(3, n); i++) indices.add(i);
        if (ownIdx >= 0) {
            for (int i = Math.max(0, ownIdx - 2); i <= Math.min(n - 1, ownIdx + 2); i++) {
                indices.add(i);
            }
        }
        int fill = 0;
        while (indices.size() < Math.min(5, n) && fill < n) {
            indices.add(fill);
            fill++;
        }

        List<RankingRow> rows = new ArrayList<>();
        Integer prevIdx = null;
        for (Integer idx : indices) {
            if (prevIdx != null && idx > prevIdx + 1) {
                rows.add(new RankingRow(null, true));
            }
            rows.add(new RankingRow(sortedByPos.get(idx), false));
            prevIdx = idx;
        }
        return rows;
    }

    private void appendRankingTable(StringBuilder sb, List<RankingRow> rows, Long ownManagerId,
                                     Map<Long, ManagerRank> prevRankByManagerId,
                                     Map<Long, Manager> managersById) {
        sb.append("<h2 style=\"color:#c9a66b;font-size:16px;margin:16px 0 12px 0;\">Gesamtrangliste (Ausschnitt)</h2>");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;font-size:13px;\">");
        sb.append("<tr style=\"background:#242d38;color:#a0aec0;font-size:11px;\">");
        sb.append("<th align=\"center\" style=\"padding:8px 4px;font-weight:500;border-bottom:1px solid #2d3748;\">Pos</th>");
        sb.append("<th align=\"center\" style=\"padding:8px 4px;font-weight:500;border-bottom:1px solid #2d3748;\">+/-</th>");
        sb.append("<th align=\"left\" style=\"padding:8px 8px;font-weight:500;border-bottom:1px solid #2d3748;\">Manager</th>");
        sb.append("<th align=\"right\" style=\"padding:8px 4px;font-weight:500;border-bottom:1px solid #2d3748;\">Pkt</th>");
        sb.append("<th align=\"right\" style=\"padding:8px 8px 8px 4px;font-weight:500;border-bottom:1px solid #2d3748;\">Sp.</th>");
        sb.append("</tr>");

        for (RankingRow row : rows) {
            if (row.isGap) {
                sb.append("<tr><td colspan=\"5\" align=\"center\" style=\"padding:4px;color:#6b7280;font-size:14px;border-bottom:1px solid #2d3748;\">…</td></tr>");
                continue;
            }
            ManagerRank mr = row.rank;
            Manager m = managersById.get(mr.getManager().getId());
            boolean isOwn = mr.getManager().getId().equals(ownManagerId);
            String bg = isOwn ? "background:#2d3748;border-left:3px solid #c9a66b;" : "";
            String nameColor = isOwn ? "#c9a66b" : "#f5f5f5";
            String fontWeight = isOwn ? "700" : "500";

            sb.append("<tr style=\"").append(bg).append("\">");
            sb.append("<td align=\"center\" style=\"padding:6px 4px;color:#f5f5f5;font-weight:").append(fontWeight).append(";border-bottom:1px solid #2d3748;\">")
              .append(nz(mr.getPositionTotal())).append(".</td>");

            sb.append("<td align=\"center\" style=\"padding:6px 4px;border-bottom:1px solid #2d3748;\">");
            ManagerRank prev = prevRankByManagerId.get(mr.getManager().getId());
            if (prev != null && prev.getPositionTotal() != null && mr.getPositionTotal() != null) {
                int diff = prev.getPositionTotal() - mr.getPositionTotal();
                if (diff > 0) {
                    sb.append("<span style=\"color:#48bb78;font-size:12px;\">↑").append(diff).append("</span>");
                } else if (diff < 0) {
                    sb.append("<span style=\"color:#f56565;font-size:12px;\">↓").append(Math.abs(diff)).append("</span>");
                } else {
                    sb.append("<span style=\"color:#6b7280;\">–</span>");
                }
            } else {
                sb.append("<span style=\"color:#6b7280;\">–</span>");
            }
            sb.append("</td>");

            String displayName = m != null && m.getShortName() != null && !m.getShortName().isBlank()
                ? m.getShortName()
                : (m != null ? m.getName() : "?");
            sb.append("<td align=\"left\" style=\"padding:6px 8px;color:").append(nameColor)
              .append(";font-weight:").append(fontWeight).append(";border-bottom:1px solid #2d3748;\">")
              .append(escape(displayName)).append("</td>");

            sb.append("<td align=\"right\" style=\"padding:6px 4px;color:#f5f5f5;font-weight:").append(fontWeight).append(";border-bottom:1px solid #2d3748;\">")
              .append(nz(mr.getPointsTotal())).append("</td>");

            sb.append("<td align=\"right\" style=\"padding:6px 8px 6px 4px;color:#a0aec0;border-bottom:1px solid #2d3748;\">")
              .append(nz(mr.getPointsRound())).append("</td>");

            sb.append("</tr>");
        }
        sb.append("</table>");
    }

    private void appendManagerGroupTable(StringBuilder sb, ManagerGroup group, Long ownManagerId,
                                          Map<Long, ManagerRank> dayRankByManagerId,
                                          Map<Long, ManagerRank> prevRankByManagerId,
                                          Map<Long, Manager> managersById) {
        List<ManagerRank> groupRanks = new ArrayList<>();
        for (Manager gm : group.getManagers()) {
            ManagerRank mr = dayRankByManagerId.get(gm.getId());
            if (mr != null && mr.getPositionTotal() != null) {
                groupRanks.add(mr);
            }
        }
        if (groupRanks.isEmpty()) return;
        groupRanks.sort(Comparator.comparingInt(ManagerRank::getPositionTotal));

        sb.append("<h2 style=\"color:#c9a66b;font-size:16px;margin:16px 0 12px 0;\">")
          .append(escape(group.getName())).append("</h2>");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid #c9a66b;border-radius:8px;font-size:13px;\">");
        sb.append("<tr style=\"background:#242d38;color:#a0aec0;font-size:11px;\">");
        sb.append("<th align=\"center\" style=\"padding:8px 4px;font-weight:500;border-bottom:1px solid #2d3748;\">Pos</th>");
        sb.append("<th align=\"center\" style=\"padding:8px 4px;font-weight:500;border-bottom:1px solid #2d3748;\">+/-</th>");
        sb.append("<th align=\"left\" style=\"padding:8px 8px;font-weight:500;border-bottom:1px solid #2d3748;\">Manager</th>");
        sb.append("<th align=\"right\" style=\"padding:8px 4px;font-weight:500;border-bottom:1px solid #2d3748;\">Pkt</th>");
        sb.append("<th align=\"right\" style=\"padding:8px 8px 8px 4px;font-weight:500;border-bottom:1px solid #2d3748;\">Sp.</th>");
        sb.append("</tr>");

        int groupPos = 0;
        for (ManagerRank mr : groupRanks) {
            groupPos++;
            Manager m = managersById.get(mr.getManager().getId());
            boolean isOwn = mr.getManager().getId().equals(ownManagerId);
            String bg = isOwn ? "background:#2d3748;border-left:3px solid #c9a66b;" : "";
            String nameColor = isOwn ? "#c9a66b" : "#f5f5f5";
            String fontWeight = isOwn ? "700" : "500";

            sb.append("<tr style=\"").append(bg).append("\">");
            sb.append("<td align=\"center\" style=\"padding:6px 4px;color:#f5f5f5;font-weight:").append(fontWeight).append(";border-bottom:1px solid #2d3748;\">")
              .append(groupPos).append(".</td>");

            sb.append("<td align=\"center\" style=\"padding:6px 4px;border-bottom:1px solid #2d3748;\">");
            ManagerRank prev = prevRankByManagerId.get(mr.getManager().getId());
            if (prev != null && prev.getPositionTotal() != null && mr.getPositionTotal() != null) {
                int diff = prev.getPositionTotal() - mr.getPositionTotal();
                if (diff > 0) {
                    sb.append("<span style=\"color:#48bb78;font-size:12px;\">↑").append(diff).append("</span>");
                } else if (diff < 0) {
                    sb.append("<span style=\"color:#f56565;font-size:12px;\">↓").append(Math.abs(diff)).append("</span>");
                } else {
                    sb.append("<span style=\"color:#6b7280;\">–</span>");
                }
            } else {
                sb.append("<span style=\"color:#6b7280;\">–</span>");
            }
            sb.append("</td>");

            String displayName = m != null && m.getShortName() != null && !m.getShortName().isBlank()
                ? m.getShortName()
                : (m != null ? m.getName() : "?");
            sb.append("<td align=\"left\" style=\"padding:6px 8px;color:").append(nameColor)
              .append(";font-weight:").append(fontWeight).append(";border-bottom:1px solid #2d3748;\">")
              .append(escape(displayName)).append("</td>");

            sb.append("<td align=\"right\" style=\"padding:6px 4px;color:#f5f5f5;font-weight:").append(fontWeight).append(";border-bottom:1px solid #2d3748;\">")
              .append(nz(mr.getPointsTotal())).append("</td>");

            sb.append("<td align=\"right\" style=\"padding:6px 8px 6px 4px;color:#a0aec0;border-bottom:1px solid #2d3748;\">")
              .append(nz(mr.getPointsRound())).append("</td>");

            sb.append("</tr>");
        }
        sb.append("</table>");
    }

    private static final class RosterEntry {
        final Player player;
        final String posLabel;
        final String posColor;
        final boolean activeHinrunde;
        final boolean activeRueckrunde;
        RosterEntry(Player player, String posLabel, String posColor,
                    boolean activeHinrunde, boolean activeRueckrunde) {
            this.player = player;
            this.posLabel = posLabel;
            this.posColor = posColor;
            this.activeHinrunde = activeHinrunde;
            this.activeRueckrunde = activeRueckrunde;
        }
    }

    private List<RosterEntry> collectFullRoster(Manager manager, Map<Long, Player> playerById) {
        List<RosterEntry> roster = new ArrayList<>();
        Player[] base = new Player[] {
            manager.getPlayerGoalkeeper(),
            manager.getPlayerDefender1(), manager.getPlayerDefender2(), manager.getPlayerDefender3(),
            manager.getPlayerMidfield1(), manager.getPlayerMidfield2(), manager.getPlayerMidfield3(),
            manager.getPlayerStriker1(), manager.getPlayerStriker2(), manager.getPlayerStriker3(),
            manager.getPlayerFreeChoice()
        };
        String[] labels = new String[] {
            "TW", "ABW", "ABW", "ABW", "MF", "MF", "MF", "ST", "ST", "ST", "FREI"
        };
        String[] colors = new String[] {
            "#48bb78", "#ed8936", "#ed8936", "#ed8936", "#c9a66b", "#c9a66b", "#c9a66b",
            "#a0aec0", "#a0aec0", "#a0aec0", "#f56565"
        };
        for (int i = 0; i < base.length; i++) {
            Player p = base[i];
            if (p == null) continue;
            boolean exchangedOut = isExchangedOld(manager, p);
            String label = labels[i];
            String color = colors[i];
            if ("FREI".equals(label)) {
                Player resolved = playerById.getOrDefault(p.getId(), p);
                label = positionLabelFromEnum(resolved.getPosition());
                color = positionColorFromEnum(resolved.getPosition());
            }
            roster.add(new RosterEntry(p, label, color, true, !exchangedOut));
        }
        Player[] news = new Player[] {
            manager.getPlayerExchangedNew1(),
            manager.getPlayerExchangedNew2(),
            manager.getPlayerExchangedNew3()
        };
        for (Player p : news) {
            if (p == null) continue;
            Player resolved = playerById.getOrDefault(p.getId(), p);
            String label = positionLabelFromEnum(resolved.getPosition());
            String color = positionColorFromEnum(resolved.getPosition());
            roster.add(new RosterEntry(resolved, label, color, false, true));
        }
        return roster;
    }

    private boolean isExchangedOld(Manager m, Player p) {
        if (p == null) return false;
        return p.equals(m.getPlayerExchangedOld1())
            || p.equals(m.getPlayerExchangedOld2())
            || p.equals(m.getPlayerExchangedOld3());
    }

    private int computePointsForMe(RosterEntry e,
                                    Map<Long, List<PlayerRank>> seasonRanksByPlayerId,
                                    int transferRound, int currentRound) {
        List<PlayerRank> ranks = seasonRanksByPlayerId.get(e.player.getId());
        if (ranks == null) return 0;
        int sum = 0;
        for (PlayerRank pr : ranks) {
            if (pr.getRound() == null || pr.getRound().getNumber() == null) continue;
            int rn = pr.getRound().getNumber();
            if (rn > currentRound) continue;
            boolean isRueckrunde = rn >= transferRound;
            boolean active = isRueckrunde ? e.activeRueckrunde : e.activeHinrunde;
            if (!active) continue;
            if (pr.getPointsRound() != null) sum += pr.getPointsRound();
        }
        return sum;
    }

    private String positionLabelFromEnum(Position pos) {
        if (pos == null) return "SP";
        return switch (pos) {
            case GOALKEEPER -> "TW";
            case DEFENDER -> "ABW";
            case MIDFIELD -> "MF";
            case STRIKER -> "ST";
        };
    }

    private String positionColorFromEnum(Position pos) {
        if (pos == null) return "#6b7280";
        return switch (pos) {
            case GOALKEEPER -> "#48bb78";
            case DEFENDER -> "#ed8936";
            case MIDFIELD -> "#c9a66b";
            case STRIKER -> "#a0aec0";
        };
    }

    private void appendRosterCard(StringBuilder sb, RosterEntry e, int mePoints,
                                   Map<Long, PlayerRank> playerRankByPlayerId,
                                   Map<Long, List<Team>> teamsByPlayerId) {
        Player player = e.player;
        PlayerRank pr = playerRankByPlayerId.get(player.getId());
        Integer pointsTotal = pr != null ? pr.getPointsTotal() : null;

        String teamName = "";
        List<Team> teams = teamsByPlayerId.get(player.getId());
        if (teams != null && !teams.isEmpty()) {
            teamName = teams.get(teams.size() - 1).getName();
        }

        sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid ")
          .append(e.posColor).append(";border-radius:8px;padding:12px;\">");

        sb.append("<div style=\"font-weight:600;color:#f5f5f5;font-size:14px;\">")
          .append(escape(truncate(player.getNameKicker(), 22))).append("</div>");

        if (!teamName.isEmpty()) {
            sb.append("<div style=\"margin-top:2px;color:#6b7280;font-size:11px;\">")
              .append(escape(truncate(teamName, 22))).append("</div>");
        }

        sb.append("<table cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:6px;\"><tr>");
        sb.append("<td><span style=\"display:inline-block;background:").append(e.posColor)
          .append(";color:#0f1419;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;line-height:1.2;\">")
          .append(escape(e.posLabel)).append("</span></td>");
        if (e.activeHinrunde && !e.activeRueckrunde) {
            sb.append("<td style=\"padding-left:4px;\"><span style=\"display:inline-block;background:#3b82f6;color:#0f1419;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;line-height:1.2;\">Nur Hin</span></td>");
        } else if (e.activeRueckrunde && !e.activeHinrunde) {
            sb.append("<td style=\"padding-left:4px;\"><span style=\"display:inline-block;background:#a855f7;color:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;line-height:1.2;\">Nur R&uuml;ck</span></td>");
        }
        sb.append("</tr></table>");

        int totalVal = pointsTotal != null ? pointsTotal : 0;
        boolean partial = !(e.activeHinrunde && e.activeRueckrunde);
        sb.append("<div style=\"margin-top:8px;font-size:18px;font-weight:700;color:#c9a66b;\">")
          .append(mePoints).append(" Pkt");
        if (partial) {
            sb.append(" <span style=\"font-size:11px;font-weight:600;color:#a0aec0;\">(")
              .append(totalVal).append(" Pkt)</span>");
        }
        sb.append("</div>");

        sb.append("</div>");
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        if (s.length() <= max) return s;
        return s.substring(0, Math.max(1, max - 1)) + "\u2026";
    }

    private List<Player> collectScoringPlayers(Manager manager,
                                                Map<Long, PlayerRank> playerRankByPlayerId,
                                                Map<Long, List<Points>> pointsByPlayerId,
                                                int roundNumber, int transferRound) {
        List<Player> candidates = new ArrayList<>();
        Player[] base = new Player[] {
            manager.getPlayerGoalkeeper(),
            manager.getPlayerDefender1(), manager.getPlayerDefender2(), manager.getPlayerDefender3(),
            manager.getPlayerMidfield1(), manager.getPlayerMidfield2(), manager.getPlayerMidfield3(),
            manager.getPlayerStriker1(), manager.getPlayerStriker2(), manager.getPlayerStriker3(),
            manager.getPlayerFreeChoice()
        };
        boolean isRueckrunde = roundNumber >= transferRound;
        for (Player p : base) {
            if (p == null) continue;
            if (isRueckrunde && isExchangedOld(manager, p)) continue;
            candidates.add(p);
        }
        if (isRueckrunde) {
            Player[] news = new Player[] {
                manager.getPlayerExchangedNew1(),
                manager.getPlayerExchangedNew2(),
                manager.getPlayerExchangedNew3()
            };
            for (Player p : news) {
                if (p != null) candidates.add(p);
            }
        }
        List<Player> scoringPlayers = new ArrayList<>();
        for (Player p : candidates) {
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

        String posLabel = positionLabelFromEnum(player.getPosition());
        String posColor = positionColorFromEnum(player.getPosition());

        sb.append("<div style=\"background:#1a2028;border:1px solid #2d3748;border-left:3px solid ").append(posColor).append(";border-radius:8px;padding:12px;\">");
        
        sb.append("<div style=\"font-weight:600;color:#f5f5f5;font-size:14px;\">").append(escape(player.getNameKicker())).append("</div>");
        
        if (!teamName.isEmpty()) {
            sb.append("<div style=\"margin-top:2px;color:#6b7280;font-size:11px;\">").append(escape(teamName)).append("</div>");
        }

        sb.append("<div style=\"margin-top:8px;font-size:18px;font-weight:700;color:#c9a66b;\">").append(pointsRound).append(" Pkt</div>");

        List<Points> playerPoints = pointsByPlayerId.getOrDefault(player.getId(), List.of());
        Map<Rule, Integer> ruleCounts = new HashMap<>();
        for (Points p : playerPoints) {
            ruleCounts.merge(p.getRule(), 1, Integer::sum);
        }

        sb.append("<div style=\"margin-top:6px;\">");
        sb.append("<span style=\"display:inline-block;background:").append(posColor)
          .append(";color:#0f1419;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;margin-right:4px;margin-bottom:2px;\">")
          .append(escape(posLabel)).append("</span>");
        if (!ruleCounts.isEmpty()) {
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
        }
        sb.append("</div>");

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
        return positionLabelFromEnum(player.getPosition());
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
        return positionColorFromEnum(player.getPosition());
    }

    private String getRuleLabel(Rule rule) {
        return switch (rule) {
            case GOAL_STRIKER -> "Tor ST";
            case GOAL_MIDFIELDER -> "Tor MF";
            case GOAL_DEFENDER -> "Tor ABW";
            case TO_NULL_GOALKEEPER -> "Zu Null TW";
            case TO_NULL_DEFENDER -> "Zu Null ABW";
            case GOAL_GOALKEEPER -> "Tor TW";
            case GOAL_GOALKEEPER_BY_PENALTY -> "Tor TW (Elfer)";
        };
    }

    private static int nz(Integer v) { return v != null ? v : 0; }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String renderIntroMarkdown(String s) {
        if (s == null) return "";
        String escaped = escape(s);
        return escaped.replaceAll("\\*\\*(.+?)\\*\\*",
            "<strong style=\"color:#f5f5f5;font-style:normal;\">$1</strong>");
    }
}
