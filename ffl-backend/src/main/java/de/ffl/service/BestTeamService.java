package de.ffl.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.ffl.domain.*;
import de.ffl.dto.BestTeamResult;
import de.ffl.dto.BestTeamResult.BestTeamPlayer;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.SeasonRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Consumer;
import java.util.stream.Collectors;

@Service
public class BestTeamService {

    private static final Logger log = LoggerFactory.getLogger(BestTeamService.class);
    private static final int MAX_PLAYERS_PER_CLUB = 5;

    private final PlayerRepository playerRepository;
    private final PlayerRankRepository playerRankRepository;
    private final SeasonRepository seasonRepository;
    private final ObjectMapper objectMapper;

    public BestTeamService(PlayerRepository playerRepository,
                           PlayerRankRepository playerRankRepository,
                           SeasonRepository seasonRepository,
                           ObjectMapper objectMapper) {
        this.playerRepository = playerRepository;
        this.playerRankRepository = playerRankRepository;
        this.seasonRepository = seasonRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void calculateAndStore(Long seasonId, Consumer<String> logCallback) {
        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new IllegalArgumentException("Season not found: " + seasonId));

        BestTeamResult result = calculate(season, logCallback);
        if (result != null) {
            try {
                season.setBestTeamJson(objectMapper.writeValueAsString(result));
                seasonRepository.save(season);
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize best team result", e);
            }
        }
    }

    public BestTeamResult getBestTeam(Long seasonId) {
        Season season = seasonRepository.findById(seasonId).orElse(null);
        if (season == null || season.getBestTeamJson() == null) {
            return null;
        }
        try {
            return objectMapper.readValue(season.getBestTeamJson(), BestTeamResult.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize best team result", e);
            return null;
        }
    }

    BestTeamResult calculate(Season season, Consumer<String> logCallback) {
        long budget = season.getBudget();

        List<Player> allPlayers = playerRepository.findBySeasonIdWithTeams(season.getId());
        if (allPlayers.isEmpty()) {
            logMsg(logCallback, "  └─ Keine Spieler in der Saison vorhanden");
            return null;
        }

        List<Long> playerIds = allPlayers.stream().map(Player::getId).collect(Collectors.toList());
        List<PlayerRank> allRanks = playerRankRepository.findByPlayerIdIn(playerIds);

        Map<Long, Integer> maxPointsByPlayer = new HashMap<>();
        for (PlayerRank rank : allRanks) {
            maxPointsByPlayer.merge(rank.getPlayer().getId(), rank.getPointsTotal(), Math::max);
        }

        List<ScoredPlayer> scoredPlayers = new ArrayList<>();
        for (Player player : allPlayers) {
            int points = maxPointsByPlayer.getOrDefault(player.getId(), 0);
            if (points <= 0 || player.getPrize() <= 0) continue;
            scoredPlayers.add(new ScoredPlayer(player, points));
        }

        logMsg(logCallback, "  ├─ Spieler mit Punkten und Preis > 0: " + scoredPlayers.size());

        Map<Position, List<ScoredPlayer>> byPosition = scoredPlayers.stream()
            .collect(Collectors.groupingBy(sp -> sp.player.getPosition()));

        int gkCount = byPosition.getOrDefault(Position.GOALKEEPER, Collections.emptyList()).size();
        int defCount = byPosition.getOrDefault(Position.DEFENDER, Collections.emptyList()).size();
        int midCount = byPosition.getOrDefault(Position.MIDFIELD, Collections.emptyList()).size();
        int strCount = byPosition.getOrDefault(Position.STRIKER, Collections.emptyList()).size();

        logMsg(logCallback, "  ├─ TW: " + gkCount + ", DEF: " + defCount + ", MF: " + midCount + ", ST: " + strCount);

        int[][] formations = {
            {4, 3, 3},
            {3, 4, 3},
            {3, 3, 4}
        };
        String[] formationLabels = {"1-4-3-3", "1-3-4-3", "1-3-3-4"};

        CandidateTeam bestOverall = null;
        String bestFormation = null;

        for (int f = 0; f < formations.length; f++) {
            int numDef = formations[f][0];
            int numMid = formations[f][1];
            int numStr = formations[f][2];

            if (defCount < numDef || midCount < numMid || strCount < numStr || gkCount < 1) {
                logMsg(logCallback, "  ├─ " + formationLabels[f] + ": Nicht genug Spieler");
                continue;
            }

            logMsg(logCallback, "  ├─ Berechne Formation " + formationLabels[f] + "...");

            CandidateTeam best = findBestTeamForFormation(
                byPosition.getOrDefault(Position.GOALKEEPER, Collections.emptyList()),
                byPosition.getOrDefault(Position.DEFENDER, Collections.emptyList()),
                byPosition.getOrDefault(Position.MIDFIELD, Collections.emptyList()),
                byPosition.getOrDefault(Position.STRIKER, Collections.emptyList()),
                numDef, numMid, numStr, budget
            );

            if (best != null) {
                logMsg(logCallback, "  │  └─ Beste: " + best.totalPoints + " Punkte, " + best.totalCost + " Kosten");
                if (bestOverall == null || best.totalPoints > bestOverall.totalPoints ||
                    (best.totalPoints == bestOverall.totalPoints && best.totalCost < bestOverall.totalCost)) {
                    bestOverall = best;
                    bestFormation = formationLabels[f];
                }
            } else {
                logMsg(logCallback, "  │  └─ Keine gültige Aufstellung gefunden");
            }
        }

        if (bestOverall == null) {
            logMsg(logCallback, "  └─ Keine bestmögliche Aufstellung ermittelbar");
            return null;
        }

        logMsg(logCallback, "  └─ Beste Formation: " + bestFormation + " mit " + bestOverall.totalPoints + " Punkten");

        return buildResult(bestOverall, bestFormation, budget);
    }

    private CandidateTeam findBestTeamForFormation(
            List<ScoredPlayer> goalkeepers,
            List<ScoredPlayer> defenders,
            List<ScoredPlayer> midfielders,
            List<ScoredPlayer> strikers,
            int numDef, int numMid, int numStr, long budget) {

        int minGkCost = goalkeepers.stream().mapToInt(sp -> sp.player.getPrize()).min().orElse(0);
        int minDefCost = minGroupCost(defenders, numDef);
        int minMidCost = minGroupCost(midfielders, numMid);
        int minStrCost = minGroupCost(strikers, numStr);

        List<PlayerGroup> strikerGroups = buildGroups(strikers, numStr);
        strikerGroups = pruneGroups(strikerGroups);

        List<PlayerGroup> midfieldGroups = buildGroups(midfielders, numMid);
        midfieldGroups = pruneGroups(midfieldGroups);

        List<PlayerGroup> defenderGroups = buildGroups(defenders, numDef);
        defenderGroups = pruneGroups(defenderGroups);

        List<PartialTeam> strMidCombos = new ArrayList<>();
        long strMidBudget = budget - minDefCost - minGkCost;
        for (PlayerGroup sg : strikerGroups) {
            if (sg.totalCost > strMidBudget - minMidCost) continue;
            for (PlayerGroup mg : midfieldGroups) {
                long combinedCost = sg.totalCost + mg.totalCost;
                if (combinedCost > strMidBudget) continue;
                int combinedPoints = sg.totalPoints + mg.totalPoints;
                strMidCombos.add(new PartialTeam(combinedPoints, combinedCost, sg, mg));
            }
        }
        strMidCombos = prunePartials(strMidCombos);

        List<PartialTeam> strMidDefCombos = new ArrayList<>();
        long strMidDefBudget = budget - minGkCost;
        for (PartialTeam smc : strMidCombos) {
            if (smc.totalCost > strMidDefBudget - minDefCost) continue;
            for (PlayerGroup dg : defenderGroups) {
                long combinedCost = smc.totalCost + dg.totalCost;
                if (combinedCost > strMidDefBudget) continue;
                int combinedPoints = smc.totalPoints + dg.totalPoints;
                PartialTeam combo = new PartialTeam(combinedPoints, combinedCost, smc, dg);
                strMidDefCombos.add(combo);
            }
        }
        strMidDefCombos = prunePartials(strMidDefCombos);

        CandidateTeam bestTeam = null;
        for (PartialTeam smdCombo : strMidDefCombos) {
            long remainingBudget = budget - smdCombo.totalCost;
            List<ScoredPlayer> fieldPlayers = smdCombo.getAllPlayers();

            for (ScoredPlayer gk : goalkeepers) {
                if (gk.player.getPrize() > remainingBudget) continue;

                List<ScoredPlayer> allPlayers = new ArrayList<>(fieldPlayers);
                allPlayers.add(gk);

                if (hasMoreThanMaxFromSameClub(allPlayers)) continue;

                int totalPoints = smdCombo.totalPoints + gk.points;
                long totalCost = smdCombo.totalCost + gk.player.getPrize();

                if (bestTeam == null || totalPoints > bestTeam.totalPoints ||
                    (totalPoints == bestTeam.totalPoints && totalCost < bestTeam.totalCost)) {
                    bestTeam = new CandidateTeam(allPlayers, totalPoints, totalCost, gk);
                }
            }
        }

        return bestTeam;
    }

    private List<PlayerGroup> buildGroups(List<ScoredPlayer> players, int groupSize) {
        List<PlayerGroup> groups = new ArrayList<>();
        List<ScoredPlayer> sorted = players.stream()
            .sorted(Comparator.comparingInt((ScoredPlayer sp) -> sp.points).reversed())
            .collect(Collectors.toList());

        int n = sorted.size();
        if (n < groupSize) return groups;

        if (groupSize == 3) {
            for (int i = 0; i < n - 2; i++) {
                for (int j = i + 1; j < n - 1; j++) {
                    for (int k = j + 1; k < n; k++) {
                        List<ScoredPlayer> members = List.of(sorted.get(i), sorted.get(j), sorted.get(k));
                        int points = members.stream().mapToInt(sp -> sp.points).sum();
                        long cost = members.stream().mapToLong(sp -> sp.player.getPrize()).sum();
                        groups.add(new PlayerGroup(members, points, cost));
                    }
                }
            }
        } else if (groupSize == 4) {
            for (int i = 0; i < n - 3; i++) {
                for (int j = i + 1; j < n - 2; j++) {
                    for (int k = j + 1; k < n - 1; k++) {
                        for (int l = k + 1; l < n; l++) {
                            List<ScoredPlayer> members = List.of(sorted.get(i), sorted.get(j), sorted.get(k), sorted.get(l));
                            int points = members.stream().mapToInt(sp -> sp.points).sum();
                            long cost = members.stream().mapToLong(sp -> sp.player.getPrize()).sum();
                            groups.add(new PlayerGroup(members, points, cost));
                        }
                    }
                }
            }
        }

        return groups;
    }

    private List<PlayerGroup> pruneGroups(List<PlayerGroup> groups) {
        groups.sort(Comparator.comparingInt((PlayerGroup g) -> g.totalPoints).reversed()
            .thenComparingLong(g -> g.totalCost));

        List<PlayerGroup> pruned = new ArrayList<>();
        for (PlayerGroup group : groups) {
            boolean dominated = false;
            for (PlayerGroup kept : pruned) {
                if (kept.totalPoints >= group.totalPoints && kept.totalCost <= group.totalCost) {
                    dominated = true;
                    break;
                }
            }
            if (!dominated) {
                pruned.add(group);
            }
        }
        return pruned;
    }

    private List<PartialTeam> prunePartials(List<PartialTeam> partials) {
        partials.sort(Comparator.comparingInt((PartialTeam p) -> p.totalPoints).reversed()
            .thenComparingLong(p -> p.totalCost));

        List<PartialTeam> pruned = new ArrayList<>();
        for (PartialTeam partial : partials) {
            boolean dominated = false;
            for (PartialTeam kept : pruned) {
                if (kept.totalPoints >= partial.totalPoints && kept.totalCost <= partial.totalCost) {
                    dominated = true;
                    break;
                }
            }
            if (!dominated) {
                pruned.add(partial);
            }
        }
        return pruned;
    }

    private int minGroupCost(List<ScoredPlayer> players, int groupSize) {
        List<Integer> prices = players.stream()
            .map(sp -> sp.player.getPrize())
            .sorted()
            .collect(Collectors.toList());
        if (prices.size() < groupSize) return 0;
        int sum = 0;
        for (int i = 0; i < groupSize; i++) {
            sum += prices.get(i);
        }
        return sum;
    }

    private boolean hasMoreThanMaxFromSameClub(List<ScoredPlayer> players) {
        Map<Long, Integer> clubCount = new HashMap<>();
        for (ScoredPlayer sp : players) {
            List<Team> teams = sp.player.getTeams();
            if (teams != null && !teams.isEmpty()) {
                Long teamId = teams.get(teams.size() - 1).getId();
                int count = clubCount.merge(teamId, 1, Integer::sum);
                if (count > MAX_PLAYERS_PER_CLUB) return true;
            }
        }
        return false;
    }

    private BestTeamResult buildResult(CandidateTeam team, String formation, long budget) {
        int[] formationNumbers = parseFormation(formation);
        int numDef = formationNumbers[0];
        int numMid = formationNumbers[1];
        int numStr = formationNumbers[2];

        Map<Position, List<ScoredPlayer>> byPos = new LinkedHashMap<>();
        for (ScoredPlayer sp : team.players) {
            byPos.computeIfAbsent(sp.player.getPosition(), k -> new ArrayList<>()).add(sp);
        }

        Position freeChoicePosition = null;
        if (numDef == 4) freeChoicePosition = Position.DEFENDER;
        else if (numMid == 4) freeChoicePosition = Position.MIDFIELD;
        else if (numStr == 4) freeChoicePosition = Position.STRIKER;

        List<BestTeamPlayer> resultPlayers = new ArrayList<>();
        Position[] positionOrder = {Position.GOALKEEPER, Position.DEFENDER, Position.MIDFIELD, Position.STRIKER};

        for (Position pos : positionOrder) {
            List<ScoredPlayer> posPlayers = byPos.getOrDefault(pos, Collections.emptyList());
            posPlayers.sort(Comparator.comparingInt((ScoredPlayer sp) -> sp.points).reversed());

            for (int i = 0; i < posPlayers.size(); i++) {
                ScoredPlayer sp = posPlayers.get(i);
                boolean isFreeChoice = (pos == freeChoicePosition && i == posPlayers.size() - 1);
                resultPlayers.add(toDto(sp, isFreeChoice));
            }
        }

        return new BestTeamResult(resultPlayers, team.totalPoints, team.totalCost, formation, budget);
    }

    private int[] parseFormation(String formation) {
        String[] parts = formation.split("-");
        return new int[]{
            Integer.parseInt(parts[1]),
            Integer.parseInt(parts[2]),
            Integer.parseInt(parts[3])
        };
    }

    private BestTeamPlayer toDto(ScoredPlayer sp, boolean freeChoice) {
        Player player = sp.player;
        String teamName = "";
        String teamLogoUrl = null;
        if (player.getTeams() != null && !player.getTeams().isEmpty()) {
            Team team = player.getTeams().get(player.getTeams().size() - 1);
            teamName = team.getName();
            teamLogoUrl = team.getLogoSUrl();
        }
        return new BestTeamPlayer(
            player.getId(),
            player.getNameKicker(),
            player.getPosition().name(),
            sp.points,
            player.getPrize(),
            teamName,
            teamLogoUrl,
            player.getPictureUrl(),
            freeChoice
        );
    }

    private void logMsg(Consumer<String> callback, String message) {
        log.info(message);
        if (callback != null) {
            callback.accept(message);
        }
    }

    static class ScoredPlayer {
        final Player player;
        final int points;

        ScoredPlayer(Player player, int points) {
            this.player = player;
            this.points = points;
        }
    }

    static class PlayerGroup {
        final List<ScoredPlayer> members;
        final int totalPoints;
        final long totalCost;

        PlayerGroup(List<ScoredPlayer> members, int totalPoints, long totalCost) {
            this.members = members;
            this.totalPoints = totalPoints;
            this.totalCost = totalCost;
        }
    }

    static class PartialTeam {
        final int totalPoints;
        final long totalCost;
        final List<PlayerGroup> groups;

        PartialTeam(int totalPoints, long totalCost, PlayerGroup... groups) {
            this.totalPoints = totalPoints;
            this.totalCost = totalCost;
            this.groups = List.of(groups);
        }

        PartialTeam(int totalPoints, long totalCost, PartialTeam prev, PlayerGroup additional) {
            this.totalPoints = totalPoints;
            this.totalCost = totalCost;
            List<PlayerGroup> combined = new ArrayList<>(prev.groups);
            combined.add(additional);
            this.groups = combined;
        }

        List<ScoredPlayer> getAllPlayers() {
            List<ScoredPlayer> all = new ArrayList<>();
            for (PlayerGroup group : groups) {
                all.addAll(group.members);
            }
            return all;
        }
    }

    static class CandidateTeam {
        final List<ScoredPlayer> players;
        final int totalPoints;
        final long totalCost;

        CandidateTeam(List<ScoredPlayer> fieldPlayers, int totalPoints, long totalCost, ScoredPlayer goalkeeper) {
            this.players = new ArrayList<>(fieldPlayers);
            this.totalPoints = totalPoints;
            this.totalCost = totalCost;
        }
    }
}
