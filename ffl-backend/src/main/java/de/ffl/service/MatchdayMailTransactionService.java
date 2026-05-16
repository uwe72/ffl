package de.ffl.service;

import de.ffl.domain.Game;
import de.ffl.domain.MailTheme;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(MatchdayMailTransactionService.class);

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
                           SystemConfig config, String comment, boolean testMode) {
        try {
            send(emitter, "Lade Spieltags-Daten…");

            Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Saison " + seasonId + " nicht gefunden"));

            List<Manager> allManagersInSeason = managerRepository.findBySeasonIdWithPlayers(seasonId);
            log.info("Geladene Manager:");
            for (Manager m : allManagersInSeason) {
                log.info("  Manager ID={}, Name={}, mailTheme={}", m.getId(), m.getName(), m.getMailTheme());
            }
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

            double avgPointsRound = managerPoints.stream()
                .mapToInt(m -> (Integer) m.getOrDefault("pointsRound", 0))
                .average()
                .orElse(0.0);

            Map<String, Object> summary = new HashMap<>();
            summary.put("avgPointsRound", (int) Math.round(avgPointsRound));
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
                    send(emitter, "✗ [" + manager.getId() + "] " + (manager.getShortName() != null ? manager.getShortName() + " - " : "") + manager.getName() + " hat keine Mailadresse");
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
                        rankingExcerpt, managersById, managerGroups, dayRankByManagerId, comment,
                        manager.getMailTheme());

                    helper.setText(html, true);
                    if (!testMode) {
                        mailSender.send(msg);
                    }
                    send(emitter, (testMode ? "[TEST] " : "") + "✓ [" + manager.getId() + "] " + (manager.getShortName() != null ? manager.getShortName() + " - " : "") + manager.getName() + " (" + recipientEmail + ") " + (manager.getMailTheme() != null ? manager.getMailTheme().name() : "LIGHTMODE"));
                    sent++;

                    Thread.sleep(1000);

                    if (sent % 50 == 0 && sent < managerIds.size()) {
                        for (int remaining = 90; remaining > 0; remaining--) {
                            send(emitter, "⏳ " + sent + " Mails versendet, warte " + remaining + " Sekunden...");
                            Thread.sleep(1000);
                        }
                        send(emitter, "⏳ Wartezeit beendet, weiter mit nächstem Block...");
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    send(emitter, "✗ Versand unterbrochen: " + e.getMessage());
                    failed++;
                } catch (Exception e) {
                    send(emitter, "✗ [" + manager.getId() + "] " + (manager.getShortName() != null ? manager.getShortName() + " - " : "") + manager.getName() + " (" + recipientEmail + "): " + e.getMessage());
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
                                        String comment,
                                        MailTheme mailTheme) {
        boolean isDark = mailTheme == MailTheme.DARKMODE;
        
        String bodyBg = "#f5f5f7";
        String bodyText = "#0a0a0a";
        String cardBg = isDark ? "#1a1a1a" : "#ffffff";
        String cardBgAlt = isDark ? "#1a1a1a" : "#f0f0f0";
        String textPrimary = isDark ? "#ffffff" : "#0a0a0a";
        String textSecondary = isDark ? "#9a9a9a" : "#1a3a5c";
        String textTertiary = isDark ? "#6b6b6b" : "#1a3a5c";
        String linkColor = isDark ? "#7aa2d4" : "#0056CC";
        String highlightRow = "#FFD60A";
        String bigNumColor = isDark ? "#FFD60A" : "#1a3a5c";
        
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:").append(bodyBg).append(";color:").append(bodyText).append(";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px 2px;margin:0;\">");
        sb.append("<div style=\"max-width:600px;margin:0 auto;\">");

        sb.append("<p style=\"color:").append(textTertiary).append(";font-size:15px;font-weight:700;line-height:1.5;margin:0 0 14px 0;\">Hallo ")
          .append(escape(manager.getUser() != null ? Optional.ofNullable(manager.getUser().getFirstName()).orElse(manager.getName()) : manager.getName()))
          .append("!</p>");

        String introCardStyle = "background:" + cardBgAlt + ";padding:12px 14px;margin:0 0 14px 0;color:" + textPrimary + ";font-size:13px;line-height:1.5;border-radius:12px;border:1px solid #555555;";
        if (!isDark) {
            introCardStyle = "background:" + cardBgAlt + ";padding:12px 14px;margin:0 0 14px 0;color:" + textPrimary + ";font-size:13px;line-height:1.5;border-radius:12px;border:1px solid #c0c0c0;";
        }
        sb.append("<div style=\"").append(introCardStyle).append("\">")
          .append("<span style=\"color:#FFD60A;margin-right:6px;\">\u2605</span>")
          .append(renderIntroMarkdown(intro, textPrimary)).append("</div>");

        if (ownDayRank != null) {
             String cardStyle = "background:" + cardBg + ";border-radius:12px;padding:12px 14px;border:1px solid #555555;";
             if (!isDark) {
                 cardStyle = "background:" + cardBg + ";border-radius:12px;padding:12px 14px;border:1px solid #c0c0c0;";
             }
             String bigNum = "font-size:22px;font-weight:800;color:" + bigNumColor + ";line-height:1.1;";
             String label = "font-size:11px;color:" + textSecondary + ";margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;";
             String badgeUp = isDark 
                 ? "display:inline-block;background:rgba(48,209,88,0.18);color:#30D158;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:600;margin-left:6px;vertical-align:middle;"
                 : "display:inline-block;background:rgba(48,209,88,0.15);color:#248a3d;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:600;margin-left:6px;vertical-align:middle;";
             String badgeDown = isDark
                 ? "display:inline-block;background:rgba(255,69,58,0.18);color:#FF453A;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:600;margin-left:6px;vertical-align:middle;"
                 : "display:inline-block;background:rgba(255,69,58,0.15);color:#d73527;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:600;margin-left:6px;vertical-align:middle;";

            sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:14px;\"><tr>");
            sb.append("<td width=\"50%\" style=\"padding-right:6px;\">");
            sb.append("<div style=\"").append(cardStyle).append("\">");
            sb.append("<div style=\"").append(bigNum).append("\">").append(nz(ownDayRank.getPointsTotal()));
            if (ownDayRank.getPointsRound() != null && ownDayRank.getPointsRound() > 0) {
                sb.append("<span style=\"").append(badgeUp).append("\">\u2191").append(ownDayRank.getPointsRound()).append("</span>");
            }
            sb.append("</div>");
            sb.append("<div style=\"").append(label).append("\">Punkte gesamt</div>");
            sb.append("</div></td>");


            sb.append("<td width=\"50%\" style=\"padding-left:6px;\">");
            sb.append("<div style=\"").append(cardStyle).append("\">");
            sb.append("<div style=\"").append(bigNum).append("\">").append(nz(ownDayRank.getPositionTotal())).append(".");
            ManagerRank prevRank = prevRankByManagerId.get(manager.getId());
            if (prevRank != null && prevRank.getPositionTotal() != null) {
                int diff = prevRank.getPositionTotal() - ownDayRank.getPositionTotal();
                if (diff > 0) {
                    sb.append("<span style=\"").append(badgeUp).append("\">\u2191").append(diff).append("</span>");
                } else if (diff < 0) {
                    sb.append("<span style=\"").append(badgeDown).append("\">\u2193").append(Math.abs(diff)).append("</span>");
                }
            }
            sb.append("</div>");
            sb.append("<div style=\"").append(label).append("\">Position gesamt</div>");
            sb.append("</div></td>");

            sb.append("</tr></table>");
        }

        if (comment != null && !comment.isBlank()) {
            String commentCardStyle = "background:" + cardBgAlt + ";border-radius:12px;padding:12px 14px;margin:0 0 14px 0;color:" + textPrimary + ";font-size:13px;line-height:1.5;white-space:pre-wrap;border:1px solid #555555;";
            if (!isDark) {
                commentCardStyle = "background:" + cardBgAlt + ";border-radius:12px;padding:12px 14px;margin:0 0 14px 0;color:" + textPrimary + ";font-size:13px;line-height:1.5;white-space:pre-wrap;border:1px solid #c0c0c0;";
            }
            sb.append("<div style=\"").append(commentCardStyle).append("\">")
              .append(escape(comment)).append("</div>");
        }

        List<RosterEntry> roster = collectFullRoster(manager, playerById);
        Map<Long, Integer> mePointsByPlayer = new HashMap<>();
        for (RosterEntry e : roster) {
            mePointsByPlayer.put(e.player.getId(),
                computePointsForMe(e, seasonRanksByPlayerId, transferRound, roundNumber));
        }
        roster.sort((a, b) -> Integer.compare(
            mePointsByPlayer.getOrDefault(b.player.getId(), 0),
            mePointsByPlayer.getOrDefault(a.player.getId(), 0)));
        appendRosterTable(sb, roster, mePointsByPlayer, playerRankByPlayerId, teamsByPlayerId, roundNumber, transferRound, isDark, textPrimary, textSecondary, textTertiary, cardBg);

        if (rankingExcerpt != null && !rankingExcerpt.isEmpty()) {
            appendRankingTable(sb, rankingExcerpt, manager.getId(), prevRankByManagerId, managersById, isDark, textPrimary, textSecondary, textTertiary);
            if (webUrl != null && !webUrl.isBlank()) {
                String base = webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
                sb.append("<div style=\"margin-top:8px;text-align:right;font-size:12px;\">")
                  .append("<a href=\"").append(escape(base)).append("/managers\" style=\"color:").append(linkColor).append(";text-decoration:none;\">")
                  .append("Gesamtrangliste</a></div>");
            }
        }

        if (managerGroups != null && !managerGroups.isEmpty()) {
            List<ManagerGroup> sortedGroups = managerGroups.stream()
                .sorted(Comparator.comparing(g -> Optional.ofNullable(g.getName()).orElse("")))
                .toList();
            for (ManagerGroup group : sortedGroups) {
                appendManagerGroupTable(sb, group, manager.getId(), dayRankByManagerId,
                    prevRankByManagerId, managersById, isDark, textPrimary, textSecondary, textTertiary, cardBg);
            }
        }

        sb.append("<div style=\"margin-top:24px;color:").append(textTertiary).append(";font-size:12px;text-align:center;\">");
        if (webUrl != null && !webUrl.isBlank()) {
            sb.append("<div style=\"font-size:10px;font-weight:700;color:").append(textSecondary).append(";margin-bottom:2px;\">Webseite</div>");
            sb.append("<a href=\"").append(escape(webUrl)).append("\" style=\"color:").append(linkColor).append(";font-weight:700;text-decoration:none;\">FFL - Fantasy Football League</a>");
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
                                     Map<Long, Manager> managersById,
                                     boolean isDark, String textPrimary, String textSecondary, String textTertiary) {
        sb.append("<div style=\"color:").append(textTertiary).append(";font-size:13px;font-weight:700;margin:18px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;\">Gesamtrangliste (Ausschnitt)</div>");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;");
        if (!isDark) {
            sb.append("border:1px solid #c0c0c0;\"");
        } else {
            sb.append("border:1px solid #555555;\"");
        }
        sb.append(">");
        sb.append("<tr style=\"color:").append(textSecondary).append(";font-size:11px;");
        if (!isDark) {
            sb.append("background:#f0f0f0;");
        } else {
            sb.append("background:#1c1c1e;");
        }
        sb.append("\">");
        sb.append("<th align=\"center\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Pos</th>");
        sb.append("<th align=\"center\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">+/-</th>");
        sb.append("<th align=\"left\" style=\"padding:7px 8px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Manager</th>");
        sb.append("<th align=\"right\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Pkt</th>");
        sb.append("<th align=\"right\" style=\"padding:7px 10px 7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Sp.</th>");
        sb.append("</tr>");

        int rowIndex = 0;
        for (RankingRow row : rows) {
            if (row.isGap) {
                sb.append("<tr><td colspan=\"5\" align=\"center\" style=\"padding:4px;color:").append(textTertiary).append(";font-size:14px;");
                if (!isDark) sb.append("border-left:1px solid #c0c0c0;border-right:1px solid #c0c0c0;");
                else sb.append("border-left:1px solid #555555;border-right:1px solid #555555;");
                sb.append("\">…</td></tr>");
                continue;
            }
            ManagerRank mr = row.rank;
            Manager m = managersById.get(mr.getManager().getId());
            boolean isOwn = mr.getManager().getId().equals(ownManagerId);
            String rowBg;
            String cellBorder;
            if (isOwn) {
                rowBg = "background:#FFD60A;";
                cellBorder = isDark ? "border:1px solid #555555;" : "border:1px solid #c0c0c0;";
            } else if (!isDark) {
                rowBg = rowIndex % 2 == 0 ? "background:#ffffff;" : "background:#f5f5f5;";
                cellBorder = "border:1px solid #c0c0c0;";
            } else {
                rowBg = rowIndex % 2 == 0 ? "background:#000000;" : "background:#2a2a2a;";
                cellBorder = "border:1px solid #555555;";
            }
            rowIndex++;
            String textColor = isOwn ? "#000000" : textPrimary;
            String secondary = isOwn ? "#000000" : textSecondary;
            String fontWeight = isOwn ? "700" : "500";

            sb.append("<tr style=\"").append(rowBg).append("\">");
            sb.append("<td align=\"center\" style=\"padding:7px 6px;color:").append(textColor).append(";font-weight:").append(fontWeight).append(";").append(cellBorder).append("\">")
              .append(nz(mr.getPositionTotal())).append(".</td>");

            sb.append("<td align=\"center\" style=\"padding:7px 6px;").append(cellBorder).append("\">");
            ManagerRank prev = prevRankByManagerId.get(mr.getManager().getId());
            if (prev != null && prev.getPositionTotal() != null && mr.getPositionTotal() != null) {
                int diff = prev.getPositionTotal() - mr.getPositionTotal();
                if (diff > 0) {
                    sb.append("<span style=\"color:").append(isOwn ? "#000000" : "#30D158").append(";font-size:12px;font-weight:600;\">↑").append(diff).append("</span>");
                } else if (diff < 0) {
                    sb.append("<span style=\"color:").append(isOwn ? "#000000" : "#FF453A").append(";font-size:12px;font-weight:600;\">↓").append(Math.abs(diff)).append("</span>");
                } else {
                    sb.append("<span style=\"color:").append(secondary).append(";\">–</span>");
                }
            } else {
                sb.append("<span style=\"color:").append(secondary).append(";\">–</span>");
            }
            sb.append("</td>");

            String displayName = m != null ? buildManagerDisplayName(m) : "?";
            sb.append("<td align=\"left\" style=\"padding:7px 8px;").append(cellBorder).append("\">");
            sb.append("<div style=\"color:").append(textColor).append(";font-weight:").append(fontWeight).append(";font-size:13px;line-height:1.2;\">")
              .append(escape(displayName)).append("</div>");
            if (m != null && m.getUser() != null && m.getUser().getLogin() != null && !m.getUser().getLogin().isBlank()) {
                sb.append("<div style=\"color:").append(secondary).append(";font-size:11px;margin-top:2px;line-height:1.2;\">")
                  .append(escape(m.getUser().getLogin())).append("</div>");
            }
            sb.append("</td>");

            sb.append("<td align=\"right\" style=\"padding:7px 6px;color:").append(textColor).append(";font-weight:").append(fontWeight).append(";").append(cellBorder).append("\">")
              .append(nz(mr.getPointsTotal())).append("</td>");

            sb.append("<td align=\"right\" style=\"padding:7px 10px 7px 6px;color:").append(secondary).append(";").append(cellBorder).append("\">")
              .append(nz(mr.getPointsRound())).append("</td>");

            sb.append("</tr>");
        }
        sb.append("</table>");
    }

    private void appendManagerGroupTable(StringBuilder sb, ManagerGroup group, Long ownManagerId,
                                          Map<Long, ManagerRank> dayRankByManagerId,
                                          Map<Long, ManagerRank> prevRankByManagerId,
                                          Map<Long, Manager> managersById,
                                          boolean isDark, String textPrimary, String textSecondary, String textTertiary, String cardBg) {
        List<ManagerRank> groupRanks = new ArrayList<>();
        for (Manager gm : group.getManagers()) {
            ManagerRank mr = dayRankByManagerId.get(gm.getId());
            if (mr != null && mr.getPositionTotal() != null) {
                groupRanks.add(mr);
            }
        }
        if (groupRanks.isEmpty()) return;
        groupRanks.sort(Comparator.comparingInt(ManagerRank::getPositionTotal));

        sb.append("<div style=\"color:").append(textTertiary).append(";font-size:13px;font-weight:700;margin:18px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;\">")
          .append(escape(group.getName())).append("</div>");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;");
        if (!isDark) {
            sb.append("border:1px solid #c0c0c0;\"");
        } else {
            sb.append("border:1px solid #555555;\"");
        }
        sb.append(">");
        sb.append("<tr style=\"color:").append(textSecondary).append(";font-size:11px;");
        if (!isDark) {
            sb.append("background:#f0f0f0;");
        } else {
            sb.append("background:#1c1c1e;");
        }
        sb.append("\">");
        sb.append("<th align=\"center\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Pos</th>");
        sb.append("<th align=\"center\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">+/-</th>");
        sb.append("<th align=\"left\" style=\"padding:7px 8px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Manager</th>");
        sb.append("<th align=\"right\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Pkt</th>");
        sb.append("<th align=\"right\" style=\"padding:7px 10px 7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Sp.</th>");
        sb.append("</tr>");

        int rowIndex = 0;
        for (ManagerRank mr : groupRanks) {
            Manager m = managersById.get(mr.getManager().getId());
            boolean isOwn = mr.getManager().getId().equals(ownManagerId);
            String rowBg;
            String cellBorder;
            if (isOwn) {
                rowBg = "background:#FFD60A;";
                cellBorder = isDark ? "border:1px solid #555555;" : "border:1px solid #c0c0c0;";
            } else if (!isDark) {
                rowBg = rowIndex % 2 == 0 ? "background:#ffffff;" : "background:#f5f5f5;";
                cellBorder = "border:1px solid #c0c0c0;";
            } else {
                rowBg = rowIndex % 2 == 0 ? "background:#000000;" : "background:#2a2a2a;";
                cellBorder = "border:1px solid #555555;";
            }
            rowIndex++;
            String textColor = isOwn ? "#000000" : textPrimary;
            String secondary = isOwn ? "#000000" : textSecondary;
            String fontWeight = isOwn ? "700" : "500";

            sb.append("<tr style=\"").append(rowBg).append("\">");
            sb.append("<td align=\"center\" style=\"padding:7px 6px;color:").append(textColor).append(";font-weight:").append(fontWeight).append(";").append(cellBorder).append("\">")
              .append(mr.getPositionTotal()).append(".</td>");

            sb.append("<td align=\"center\" style=\"padding:7px 6px;").append(cellBorder).append("\">");
            ManagerRank prev = prevRankByManagerId.get(mr.getManager().getId());
            if (prev != null && prev.getPositionTotal() != null && mr.getPositionTotal() != null) {
                int diff = prev.getPositionTotal() - mr.getPositionTotal();
                if (diff > 0) {
                    sb.append("<span style=\"color:").append(isOwn ? "#000000" : "#30D158").append(";font-size:12px;font-weight:600;\">↑").append(diff).append("</span>");
                } else if (diff < 0) {
                    sb.append("<span style=\"color:").append(isOwn ? "#000000" : "#FF453A").append(";font-size:12px;font-weight:600;\">↓").append(Math.abs(diff)).append("</span>");
                } else {
                    sb.append("<span style=\"color:").append(secondary).append(";\">–</span>");
                }
            } else {
                sb.append("<span style=\"color:").append(secondary).append(";\">–</span>");
            }
            sb.append("</td>");

            String displayName = m != null ? buildManagerDisplayName(m) : "?";
            sb.append("<td align=\"left\" style=\"padding:7px 8px;").append(cellBorder).append("\">");
            sb.append("<div style=\"color:").append(textColor).append(";font-weight:").append(fontWeight).append(";font-size:13px;line-height:1.2;\">")
              .append(escape(displayName)).append("</div>");
            if (m != null && m.getUser() != null && m.getUser().getLogin() != null && !m.getUser().getLogin().isBlank()) {
                sb.append("<div style=\"color:").append(secondary).append(";font-size:11px;margin-top:2px;line-height:1.2;\">")
                  .append(escape(m.getUser().getLogin())).append("</div>");
            }
            sb.append("</td>");

            sb.append("<td align=\"right\" style=\"padding:7px 6px;color:").append(textColor).append(";font-weight:").append(fontWeight).append(";").append(cellBorder).append("\">")
              .append(nz(mr.getPointsTotal())).append("</td>");

            sb.append("<td align=\"right\" style=\"padding:7px 10px 7px 6px;color:").append(secondary).append(";").append(cellBorder).append("\">")
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
            "#30D158", "#FF9F0A", "#FF9F0A", "#FF9F0A", "#FF2D55", "#FF2D55", "#FF2D55",
            "#0A84FF", "#0A84FF", "#0A84FF", "#BF5AF2"
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
        if (pos == null) return "#6b6b6b";
        return switch (pos) {
            case GOALKEEPER -> "#30D158";
            case DEFENDER -> "#FF9F0A";
            case MIDFIELD -> "#FF2D55";
            case STRIKER -> "#0A84FF";
        };
    }

    private static String shortenPlayerName(String full) {
        if (full == null) return "";
        String trimmed = full.trim();
        if (trimmed.isEmpty()) return trimmed;
        String[] parts = trimmed.split("\\s+");
        if (parts.length < 2) return trimmed;
        String first = parts[0];
        String initial = first.substring(0, 1).toUpperCase() + ".";
        StringBuilder rest = new StringBuilder();
        for (int i = 1; i < parts.length; i++) {
            if (i > 1) rest.append(" ");
            rest.append(parts[i]);
        }
        return initial + " " + rest.toString();
    }

    private String positionBadgeTextColor(String hex, boolean isDark) {
        if (isDark) return hex;
        return switch (hex) {
            case "#30D158" -> "#1a6b2e";
            case "#FF9F0A" -> "#8B5A00";
            case "#FF2D55" -> "#a80020";
            case "#0A84FF" -> "#0A5CC8";
            case "#BF5AF2" -> "#7B2FB0";
            default -> "#333333";
        };
    }

    private String positionDarkBgFromHex(String hex, boolean isDark) {
        if (isDark) {
            return switch (hex) {
                case "#30D158" -> "#0F3D1E";
                case "#FF9F0A" -> "#3D2806";
                case "#FF2D55" -> "#3D060F";
                case "#0A84FF" -> "#062A4D";
                case "#BF5AF2" -> "#2D1347";
                default -> "#2a2a2a";
            };
        } else {
            return switch (hex) {
                case "#30D158" -> "#c8f0d0";
                case "#FF9F0A" -> "#ffe4c0";
                case "#FF2D55" -> "#FFD6E0";
                case "#0A84FF" -> "#c0d8ff";
                case "#BF5AF2" -> "#e8c0ff";
                default -> "#e8e8e8";
            };
        }
    }

    private void appendRosterTable(StringBuilder sb, List<RosterEntry> roster,
                                    Map<Long, Integer> mePointsByPlayer,
                                    Map<Long, PlayerRank> playerRankByPlayerId,
                                    Map<Long, List<Team>> teamsByPlayerId,
                                    int roundNumber, int transferRound,
                                    boolean isDark, String textPrimary, String textSecondary, String textTertiary, String cardBg) {
        boolean isRueckrundeCurrent = roundNumber >= transferRound;
        sb.append("<div style=\"color:").append(textTertiary).append(";font-size:13px;font-weight:700;margin:18px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;\">Deine ")
          .append(roster.size()).append(" Spieler</div>");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;border-collapse:collapse;");
        if (!isDark) {
            sb.append("border:1px solid #c0c0c0;\"");
        } else {
            sb.append("border:1px solid #555555;\"");
        }
        sb.append(">");
        sb.append("<tr style=\"color:").append(textSecondary).append(";font-size:11px;");
        if (!isDark) {
            sb.append("background:#f0f0f0;");
        } else {
            sb.append("background:#1c1c1e;");
        }
        sb.append("\">");
        sb.append("<th align=\"center\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">#</th>");
        sb.append("<th align=\"left\" style=\"padding:7px 8px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Spieler</th>");
        sb.append("<th align=\"center\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Pos</th>");
        sb.append("<th align=\"right\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Pkt</th>");
        sb.append("<th align=\"right\" style=\"padding:7px 10px 7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">Sp.</th>");
        sb.append("<th align=\"center\" style=\"padding:7px 6px;font-weight:500;");
        if (!isDark) sb.append("border:1px solid #c0c0c0;"); else sb.append("border:1px solid #555555;");
        sb.append("\">H/R</th>");
        sb.append("</tr>");

        int rowIndex = 0;
        for (RosterEntry e : roster) {
            Player player = e.player;
            PlayerRank pr = playerRankByPlayerId.get(player.getId());
            Integer positionTotal = pr != null ? pr.getPositionTotal() : null;
            int mePoints = mePointsByPlayer.getOrDefault(player.getId(), 0);
            boolean activeNow = isRueckrundeCurrent ? e.activeRueckrunde : e.activeHinrunde;
            int pointsRound = activeNow && pr != null && pr.getPointsRound() != null ? pr.getPointsRound() : 0;
            boolean scoredToday = pointsRound > 0;

            String textColor = textPrimary;
            String secondary = textSecondary;
            String fontWeight = "500";

            String teamName = "";
            List<Team> teams = teamsByPlayerId.get(player.getId());
            if (teams != null && !teams.isEmpty()) {
                teamName = teams.get(teams.size() - 1).getName();
            }

            String darkBg = positionDarkBgFromHex(e.posColor, isDark);

            String rowBg;
            String cellBorder;
            if (!isDark) {
                rowBg = rowIndex % 2 == 0 ? "background:#ffffff;" : "background:#f5f5f5;";
                cellBorder = "border:1px solid #c0c0c0;";
            } else {
                rowBg = rowIndex % 2 == 0 ? "background:#000000;" : "background:#2a2a2a;";
                cellBorder = "border:1px solid #555555;";
            }
            rowIndex++;

            sb.append("<tr style=\"").append(rowBg).append("\">");

            sb.append("<td align=\"center\" style=\"padding:7px 6px;color:").append(textColor)
              .append(";font-weight:").append(fontWeight).append(";").append(cellBorder).append("\">");
            if (positionTotal != null) {
                sb.append(positionTotal).append(".");
            } else {
                sb.append("–");
            }
            sb.append("</td>");

            sb.append("<td align=\"left\" style=\"padding:7px 8px;").append(cellBorder).append("\">");
            sb.append("<div style=\"color:").append(textColor).append(";font-weight:600;font-size:13px;line-height:1.2;white-space:nowrap;\">")
              .append("<span style=\"vertical-align:middle;\">")
              .append(escape(shortenPlayerName(player.getNameKicker())))
              .append("</span>");
            sb.append("</div>");
            if (!teamName.isEmpty()) {
                sb.append("<div style=\"color:").append(secondary).append(";font-size:11px;margin-top:2px;line-height:1.2;white-space:nowrap;\">")
                  .append(escape(teamName))
                  .append("</div>");
            }
            sb.append("</td>");

            sb.append("<td align=\"center\" style=\"padding:7px 6px;").append(cellBorder).append("\">");
            sb.append("<span style=\"display:inline-block;background:").append(darkBg)
              .append(";color:").append(positionBadgeTextColor(e.posColor, isDark))
              .append(";padding:3px 8px;border-radius:9px;font-size:10px;font-weight:700;line-height:1.2;letter-spacing:0.3px;\">")
              .append(escape(e.posLabel)).append("</span>");
            sb.append("</td>");

            sb.append("<td align=\"right\" style=\"padding:7px 6px;color:").append(textColor)
              .append(";font-weight:").append(fontWeight).append(";white-space:nowrap;").append(cellBorder).append("\">")
              .append(mePoints).append("</td>");

            sb.append("<td align=\"right\" style=\"padding:7px 10px 7px 6px;").append(cellBorder).append("\">");
            if (scoredToday) {
                sb.append("<span style=\"display:inline-block;background:#FFD60A;color:#000;font-weight:700;padding:2px 8px;border-radius:9px;font-size:12px;\">+")
                  .append(pointsRound).append("</span>");
            }
            sb.append("</td>");

            sb.append("<td align=\"center\" style=\"padding:7px 6px;").append(cellBorder).append("\">");
            if (e.activeHinrunde && !e.activeRueckrunde) {
                sb.append("<span style=\"display:inline-block;background:#0A84FF;color:#ffffff;padding:1px 7px;border-radius:9px;font-size:10px;font-weight:600;line-height:1.2;\">HR</span>");
            } else if (e.activeRueckrunde && !e.activeHinrunde) {
                sb.append("<span style=\"display:inline-block;background:#BF5AF2;color:#ffffff;padding:1px 7px;border-radius:9px;font-size:10px;font-weight:600;line-height:1.2;\">RR</span>");
            }
            sb.append("</td>");
            sb.append("</tr>");
        }
        sb.append("</table>");
    }

    private void appendScoringPlayersTable(StringBuilder sb, List<Player> scoringPlayers, Manager manager,
                                            Map<Long, PlayerRank> playerRankByPlayerId,
                                            Map<Long, List<Team>> teamsByPlayerId) {
        sb.append("<div style=\"color:#4a4a4a;font-size:13px;font-weight:700;margin:18px 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;\">Deine punktenden Spieler</div>");
        sb.append("<div style=\"background:#1c1c1e;border-radius:12px;padding:6px;\">");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size:13px;\">");
        sb.append("<tr style=\"color:#9a9a9a;font-size:11px;\">");
        sb.append("<th align=\"center\" style=\"padding:7px 6px;font-weight:500;\">Pos</th>");
        sb.append("<th align=\"left\" style=\"padding:7px 8px;font-weight:500;\">Spieler</th>");
        sb.append("<th align=\"right\" style=\"padding:7px 10px 7px 6px;font-weight:500;\">Pkt</th>");
        sb.append("</tr>");

        for (Player player : scoringPlayers) {
            PlayerRank pr = playerRankByPlayerId.get(player.getId());
            int pointsRound = pr != null && pr.getPointsRound() != null ? pr.getPointsRound() : 0;
            if (pointsRound == 0) continue;

            String teamName = "";
            List<Team> teams = teamsByPlayerId.get(player.getId());
            if (teams != null && !teams.isEmpty()) {
                teamName = teams.get(teams.size() - 1).getName();
            }

            String posLabel = positionLabelFromEnum(player.getPosition());
            String posColor = positionColorFromEnum(player.getPosition());

            sb.append("<tr>");
            sb.append("<td align=\"center\" style=\"padding:7px 6px;vertical-align:top;\">");
            sb.append("<span style=\"display:inline-block;background:").append(posColor)
              .append(";color:#000000;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;line-height:1.2;\">")
              .append(escape(posLabel)).append("</span>");
            sb.append("</td>");

            sb.append("<td align=\"left\" style=\"padding:7px 8px;vertical-align:top;\">");
            sb.append("<div style=\"color:#ffffff;font-weight:600;font-size:13px;\">")
              .append(escape(player.getNameKicker())).append("</div>");
            if (!teamName.isEmpty()) {
                sb.append("<div style=\"color:#9a9a9a;font-size:11px;margin-top:2px;\">")
                  .append(escape(teamName)).append("</div>");
            }
            sb.append("</td>");

            sb.append("<td align=\"right\" style=\"padding:7px 10px 7px 6px;vertical-align:top;color:#FFD60A;font-weight:700;font-size:16px;\">")
              .append(pointsRound).append("</td>");
            sb.append("</tr>");
        }
        sb.append("</table>");
        sb.append("</div>");
    }

    private void appendRosterCard(StringBuilder sb, RosterEntry e, int mePoints,
                                   Map<Long, PlayerRank> playerRankByPlayerId,
                                   Map<Long, List<Team>> teamsByPlayerId,
                                   boolean isDark, String cardBg) {
        Player player = e.player;

        String teamName = "";
        List<Team> teams = teamsByPlayerId.get(player.getId());
        if (teams != null && !teams.isEmpty()) {
            teamName = teams.get(teams.size() - 1).getName();
        }

        sb.append("<div style=\"background:").append(cardBg).append(";border-radius:16px;padding:14px;\">");

        sb.append("<div style=\"font-weight:600;color:#ffffff;font-size:15px;\">")
          .append(escape(truncate(player.getNameKicker(), 22))).append("</div>");

        if (!teamName.isEmpty()) {
            sb.append("<div style=\"margin-top:2px;color:#9a9a9a;font-size:12px;\">")
              .append(escape(truncate(teamName, 22))).append("</div>");
        }

        sb.append("<table cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:8px;\"><tr>");
        sb.append("<td><span style=\"display:inline-block;background:").append(e.posColor)
          .append(";color:#000000;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;line-height:1.2;\">")
          .append(escape(e.posLabel)).append("</span></td>");
        if (e.activeHinrunde && !e.activeRueckrunde) {
            sb.append("<td style=\"padding-left:4px;\"><span style=\"display:inline-block;background:#0A84FF;color:#ffffff;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;line-height:1.2;\">Nur Hin</span></td>");
        } else if (e.activeRueckrunde && !e.activeHinrunde) {
            sb.append("<td style=\"padding-left:4px;\"><span style=\"display:inline-block;background:#BF5AF2;color:#ffffff;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;line-height:1.2;\">Nur R&uuml;ck</span></td>");
        }
        sb.append("</tr></table>");

        sb.append("<div style=\"margin-top:10px;font-size:22px;font-weight:700;color:#FFD60A;line-height:1.1;\">")
          .append(mePoints).append("<span style=\"font-size:12px;font-weight:500;color:#9a9a9a;margin-left:4px;\">Pkt</span></div>");

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

        sb.append("<div style=\"background:#1c1c1e;border-radius:16px;padding:14px;\">");

        sb.append("<div style=\"font-weight:600;color:#ffffff;font-size:15px;\">").append(escape(player.getNameKicker())).append("</div>");

        if (!teamName.isEmpty()) {
            sb.append("<div style=\"margin-top:2px;color:#9a9a9a;font-size:12px;\">").append(escape(teamName)).append("</div>");
        }

        sb.append("<div style=\"margin-top:10px;font-size:22px;font-weight:700;color:#FFD60A;line-height:1.1;\">").append(pointsRound).append("<span style=\"font-size:12px;font-weight:500;color:#9a9a9a;margin-left:4px;\">Pkt</span></div>");

        List<Points> playerPoints = pointsByPlayerId.getOrDefault(player.getId(), List.of());
        Map<Rule, Integer> ruleCounts = new HashMap<>();
        for (Points p : playerPoints) {
            ruleCounts.merge(p.getRule(), 1, Integer::sum);
        }

        sb.append("<div style=\"margin-top:8px;\">");
        sb.append("<span style=\"display:inline-block;background:").append(posColor)
          .append(";color:#000000;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;margin-right:4px;margin-bottom:4px;\">")
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
                  .append(";color:#000000;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;margin-right:4px;margin-bottom:4px;\">");
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
            case GOAL_STRIKER -> "#0A84FF";
            case GOAL_MIDFIELDER -> "#FF2D55";
            case GOAL_DEFENDER -> "#FF9F0A";
            case GOAL_GOALKEEPER -> "#30D158";
            case GOAL_GOALKEEPER_BY_PENALTY -> "#30D158";
            case TO_NULL_GOALKEEPER -> "#BF5AF2";
            case TO_NULL_DEFENDER -> "#BF5AF2";
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
        if (player.equals(manager.getPlayerGoalkeeper())) return "#30D158";
        if (player.equals(manager.getPlayerDefender1())) return "#FF9F0A";
        if (player.equals(manager.getPlayerDefender2())) return "#FF9F0A";
        if (player.equals(manager.getPlayerDefender3())) return "#FF9F0A";
        if (player.equals(manager.getPlayerMidfield1())) return "#FF2D55";
        if (player.equals(manager.getPlayerMidfield2())) return "#FF2D55";
        if (player.equals(manager.getPlayerMidfield3())) return "#FF2D55";
        if (player.equals(manager.getPlayerStriker1())) return "#0A84FF";
        if (player.equals(manager.getPlayerStriker2())) return "#0A84FF";
        if (player.equals(manager.getPlayerStriker3())) return "#0A84FF";
        if (player.equals(manager.getPlayerFreeChoice())) return "#BF5AF2";
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

    private static String renderIntroMarkdown(String s, String textPrimary) {
        if (s == null) return "";
        String escaped = escape(s);
        return escaped.replaceAll("\\*\\*(.+?)\\*\\*",
            "<strong style=\"color:" + textPrimary + ";font-style:normal;\">$1</strong>");
    }
}
