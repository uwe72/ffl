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
import java.util.Properties;
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

    private static final String BG_BODY = "#ffffff";
    private static final String BG_BOX = "#1c1c1e";
    private static final String BG_BOX_ALT = "#2a2a2a";
    private static final String DIVIDER = "#2a2a2a";
    private static final String TXT_PRIM = "#ffffff";
    private static final String TXT_SEC = "#9a9a9a";
    private static final String TXT_MUTED = "#666666";
    private static final String OWN_BG = "#FFD60A";
    private static final String ACC_GREEN = "#30D158";
    private static final String ACC_RED = "#FF453A";
    private static final String ACC_GOLD = "#FFD60A";
    private static final String ACC_BLUE = "#0A84FF";
    private static final String ACC_ORANGE = "#FF9F0A";
    private static final String ACC_PURPLE = "#BF5AF2";

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

            List<Long> sortedManagerIds = managerIds.stream().sorted().collect(Collectors.toList());
            if (testMode) {
                send(emitter, "TEST-MODUS: Alle Mails gehen an " + config.getGmailSenderEmail());
            }
            send(emitter, "Sende an " + sortedManagerIds.size() + " Manager (sortiert nach ID)...");

            int sent = 0;
            int failed = 0;
            int mailCount = 0;
            JavaMailSenderImpl currentMailSender = mailSender;

            for (Long managerId : sortedManagerIds) {
                Manager manager = allManagersInSeason.stream()
                    .filter(m -> m.getId().equals(managerId))
                    .findFirst().orElse(null);
                if (manager == null) {
                    send(emitter, "✗ ID " + managerId + ": Manager nicht in Saison gefunden");
                    failed++;
                    continue;
                }
                String originalEmail = manager.getUser() != null ? manager.getUser().getEmail() : null;
                if (originalEmail == null || originalEmail.isBlank()) {
                    send(emitter, "✗ ID " + managerId + ": " + buildManagerDisplayName(manager) + " hat keine Mailadresse");
                    failed++;
                    continue;
                }
                String recipientEmail = testMode ? config.getGmailSenderEmail() : originalEmail;

                boolean sentSuccessfully = false;
                int retryCount = 0;
                int maxRetries = 2;

                while (!sentSuccessfully && retryCount <= maxRetries) {
                    try {
                        MimeMessage msg = currentMailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
                        helper.setFrom(config.getGmailSenderEmail());
                        helper.setTo(recipientEmail);
                        String managerName = manager.getName();
                        String fullName = buildManagerDisplayName(manager);
                        String subject = "FFL | " + season.getName() + " | " + roundNumber + ". Spieltag | " + fullName + " (" + managerName + ")";
                        helper.setSubject(subject);

                        List<RankingRow> rankingExcerpt = buildRankingExcerpt(dayRanksSorted, managerId);
                        Long userId = manager.getUser() != null ? manager.getUser().getId() : null;
                        List<ManagerGroup> managerGroups = userId != null 
                            ? managerGroupRepository.findGroupsForMail(managerId, userId)
                            : managerGroupRepository.findByManagerId(managerId).stream()
                                .filter(g -> !"Alle".equals(g.getName()))
                                .toList();
                        List<Object[]> groupManagerPairs = userId != null
                            ? managerGroupRepository.findGroupManagerIdsForMail(managerId, userId)
                            : List.of();
                        Map<Long, List<Long>> managerIdsByGroupId = new HashMap<>();
                        for (Object[] row : groupManagerPairs) {
                            Long groupId = ((Number) row[0]).longValue();
                            Long mgrId = ((Number) row[1]).longValue();
                            managerIdsByGroupId.computeIfAbsent(groupId, k -> new ArrayList<>()).add(mgrId);
                        }

                        String html = buildHtmlForManager(manager, season, roundNumber, intro,
                            dayRankByManagerId.get(managerId), topScorerName, topScorerPoints,
                            playerRankByPlayerId, teamsByPlayerId, playerById, pointsByPlayerId,
                            prevRankByManagerId, seasonRanksByPlayerId, transferRound, config.getWebUrl(),
                            rankingExcerpt, managersById, managerGroups, managerIdsByGroupId, dayRankByManagerId, comment);

                        helper.setText(html, true);
                        currentMailSender.send(msg);
                        send(emitter, "✓ ID " + managerId + ": " + buildManagerDisplayName(manager) + " (" + recipientEmail + ")");
                        sent++;
                        sentSuccessfully = true;
                    } catch (Exception e) {
                        retryCount++;
                        if (retryCount <= maxRetries) {
                            send(emitter, "⚠ ID " + managerId + ": SMTP-Fehler, Neuverbindung... (" + retryCount + "/" + maxRetries + ")");
                            currentMailSender = buildMailSender(config);
                        } else {
                            send(emitter, "✗ ID " + managerId + ": " + buildManagerDisplayName(manager) + " (" + recipientEmail + "): " + e.getMessage());
                            failed++;
                        }
                    }
                }

                if (sentSuccessfully) {
                    mailCount++;
                    Thread.sleep(100);

                    if (mailCount % 30 == 0) {
                        send(emitter, "⏸ Pause für 60 Sekunden nach " + mailCount + " Mails...");
                        Thread.sleep(60000);
                        send(emitter, "▶ Pause beendet, weiter mit Mail " + (mailCount + 1));
                        currentMailSender = buildMailSender(config);
                    }
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
                                        Map<Long, List<Long>> managerIdsByGroupId,
                                        Map<Long, ManagerRank> dayRankByManagerId,
                                        String comment) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>");
        sb.append("<body style=\"background:").append(BG_BODY).append(";color:").append(TXT_PRIM)
          .append(";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:0;margin:0;\">");
        sb.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:")
          .append(BG_BODY).append(";\"><tr><td align=\"center\" style=\"padding:10px 0;\">");
        sb.append("<table role=\"presentation\" width=\"520\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:100%;max-width:520px;\"><tr><td>");

        sb.append("<div style=\"color:").append(TXT_MUTED).append(";font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px 0;\">Hallo ")
          .append(escape(manager.getUser() != null ? Optional.ofNullable(manager.getUser().getFirstName()).orElse(manager.getName()) : manager.getName()))
          .append("!</div>");

        // Stats 1x2 grid
        if (ownDayRank != null) {
            String cardStyle = "background:" + BG_BOX + ";border-radius:18px;padding:12px 12px;";
            String labelStyle = "font-size:10px;color:" + TXT_MUTED + ";text-transform:uppercase;letter-spacing:1px;font-weight:600;";
            String valStyle = "font-size:32px;font-weight:700;color:" + TXT_PRIM + ";line-height:1.1;margin-top:4px;";
            String deltaUp = "display:inline-block;background:#1a3d2a;color:" + ACC_GREEN + ";border-radius:10px;padding:2px 8px;font-size:14px;font-weight:600;margin-left:6px;vertical-align:middle;";
            String deltaDown = "display:inline-block;background:#3d1a1a;color:" + ACC_RED + ";border-radius:10px;padding:2px 8px;font-size:14px;font-weight:600;margin-left:6px;vertical-align:middle;";

            sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:0 0 12px 0;\">");

            sb.append("<tr>");
            sb.append("<td width=\"50%\" valign=\"top\" style=\"padding:0 4px 0 0;\"><div style=\"").append(cardStyle).append("\">");
            sb.append("<div style=\"").append(labelStyle).append("\">Position</div>");
            sb.append("<div style=\"").append(valStyle).append("\">").append(nz(ownDayRank.getPositionTotal())).append(".");
            ManagerRank prevRank = prevRankByManagerId.get(manager.getId());
            if (prevRank != null && prevRank.getPositionTotal() != null) {
                int diff = prevRank.getPositionTotal() - ownDayRank.getPositionTotal();
                if (diff > 0) {
                    sb.append("<span style=\"").append(deltaUp).append("\">\u2191").append(diff).append("</span>");
                } else if (diff < 0) {
                    sb.append("<span style=\"").append(deltaDown).append("\">\u2193").append(Math.abs(diff)).append("</span>");
                }
            }
            sb.append("</div></div></td>");

            sb.append("<td width=\"50%\" valign=\"top\" style=\"padding:0 0 0 4px;\"><div style=\"").append(cardStyle).append("\">");
            sb.append("<div style=\"").append(labelStyle).append("\">Punkte</div>");
            sb.append("<div style=\"").append(valStyle).append("\">").append(nz(ownDayRank.getPointsTotal()));
            if (ownDayRank.getPointsRound() != null && ownDayRank.getPointsRound() > 0) {
                sb.append("<span style=\"").append(deltaUp).append("\">+").append(ownDayRank.getPointsRound()).append("</span>");
            }
            sb.append("</div></div></td>");
            sb.append("</tr>");

            sb.append("</table>");
        }

        if (comment != null && !comment.isBlank()) {
            sb.append("<div style=\"color:").append(TXT_MUTED)
              .append(";font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin:14px 4px 7px 4px;\">News</div>");
            sb.append("<div style=\"background:").append(BG_BOX_ALT)
              .append(";border-radius:18px;padding:12px 15px;margin:0 0 12px 0;color:").append(TXT_PRIM)
              .append(";font-size:13px;line-height:1.5;white-space:pre-wrap;\">")
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
        Map<Long, Integer> prevPlayerPosByPlayerId = new HashMap<>();
        for (RosterEntry e : roster) {
            List<PlayerRank> ranks = seasonRanksByPlayerId.get(e.player.getId());
            if (ranks == null) continue;
            for (PlayerRank pr : ranks) {
                if (pr.getRound() != null && pr.getRound().getNumber() != null
                        && pr.getRound().getNumber() == roundNumber - 1
                        && pr.getPositionTotal() != null) {
                    prevPlayerPosByPlayerId.put(e.player.getId(), pr.getPositionTotal());
                    break;
                }
            }
        }
        appendRosterTable(sb, roster, mePointsByPlayer, playerRankByPlayerId, prevPlayerPosByPlayerId, teamsByPlayerId, roundNumber, transferRound);

        // Highlights mit LLM-Intro
        sb.append("<div style=\"color:").append(TXT_MUTED)
          .append(";font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin:14px 4px 7px 4px;\">Highlights</div>");
        sb.append("<div style=\"background:").append(BG_BOX_ALT)
          .append(";border-radius:18px;padding:12px 15px;margin:0 0 12px 0;color:").append(TXT_PRIM)
          .append(";font-size:13px;line-height:1.5;\">")
          .append("<span style=\"color:").append(ACC_GOLD).append(";margin-right:6px;\">\u2605</span>")
          .append(renderIntroMarkdown(intro)).append("</div>");

        if (rankingExcerpt != null && !rankingExcerpt.isEmpty()) {
            appendRankingTable(sb, rankingExcerpt, manager.getId(), prevRankByManagerId, managersById);
            if (webUrl != null && !webUrl.isBlank()) {
                String base = webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
                sb.append("<div style=\"margin:-4px 0 12px 0;text-align:right;font-size:12px;\">")
                  .append("<a href=\"").append(escape(base)).append("/managers\" style=\"color:").append(ACC_BLUE).append(";text-decoration:none;\">")
                  .append("Gesamtrangliste &rarr;</a></div>");
            }
        }

        if (managerGroups != null && !managerGroups.isEmpty()) {
            List<ManagerGroup> sortedGroups = managerGroups.stream()
                .sorted(Comparator.comparing(g -> Optional.ofNullable(g.getName()).orElse("")))
                .toList();
            for (ManagerGroup group : sortedGroups) {
                List<Long> groupManagerIds = managerIdsByGroupId.getOrDefault(group.getId(), List.of());
                appendManagerGroupTable(sb, group, groupManagerIds, manager.getId(), dayRankByManagerId,
                    prevRankByManagerId, managersById);
            }
        }

        sb.append("<div style=\"padding:18px 0 6px 0;text-align:center;\">");
        sb.append("<div style=\"color:").append(TXT_SEC).append(";font-size:12px;margin-bottom:4px;\">Webseite</div>");
        if (webUrl != null && !webUrl.isBlank()) {
            sb.append("<a href=\"").append(escape(webUrl)).append("\" style=\"color:").append(ACC_BLUE)
              .append(";text-decoration:none;font-size:12px;\">FFL &middot; Fantasy Football League</a>");
        } else {
            sb.append("<span style=\"color:").append(TXT_SEC).append(";font-size:12px;\">FFL &middot; Fantasy Football League</span>");
        }
        sb.append("</div>");

        sb.append("</td></tr></table>");
        sb.append("</td></tr></table>");
        sb.append("</body></html>");
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
        appendSectionContainerOpen(sb, "Gesamtrangliste");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"font-size:13px;border-collapse:collapse;\">");
        appendRankingHeaderRow(sb);

        int lastDataIdx = -1;
        for (int i = rows.size() - 1; i >= 0; i--) {
            if (!rows.get(i).isGap) { lastDataIdx = i; break; }
        }
        for (int i = 0; i < rows.size(); i++) {
            RankingRow row = rows.get(i);
            if (row.isGap) {
                sb.append("<tr><td colspan=\"5\" align=\"center\" style=\"padding:4px;color:")
                  .append(TXT_MUTED).append(";font-size:14px;border-bottom:1px solid ").append(DIVIDER).append(";\">\u2026</td></tr>");
                continue;
            }
            ManagerRank mr = row.rank;
            Manager m = managersById.get(mr.getManager().getId());
            boolean isOwn = mr.getManager().getId().equals(ownManagerId);
            ManagerRank prev = prevRankByManagerId.get(mr.getManager().getId());
            String displayName = m != null && m.getShortName() != null && !m.getShortName().isBlank()
                ? m.getShortName()
                : (m != null ? m.getName() : "?");
            String fullName = m != null ? buildManagerDisplayName(m) : displayName;
            String loginName = m != null ? m.getName() : "?";
            boolean isLast = (i == lastDataIdx);
            appendManagerDataRow(sb, mr, prev, displayName, fullName, loginName, isOwn, isLast);
        }
        sb.append("</table>");
        sb.append("</div>");
    }

    private void appendSectionContainerOpen(StringBuilder sb, String title) {
        sb.append("<div style=\"color:").append(TXT_MUTED)
          .append(";font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin:14px 4px 7px 4px;\">")
          .append(escape(title)).append("</div>");
        sb.append("<div style=\"background:").append(BG_BOX).append(";border-radius:18px;padding:6px 0;margin:0 0 12px 0;overflow:hidden;\">");
    }

    private void appendRankingHeaderRow(StringBuilder sb) {
        String hStyle = "font-size:10px;color:" + TXT_MUTED + ";text-transform:uppercase;letter-spacing:1px;font-weight:600;padding:6px 4px;border-bottom:1px solid " + DIVIDER + ";";
        sb.append("<tr>");
        sb.append("<th width=\"35\" align=\"center\" style=\"").append(hStyle).append("padding-left:12px;\">Pos</th>");
        sb.append("<th width=\"35\" align=\"center\" style=\"").append(hStyle).append("\">+/-</th>");
        sb.append("<th align=\"left\" style=\"").append(hStyle).append("padding-left:8px;\">Manager</th>");
        sb.append("<th width=\"50\" align=\"right\" style=\"").append(hStyle).append("\">Pkt</th>");
        sb.append("<th width=\"35\" align=\"right\" style=\"").append(hStyle).append("padding-right:12px;\">Sp.</th>");
        sb.append("</tr>");
    }

    private void appendManagerDataRow(StringBuilder sb, ManagerRank mr, ManagerRank prev,
                                       String displayName, String fullName, String loginName,
                                       boolean isOwn, boolean isLast) {
        String rowBg = isOwn ? OWN_BG : "transparent";
        String border = isLast ? "" : "border-bottom:1px solid " + DIVIDER + ";";
        String textColor = isOwn ? "#000000" : TXT_PRIM;
        String secondary = isOwn ? "#000000" : TXT_SEC;
        String fontWeight = isOwn ? "700" : "500";
        String numStyle = "color:" + textColor + ";font-weight:" + fontWeight + ";font-variant-numeric:tabular-nums;font-size:13px;";
        String secStyle = "color:" + secondary + ";font-weight:" + fontWeight + ";font-variant-numeric:tabular-nums;font-size:13px;";

        sb.append("<tr style=\"background:").append(rowBg).append(";\">");
        sb.append("<td align=\"center\" valign=\"middle\" style=\"padding:6px 4px 6px 12px;").append(numStyle).append(border).append("\">")
          .append(nz(mr.getPositionTotal())).append(".</td>");

        sb.append("<td align=\"center\" valign=\"middle\" style=\"padding:6px 4px;").append(border).append("\">");
        if (prev != null && prev.getPositionTotal() != null && mr.getPositionTotal() != null) {
            int diff = prev.getPositionTotal() - mr.getPositionTotal();
            if (diff > 0) {
                String upBg = isOwn ? "transparent" : "#1a3d2a";
                String upFg = isOwn ? "#000000" : ACC_GREEN;
                sb.append("<span style=\"display:inline-block;background:").append(upBg).append(";color:").append(upFg)
                  .append(";font-size:11px;font-weight:700;padding:1px 6px;border-radius:10px;\">\u2191").append(diff).append("</span>");
            } else if (diff < 0) {
                String dnBg = isOwn ? "transparent" : "#3d1a1a";
                String dnFg = isOwn ? "#000000" : ACC_RED;
                sb.append("<span style=\"display:inline-block;background:").append(dnBg).append(";color:").append(dnFg)
                  .append(";font-size:11px;font-weight:700;padding:1px 6px;border-radius:10px;\">\u2193").append(Math.abs(diff)).append("</span>");
            } else {
                sb.append("<span style=\"color:").append(secondary).append(";\">\u2013</span>");
            }
        } else {
            sb.append("<span style=\"color:").append(secondary).append(";\">\u2013</span>");
        }
        sb.append("</td>");

        sb.append("<td align=\"left\" valign=\"middle\" style=\"padding:6px 4px 6px 8px;").append(border).append("\">");
        sb.append("<div style=\"color:").append(textColor).append(";font-weight:700;font-size:13px;line-height:1.3;\">")
          .append(escape(loginName != null && !loginName.isBlank() ? loginName : displayName)).append("</div>");
        sb.append("<div style=\"color:").append(secondary).append(";font-size:11px;line-height:1.3;\">")
          .append(escape(displayName)).append("</div>");
        sb.append("</td>");

        sb.append("<td align=\"right\" valign=\"middle\" style=\"padding:6px 4px;").append(numStyle).append(border).append("\">")
          .append(nz(mr.getPointsTotal())).append("</td>");

        sb.append("<td align=\"right\" valign=\"middle\" style=\"padding:6px 12px 6px 4px;").append(secStyle).append(border).append("\">")
          .append(nz(mr.getPointsRound())).append("</td>");

        sb.append("</tr>");
    }

    private void appendManagerGroupTable(StringBuilder sb, ManagerGroup group, List<Long> managerIds, Long ownManagerId,
                                          Map<Long, ManagerRank> dayRankByManagerId,
                                          Map<Long, ManagerRank> prevRankByManagerId,
                                          Map<Long, Manager> managersById) {
        List<ManagerRank> groupRanks = new ArrayList<>();
        for (Long mgrId : managerIds) {
            ManagerRank mr = dayRankByManagerId.get(mgrId);
            if (mr != null && mr.getPositionTotal() != null) {
                groupRanks.add(mr);
            }
        }
        if (groupRanks.isEmpty()) return;
        groupRanks.sort(Comparator.comparingInt(ManagerRank::getPositionTotal));

        appendSectionContainerOpen(sb, group.getName());
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"font-size:13px;border-collapse:collapse;\">");
        appendRankingHeaderRow(sb);

        for (int i = 0; i < groupRanks.size(); i++) {
            ManagerRank mr = groupRanks.get(i);
            Manager m = managersById.get(mr.getManager().getId());
            boolean isOwn = mr.getManager().getId().equals(ownManagerId);
            ManagerRank prev = prevRankByManagerId.get(mr.getManager().getId());
            String displayName = m != null && m.getShortName() != null && !m.getShortName().isBlank()
                ? m.getShortName()
                : (m != null ? m.getName() : "?");
            String fullName = m != null ? buildManagerDisplayName(m) : displayName;
            String loginName = m != null ? m.getName() : "?";
            boolean isLast = (i == groupRanks.size() - 1);
            appendManagerDataRow(sb, mr, prev, displayName, fullName, loginName, isOwn, isLast);
        }
        sb.append("</table>");
        sb.append("</div>");
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
            ACC_GREEN, ACC_ORANGE, ACC_ORANGE, ACC_ORANGE, ACC_GOLD, ACC_GOLD, ACC_GOLD,
            ACC_BLUE, ACC_BLUE, ACC_BLUE, ACC_PURPLE
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
        if (pos == null) return TXT_SEC;
        return switch (pos) {
            case GOALKEEPER -> ACC_GREEN;
            case DEFENDER -> ACC_ORANGE;
            case MIDFIELD -> ACC_GOLD;
            case STRIKER -> ACC_BLUE;
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

    private String positionDarkBgFromHex(String hex) {
        return switch (hex) {
            case ACC_GREEN -> "#1a3d2a";
            case ACC_ORANGE -> "#3d2a0a";
            case ACC_GOLD -> "#3d3200";
            case ACC_BLUE -> "#0a2a4d";
            case ACC_PURPLE -> "#2d1347";
            default -> "#2a2a2a";
        };
    }

    private void appendRosterTable(StringBuilder sb, List<RosterEntry> roster,
                                    Map<Long, Integer> mePointsByPlayer,
                                    Map<Long, PlayerRank> playerRankByPlayerId,
                                    Map<Long, Integer> prevPlayerPosByPlayerId,
                                    Map<Long, List<Team>> teamsByPlayerId,
                                    int roundNumber, int transferRound) {
        boolean isRueckrundeCurrent = roundNumber >= transferRound;
        appendSectionContainerOpen(sb, "Meine " + roster.size() + " Spieler");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"font-size:13px;border-collapse:collapse;\">");

        String hStyle = "font-size:10px;color:" + TXT_MUTED + ";text-transform:uppercase;letter-spacing:1px;font-weight:600;padding:6px 4px;border-bottom:1px solid " + DIVIDER + ";";
        sb.append("<tr>");
        sb.append("<th width=\"35\" align=\"center\" style=\"").append(hStyle).append("padding-left:12px;\">Pos</th>");
        sb.append("<th width=\"35\" align=\"center\" style=\"").append(hStyle).append("\">+/-</th>");
        sb.append("<th align=\"left\" style=\"").append(hStyle).append("padding-left:8px;\">Spieler</th>");
        sb.append("<th width=\"40\" align=\"center\" style=\"").append(hStyle).append("\"></th>");
        sb.append("<th width=\"35\" align=\"center\" style=\"").append(hStyle).append("\"></th>");
        sb.append("<th width=\"50\" align=\"right\" style=\"").append(hStyle).append("\">Pkt</th>");
        sb.append("<th width=\"35\" align=\"right\" style=\"").append(hStyle).append("padding-right:12px;\">Sp.</th>");
        sb.append("</tr>");

        for (int idx = 0; idx < roster.size(); idx++) {
            RosterEntry e = roster.get(idx);
            boolean isLast = (idx == roster.size() - 1);
            Player player = e.player;
            PlayerRank pr = playerRankByPlayerId.get(player.getId());
            Integer pointsTotal = pr != null ? pr.getPointsTotal() : null;
            Integer positionTotal = pr != null ? pr.getPositionTotal() : null;
            int mePoints = mePointsByPlayer.getOrDefault(player.getId(), 0);
            boolean partial = !(e.activeHinrunde && e.activeRueckrunde);
            boolean activeNow = isRueckrundeCurrent ? e.activeRueckrunde : e.activeHinrunde;
            int pointsRound = activeNow && pr != null && pr.getPointsRound() != null ? pr.getPointsRound() : 0;
            boolean scoredToday = pointsRound > 0;

            String rowBg = scoredToday ? OWN_BG : "transparent";
            String textColor = scoredToday ? "#000000" : TXT_PRIM;
            String secondary = scoredToday ? "#000000" : TXT_SEC;
            String border = isLast ? "" : "border-bottom:1px solid " + DIVIDER + ";";
            String numStyle = "color:" + textColor + ";font-weight:" + (scoredToday ? "700" : "600") + ";font-variant-numeric:tabular-nums;font-size:13px;";
            String secNumStyle = "color:" + secondary + ";font-weight:" + (scoredToday ? "700" : "500") + ";font-variant-numeric:tabular-nums;font-size:13px;";

            String teamName = "";
            List<Team> teams = teamsByPlayerId.get(player.getId());
            if (teams != null && !teams.isEmpty()) {
                teamName = teams.get(teams.size() - 1).getName();
            }

            String darkBg = positionDarkBgFromHex(e.posColor);
            String badgeBg = scoredToday ? darkBg : darkBg;
            String badgeFg = scoredToday ? e.posColor : e.posColor;

            sb.append("<tr style=\"background:").append(rowBg).append(";\">");

            // Pos
            sb.append("<td align=\"center\" valign=\"middle\" style=\"padding:8px 4px 8px 12px;").append(numStyle).append(border).append("\">");
            if (positionTotal != null) {
                sb.append(positionTotal).append(".");
            } else {
                sb.append("\u2013");
            }
            sb.append("</td>");

            // +/-
            sb.append("<td align=\"center\" valign=\"middle\" style=\"padding:8px 4px;").append(border).append("\">");
            Integer prevPos = prevPlayerPosByPlayerId != null ? prevPlayerPosByPlayerId.get(player.getId()) : null;
            if (prevPos != null && positionTotal != null) {
                int diff = prevPos - positionTotal;
                if (diff > 0) {
                    String upBg = scoredToday ? "transparent" : "#1a3d2a";
                    String upFg = scoredToday ? "#000000" : ACC_GREEN;
                    sb.append("<span style=\"display:inline-block;background:").append(upBg).append(";color:").append(upFg)
                      .append(";font-size:11px;font-weight:700;padding:1px 6px;border-radius:10px;\">\u2191").append(diff).append("</span>");
                } else if (diff < 0) {
                    String dnBg = scoredToday ? "transparent" : "#3d1a1a";
                    String dnFg = scoredToday ? "#000000" : ACC_RED;
                    sb.append("<span style=\"display:inline-block;background:").append(dnBg).append(";color:").append(dnFg)
                      .append(";font-size:11px;font-weight:700;padding:1px 6px;border-radius:10px;\">\u2193").append(Math.abs(diff)).append("</span>");
                } else {
                    sb.append("<span style=\"color:").append(secondary).append(";\">\u2013</span>");
                }
            } else {
                sb.append("<span style=\"color:").append(secondary).append(";\">\u2013</span>");
            }
            sb.append("</td>");

            // Spieler + team
            sb.append("<td align=\"left\" valign=\"middle\" style=\"padding:8px 4px 8px 8px;").append(border).append("\">");
            sb.append("<div style=\"color:").append(textColor).append(";font-weight:700;font-size:14px;line-height:1.25;white-space:nowrap;\">")
              .append(escape(shortenPlayerName(player.getNameKicker()))).append("</div>");
            if (!teamName.isEmpty()) {
                sb.append("<div style=\"color:").append(secondary).append(";font-size:11px;margin-top:2px;line-height:1.3;white-space:nowrap;\">")
                  .append(escape(teamName)).append("</div>");
            }
            sb.append("</td>");

            // Position Badge
            sb.append("<td align=\"center\" valign=\"middle\" style=\"padding:8px 4px;").append(border).append("\">");
            sb.append("<span style=\"display:inline-block;background:").append(badgeBg)
              .append(";color:").append(badgeFg)
              .append(";padding:2px 6px;border-radius:8px;font-size:9px;font-weight:700;letter-spacing:0.5px;line-height:1.2;\">")
              .append(escape(e.posLabel)).append("</span>");
            sb.append("</td>");

            // Hin/Rück
            sb.append("<td align=\"center\" valign=\"middle\" style=\"padding:8px 4px;").append(border).append("\">");
            if (e.activeHinrunde && !e.activeRueckrunde) {
                sb.append("<span style=\"display:inline-block;background:").append(ACC_BLUE)
                  .append(";color:#ffffff;padding:2px 6px;border-radius:8px;font-size:8px;font-weight:700;letter-spacing:0.5px;line-height:1.2;text-transform:uppercase;\">Hin</span>");
            } else if (e.activeRueckrunde && !e.activeHinrunde) {
                sb.append("<span style=\"display:inline-block;background:").append(ACC_PURPLE)
                  .append(";color:#ffffff;padding:2px 6px;border-radius:8px;font-size:8px;font-weight:700;letter-spacing:0.5px;line-height:1.2;text-transform:uppercase;\">R&uuml;ck</span>");
            }
            sb.append("</td>");

            // Pkt (Punkte für Manager, in Klammern Gesamtpunkte bei partial)
            int totalVal = pointsTotal != null ? pointsTotal : 0;
            sb.append("<td align=\"right\" valign=\"middle\" style=\"padding:8px 4px;").append(numStyle).append(border).append(";white-space:nowrap;\">")
              .append(mePoints);
            if (partial) {
                sb.append(" <span style=\"color:").append(secondary).append(";font-weight:500;\">(")
                  .append(totalVal).append(")</span>");
            }
            sb.append("</td>");

            // Sp. (Spieltagspunkte)
            sb.append("<td align=\"right\" valign=\"middle\" style=\"padding:8px 12px 8px 4px;").append(secNumStyle).append(border).append("\">")
              .append(pointsRound).append("</td>");

            sb.append("</tr>");
        }
        sb.append("</table>");
        sb.append("</div>");
    }

    private void appendScoringPlayersTable(StringBuilder sb, List<Player> scoringPlayers, Manager manager,
                                            Map<Long, PlayerRank> playerRankByPlayerId,
                                            Map<Long, List<Team>> teamsByPlayerId) {
        appendSectionContainerOpen(sb, "Punktende Spieler");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"font-size:13px;border-collapse:collapse;\">");

        String hStyle = "font-size:10px;color:" + TXT_MUTED + ";text-transform:uppercase;letter-spacing:1px;font-weight:600;padding:6px 4px;border-bottom:1px solid " + DIVIDER + ";";
        sb.append("<tr>");
        sb.append("<th align=\"left\" style=\"").append(hStyle).append("padding-left:14px;\">Pos</th>");
        sb.append("<th align=\"left\" style=\"").append(hStyle).append("\">Spieler</th>");
        sb.append("<th align=\"right\" style=\"").append(hStyle).append("padding-right:14px;\">Pkt</th>");
        sb.append("</tr>");

        List<Player> filtered = new ArrayList<>();
        for (Player p : scoringPlayers) {
            PlayerRank pr = playerRankByPlayerId.get(p.getId());
            int pts = pr != null && pr.getPointsRound() != null ? pr.getPointsRound() : 0;
            if (pts > 0) filtered.add(p);
        }

        for (int i = 0; i < filtered.size(); i++) {
            Player player = filtered.get(i);
            boolean isLast = (i == filtered.size() - 1);
            String border = isLast ? "" : "border-bottom:1px solid " + DIVIDER + ";";
            PlayerRank pr = playerRankByPlayerId.get(player.getId());
            int pointsRound = pr != null && pr.getPointsRound() != null ? pr.getPointsRound() : 0;

            String teamName = "";
            List<Team> teams = teamsByPlayerId.get(player.getId());
            if (teams != null && !teams.isEmpty()) {
                teamName = teams.get(teams.size() - 1).getName();
            }

            String posLabel = positionLabelFromEnum(player.getPosition());
            String posColor = positionColorFromEnum(player.getPosition());
            String darkBg = positionDarkBgFromHex(posColor);

            sb.append("<tr style=\"background:").append(BG_BOX).append(";\">");
            sb.append("<td align=\"left\" style=\"padding:10px 10px 10px 10px;border-left:4px solid ").append(posColor)
              .append(";").append(border).append("vertical-align:top;\">");
            sb.append("<span style=\"display:inline-block;background:").append(darkBg)
              .append(";color:").append(posColor)
              .append(";padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.4px;\">")
              .append(escape(posLabel)).append("</span>");
            sb.append("</td>");

            sb.append("<td align=\"left\" style=\"padding:10px 10px;").append(border).append("vertical-align:top;\">");
            sb.append("<div style=\"color:").append(TXT_PRIM).append(";font-weight:600;font-size:13px;\">")
              .append(escape(player.getNameKicker())).append("</div>");
            if (!teamName.isEmpty()) {
                sb.append("<div style=\"color:").append(TXT_SEC).append(";font-size:11px;margin-top:2px;\">")
                  .append(escape(teamName)).append("</div>");
            }
            sb.append("</td>");

            sb.append("<td align=\"right\" style=\"padding:10px 14px 10px 10px;").append(border)
              .append("vertical-align:top;color:").append(ACC_GREEN).append(";font-weight:700;font-size:16px;font-variant-numeric:tabular-nums;\">")
              .append(pointsRound).append("</td>");
            sb.append("</tr>");
        }
        sb.append("</table>");
        sb.append("</div>");
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

        sb.append("<div style=\"background:#1c1c1e;border-radius:16px;padding:14px;\">");

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

        int totalVal = pointsTotal != null ? pointsTotal : 0;
        boolean partial = !(e.activeHinrunde && e.activeRueckrunde);
        sb.append("<div style=\"margin-top:10px;font-size:22px;font-weight:700;color:#FFD60A;line-height:1.1;\">")
          .append(mePoints).append("<span style=\"font-size:12px;font-weight:500;color:#9a9a9a;margin-left:4px;\">Pkt</span>");
        if (partial) {
            sb.append(" <span style=\"font-size:11px;font-weight:600;color:#9a9a9a;\">(")
              .append(totalVal).append(")</span>");
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
            case GOAL_MIDFIELDER -> "#FFD60A";
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
        if (player.equals(manager.getPlayerMidfield1())) return "#FFD60A";
        if (player.equals(manager.getPlayerMidfield2())) return "#FFD60A";
        if (player.equals(manager.getPlayerMidfield3())) return "#FFD60A";
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

    private static String renderIntroMarkdown(String s) {
        if (s == null) return "";
        String escaped = escape(s);
        return escaped.replaceAll("\\*\\*(.+?)\\*\\*",
            "<strong style=\"color:#ffffff;font-style:normal;\">$1</strong>");
    }

    private static JavaMailSenderImpl buildMailSender(SystemConfig config) {
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
        props.put("mail.smtp.connectiontimeout", "30000");
        props.put("mail.smtp.timeout", "120000");
        props.put("mail.smtp.writetimeout", "120000");
        return sender;
    }
}
