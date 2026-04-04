package de.ffl.service;

import de.ffl.domain.*;
import de.ffl.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SeasonCalculationService {

    private static final Logger log = LoggerFactory.getLogger(SeasonCalculationService.class);
    private static final String FFL_LINE_BREAK = "_LB_";

    private final SeasonRepository seasonRepository;
    private final RoundRepository roundRepository;
    private final GameRepository gameRepository;
    private final PlayerRepository playerRepository;
    private final PointsRepository pointsRepository;
    private final PlayerRankRepository playerRankRepository;
    private final ManagerRankRepository managerRankRepository;
    private final ManagerRepository managerRepository;

    public SeasonCalculationService(
            SeasonRepository seasonRepository,
            RoundRepository roundRepository,
            GameRepository gameRepository,
            PlayerRepository playerRepository,
            PointsRepository pointsRepository,
            PlayerRankRepository playerRankRepository,
            ManagerRankRepository managerRankRepository,
            ManagerRepository managerRepository) {
        this.seasonRepository = seasonRepository;
        this.roundRepository = roundRepository;
        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
        this.pointsRepository = pointsRepository;
        this.playerRankRepository = playerRankRepository;
        this.managerRankRepository = managerRankRepository;
        this.managerRepository = managerRepository;
    }

    @Transactional
    public void calculateSeason(Long seasonId) {
        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new IllegalArgumentException("Season not found: " + seasonId));

        log.info("Calculating season: {}", season.getName());
        System.out.println("=== Start der Saison-Berechnung ===");
        System.out.println("Saison: " + season.getName() + " (ID: " + seasonId + ")");

        List<Round> rounds = roundRepository.findBySeasonIdOrderByNumber(seasonId);
        System.out.println("Gefundene Spieltage: " + rounds.size());
        
        List<Game> allGames = new ArrayList<>();
        for (Round round : rounds) {
            allGames.addAll(gameRepository.findByRoundId(round.getId()));
        }
        System.out.println("Gefundene Spiele: " + allGames.size());

        clearSeasonCalculations(allGames, seasonId);

        Map<Long, Set<Player>> roundPlayersHost = new HashMap<>();
        Map<Long, Set<Player>> roundPlayersVisitor = new HashMap<>();
        Map<Long, Integer> roundGoalsHost = new HashMap<>();
        Map<Long, Integer> roundGoalsVisitor = new HashMap<>();

        int gamesProcessed = 0;
        int gamesSkipped = 0;
        for (Game game : allGames) {
            if (game.getFormation() != null && !game.getFormation().isEmpty()) {
                System.out.println("Verarbeite Spiel: " + game.getHost().getName() + " vs " + game.getVisitor().getName());
                processGame(game, roundPlayersHost, roundPlayersVisitor, roundGoalsHost, roundGoalsVisitor);
                gamesProcessed++;
            } else {
                gamesSkipped++;
            }
        }
        System.out.println("Spiele verarbeitet: " + gamesProcessed + ", übersprungen (keine Formation): " + gamesSkipped);

        System.out.println("Berechne Spieler-Rankings...");
        calculateAllPlayerRanks(season, rounds, allGames, roundPlayersHost, roundPlayersVisitor);
        System.out.println("Berechne Manager-Rankings...");
        calculateAllManagerRanks(season, rounds, allGames);

        Integer maxMatchday = playerRankRepository.findMaxPlayedRoundBySeasonId(seasonId);
        season.setCurrentMatchday(maxMatchday != null ? maxMatchday : 0);
        seasonRepository.save(season);
        System.out.println("Aktueller Spieltag gesetzt auf: " + maxMatchday);

        System.out.println("=== Saison-Berechnung erfolgreich abgeschlossen ===");
        log.info("Season calculation completed: {}", season.getName());
    }

    private void clearSeasonCalculations(List<Game> games, Long seasonId) {
        log.info("Clearing calculations for season: {}", seasonId);
        System.out.println("Lösche alte Berechnungen...");
        
        System.out.println("  - Lösche Punkte für " + games.size() + " Spiele...");
        for (Game game : games) {
            pointsRepository.deleteByGameId(game.getId());
        }
        System.out.println("  - Lösche PlayerRank Einträge...");
        playerRankRepository.deleteAll();
        System.out.println("  - Lösche ManagerRank Einträge...");
        managerRankRepository.deleteAll();

        System.out.println("  - Bereinige Spielerzuordnungen in Spielen...");
        for (Game game : games) {
            game.getPlayersHost().clear();
            game.getPlayersVisitor().clear();
            gameRepository.save(game);
        }
        System.out.println("Alte Berechnungen gelöscht.");
    }

    private void processGame(Game game, 
            Map<Long, Set<Player>> roundPlayersHost,
            Map<Long, Set<Player>> roundPlayersVisitor,
            Map<Long, Integer> roundGoalsHost,
            Map<Long, Integer> roundGoalsVisitor) {
        
        String formation = game.getFormation();
        Long roundId = game.getRound().getId();
        
        log.debug("Processing game: {} - {}", game.getHost().getName(), game.getVisitor().getName());
        System.out.println("  Spiel: " + game.getHost().getName() + " vs " + game.getVisitor().getName());

        Team host = game.getHost();
        Team visitor = game.getVisitor();

        Set<Player> playersHost = findPlayers(game, host, true, formation);
        Set<Player> playersVisitor = findPlayers(game, visitor, false, formation);
        
        System.out.println("    Heim-Spieler: " + playersHost.size() + ", Gast-Spieler: " + playersVisitor.size());

        game.setPlayersHost(playersHost);
        game.setPlayersVisitor(playersVisitor);

        int goalsHostCount = countGoals(playersHost, formation, true);
        int goalsVisitorCount = countGoals(playersVisitor, formation, false);
        
        goalsHostCount += countEigentorGoals(playersVisitor, formation);
        goalsVisitorCount += countEigentorGoals(playersHost, formation);

        game.setGoalHost(goalsHostCount);
        game.setGoalVisitor(goalsVisitorCount);
        
        System.out.println("    Ergebnis: " + goalsHostCount + " : " + goalsVisitorCount);

        gameRepository.save(game);

        roundPlayersHost.computeIfAbsent(roundId, k -> new HashSet<>()).addAll(playersHost);
        roundPlayersVisitor.computeIfAbsent(roundId, k -> new HashSet<>()).addAll(playersVisitor);
        roundGoalsHost.merge(roundId, goalsHostCount, Integer::sum);
        roundGoalsVisitor.merge(roundId, goalsVisitorCount, Integer::sum);

        createPointsForPlayers(game, playersHost, true);
        createPointsForPlayers(game, playersVisitor, false);
    }

    private Set<Player> findPlayers(Game game, Team team, boolean isHost, String formation) {
        Set<Player> result = new HashSet<>();
        
        String aufstellung = extractAufstellung(formation);
        String[] lines = aufstellung.split(FFL_LINE_BREAK);
        
        List<String> playerList = new ArrayList<>();
        for (String line : lines) {
            if (line != null && !line.trim().isEmpty()) {
                String cleaned = replaceKickerNote(line).trim();
                playerList.add(cleaned);
            }
        }

        int startIdx = isHost ? 0 : 11;
        int endIdx = isHost ? 11 : 22;
        
        if (startIdx >= playerList.size()) {
            return result;
        }
        
        endIdx = Math.min(endIdx, playerList.size());
        
        for (int i = startIdx; i < endIdx; i++) {
            String name = playerList.get(i);
            Player foundPlayer = findPlayerByName(team.getPlayers(), name);
            if (foundPlayer != null) {
                result.add(foundPlayer);
            }
        }

        List<String> startingPlayers = playerList.subList(startIdx, endIdx);
        List<String> exchangePlayers = findExchangePlayers(formation, startingPlayers);
        for (String name : exchangePlayers) {
            Player foundPlayer = findPlayerByName(team.getPlayers(), name);
            if (foundPlayer != null) {
                result.add(foundPlayer);
            }
        }

        return result;
    }

    private String extractAufstellung(String formation) {
        int start = formation.indexOf("Aufstellung");
        if (start < 0) return "";
        start += 11;
        String aufstellung = formation.substring(start);
        int end = aufstellung.indexOf("Trainer");
        if (end > 0) {
            aufstellung = aufstellung.substring(0, end);
        }
        return aufstellung;
    }

    private List<String> findExchangePlayers(String formation, List<String> startingPlayers) {
        List<String> result = new ArrayList<>();
        
        int wechselStart = formation.indexOf("Wechsel");
        if (wechselStart < 0) return result;

        String wechsel = formation.substring(wechselStart + 7);
        String[] lines = wechsel.split(FFL_LINE_BREAK);

        Set<String> startingNames = new HashSet<>(startingPlayers);
        List<String> allPlayers = new ArrayList<>();
        
        for (String line : lines) {
            if (line == null || line.trim().isEmpty()) continue;
            if (Character.isDigit(line.charAt(0))) continue;
            String cleaned = replaceKickerNote(line).trim();
            allPlayers.add(cleaned);
        }

        for (int i = 0; i < allPlayers.size() - 1; i += 2) {
            String eingewechselt = allPlayers.get(i);
            String ausgewechselt = allPlayers.get(i + 1);
            
            if (startingNames.contains(ausgewechselt)) {
                result.add(eingewechselt);
            }
        }

        return result;
    }

    public int countGoals(Set<Player> players, String formation, boolean isHost) {
        int count = 0;
        int toreStart = formation.indexOf("Tore");
        if (toreStart < 0) return 0;

        String toreSection = formation.substring(toreStart + 4);
        int endMarker = toreSection.indexOf("Aufstellung");
        if (endMarker < 0) endMarker = toreSection.indexOf("Besondere Vorkommnisse");
        if (endMarker > 0) toreSection = toreSection.substring(0, endMarker);

        String[] lines = toreSection.split(FFL_LINE_BREAK);
        for (String line : lines) {
            if (line == null || line.trim().isEmpty()) continue;
            if (Character.isDigit(line.charAt(0))) continue;
            if (line.startsWith("Rechtsschuss") || line.startsWith("Linksschuss") || 
                line.startsWith("Kopfball") || line.startsWith("Brust")) continue;
            if (line.contains("(Eigentor)")) continue;
            if (line.equals(":")) continue;

            String playerName = line.replace("(Elfmeter)", "").trim();
            Player foundPlayer = findPlayerByName(players, playerName);
            if (foundPlayer != null) {
                count++;
            }
        }

        return count;
    }

    public int countEigentorGoals(Set<Player> players, String formation) {
        int count = 0;
        int toreStart = formation.indexOf("Tore");
        if (toreStart < 0) return 0;

        String toreSection = formation.substring(toreStart + 4);
        int endMarker = toreSection.indexOf("Aufstellung");
        if (endMarker < 0) endMarker = toreSection.indexOf("Besondere Vorkommnisse");
        if (endMarker > 0) toreSection = toreSection.substring(0, endMarker);

        String[] lines = toreSection.split(FFL_LINE_BREAK);
        for (String line : lines) {
            if (line == null || line.trim().isEmpty()) continue;
            if (!line.contains("(Eigentor)")) continue;

            String playerName = line.replace("(Eigentor)", "").trim();
            Player foundPlayer = findPlayerByName(players, playerName);
            if (foundPlayer != null) {
                count++;
            }
        }

        return count;
    }

    private String replaceKickerNote(String input) {
        return input
            .replace("(", " ")
            .replace(")", " ")
            .replaceAll("\\d[,.]\\d", " ")
            .replaceAll("\\d", " ")
            .replaceAll(",", " ")
            .replaceAll(" +", " ")
            .trim();
    }

    private Player findPlayerByName(Collection<Player> players, String name) {
        if (players == null || name == null) return null;
        String normalized = normalizeName(name);
        
        for (Player player : players) {
            if (normalized.equals(normalizeName(player.getNameKicker()))) return player;
            if (normalized.equals(normalizeName(player.getNameKickerAlt1()))) return player;
            if (normalized.equals(normalizeName(player.getNameKickerAlt2()))) return player;
            if (normalized.equals(normalizeName(player.getNameKickerAlt3()))) return player;
            if (normalized.equals(normalizeName(player.getFirstName())) || normalized.equals(normalizeName(player.getLastName()))) return player;
            String fullName = (player.getFirstName() != null ? player.getFirstName() + " " : "") + player.getLastName();
            if (normalized.equals(normalizeName(fullName))) return player;
        }
        return null;
    }

    private String normalizeName(String name) {
        if (name == null) return "";
        return java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD)
            .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")
            .toLowerCase()
            .trim();
    }

    public void createPointsForPlayers(Game game, Set<Player> players, boolean isHost) {
        boolean cleanSheet = isHost ? 
            (game.getGoalVisitor() != null && game.getGoalVisitor() == 0) :
            (game.getGoalHost() != null && game.getGoalHost() == 0);

        for (Player player : players) {
            int goalCount = countPlayerGoals(game, player);
            
            for (int i = 0; i < goalCount; i++) {
                Points points = new Points();
                points.setPlayer(player);
                points.setGame(game);
                points.setNumber(getPointsForGoalByPosition(player.getPosition()));
                points.setRule(getRuleForPosition(player.getPosition()));
                pointsRepository.save(points);
            }

            if (cleanSheet) {
                if (player.getPosition() == Position.GOALKEEPER) {
                    Points points = new Points();
                    points.setPlayer(player);
                    points.setGame(game);
                    points.setNumber(5);
                    points.setRule(Rule.TO_NULL_GOALKEEPER);
                    pointsRepository.save(points);
                } else if (player.getPosition() == Position.DEFENDER) {
                    Points points = new Points();
                    points.setPlayer(player);
                    points.setGame(game);
                    points.setNumber(2);
                    points.setRule(Rule.TO_NULL_DEFENDER);
                    pointsRepository.save(points);
                }
            }
        }
    }

    private int countPlayerGoals(Game game, Player player) {
        String formation = game.getFormation();
        if (formation == null) return 0;

        int toreStart = formation.indexOf("Tore");
        if (toreStart < 0) return 0;

        String toreSection = formation.substring(toreStart + 4);
        int endMarker = toreSection.indexOf("Aufstellung");
        if (endMarker < 0) endMarker = toreSection.indexOf("Besondere Vorkommnisse");
        if (endMarker > 0) toreSection = toreSection.substring(0, endMarker);

        int count = 0;
        String[] lines = toreSection.split(FFL_LINE_BREAK);
        for (String line : lines) {
            if (line == null || line.trim().isEmpty()) continue;
            if (Character.isDigit(line.charAt(0))) continue;
            if (line.startsWith("Rechtsschuss") || line.startsWith("Linksschuss") || 
                line.startsWith("Kopfball") || line.startsWith("Brust")) continue;
            if (line.contains("(Eigentor)")) continue;

            String playerName = line.replace("(Elfmeter)", "").trim();
            if (matchesPlayerName(player, playerName)) {
                count++;
            }
        }

        return count;
    }

    private boolean matchesPlayerName(Player player, String name) {
        if (name == null || name.isEmpty()) return false;
        String normalized = normalizeName(name);
        
        if (normalized.equals(normalizeName(player.getNameKicker()))) return true;
        if (normalized.equals(normalizeName(player.getNameKickerAlt1()))) return true;
        if (normalized.equals(normalizeName(player.getNameKickerAlt2()))) return true;
        if (normalized.equals(normalizeName(player.getNameKickerAlt3()))) return true;
        
        return false;
    }

    private int getPointsForGoalByPosition(Position position) {
        return switch (position) {
            case STRIKER -> 3;
            case MIDFIELD -> 5;
            case DEFENDER -> 7;
            case GOALKEEPER -> 10;
        };
    }

    private Rule getRuleForPosition(Position position) {
        return switch (position) {
            case STRIKER -> Rule.GOAL_STRIKER;
            case MIDFIELD -> Rule.GOAL_MIDFIELDER;
            case DEFENDER -> Rule.GOAL_DEFENDER;
            case GOALKEEPER -> Rule.GOAL_GOALKEEPER;
        };
    }

    private void calculateAllPlayerRanks(Season season, List<Round> rounds, List<Game> allGames,
            Map<Long, Set<Player>> roundPlayersHost,
            Map<Long, Set<Player>> roundPlayersVisitor) {
        
        System.out.println("Berechne PlayerRank für " + rounds.size() + " Spieltage...");
        
        List<Player> players = playerRepository.findBySeasonId(season.getId());
        System.out.println("Spieler in Saison: " + players.size());
        
        Map<Long, Integer> totalPoints = new HashMap<>();
        Map<Long, Integer> matchesPlayed = new HashMap<>();

        for (Player player : players) {
            totalPoints.put(player.getId(), 0);
            matchesPlayed.put(player.getId(), 0);
        }

        List<Long> allGameIds = allGames.stream().map(Game::getId).collect(Collectors.toList());
        List<Points> allPoints = pointsRepository.findByGameIdIn(allGameIds);
        System.out.println("Gefundene Punkte-Einträge: " + allPoints.size());
        
        Map<Long, List<Points>> pointsByGame = allPoints.stream()
            .collect(Collectors.groupingBy(p -> p.getGame().getId()));

        int roundCount = 0;
        for (Round round : rounds) {
            roundCount++;
            System.out.println("  Spieltag " + roundCount + "/" + rounds.size() + " (ID: " + round.getId() + ")");
            calculatePlayerRanksForRound(round, players, allGames, totalPoints, matchesPlayed,
                pointsByGame,
                roundPlayersHost.getOrDefault(round.getId(), Collections.emptySet()),
                roundPlayersVisitor.getOrDefault(round.getId(), Collections.emptySet()));
        }
        System.out.println("PlayerRank-Berechnung abgeschlossen.");
    }

    private void calculatePlayerRanksForRound(Round round, List<Player> players, List<Game> allGames,
            Map<Long, Integer> totalPoints, Map<Long, Integer> matchesPlayed,
            Map<Long, List<Points>> pointsByGame,
            Set<Player> roundPlayersHost, Set<Player> roundPlayersVisitor) {
        
        List<Game> games = allGames.stream()
            .filter(g -> g.getRound().getId().equals(round.getId()))
            .collect(Collectors.toList());

        Set<Long> playingPlayerIds = new HashSet<>();
        for (Game game : games) {
            for (Player p : game.getPlayersHost()) playingPlayerIds.add(p.getId());
            for (Player p : game.getPlayersVisitor()) playingPlayerIds.add(p.getId());
        }

        Map<Long, Integer> roundPoints = new HashMap<>();
        for (Player player : players) {
            roundPoints.put(player.getId(), 0);
        }

        for (Game game : games) {
            List<Points> gamePoints = pointsByGame.getOrDefault(game.getId(), Collections.emptyList());
            for (Points p : gamePoints) {
                Long playerId = p.getPlayer().getId();
                roundPoints.merge(playerId, p.getNumber(), Integer::sum);
                totalPoints.merge(playerId, p.getNumber(), Integer::sum);
                if (playingPlayerIds.contains(playerId)) {
                    matchesPlayed.merge(playerId, 1, Integer::sum);
                }
            }
        }

        List<Player> sortedByRound = players.stream()
            .sorted((a, b) -> roundPoints.getOrDefault(b.getId(), 0) - roundPoints.getOrDefault(a.getId(), 0))
            .collect(Collectors.toList());

        List<Player> sortedByTotal = players.stream()
            .sorted((a, b) -> totalPoints.getOrDefault(b.getId(), 0) - totalPoints.getOrDefault(a.getId(), 0))
            .collect(Collectors.toList());

        Map<Long, Integer> roundPosition = new HashMap<>();
        Map<Long, Integer> totalPosition = new HashMap<>();

        for (int i = 0; i < sortedByRound.size(); i++) {
            roundPosition.put(sortedByRound.get(i).getId(), i + 1);
        }
        for (int i = 0; i < sortedByTotal.size(); i++) {
            totalPosition.put(sortedByTotal.get(i).getId(), i + 1);
        }

        List<PlayerRank> ranksToSave = new ArrayList<>();
        for (Player player : players) {
            PlayerRank rank = new PlayerRank();
            rank.setPlayer(player);
            rank.setRound(round);
            rank.setPositionRound(roundPosition.getOrDefault(player.getId(), players.size()));
            rank.setPositionTotal(totalPosition.getOrDefault(player.getId(), players.size()));
            rank.setPointsRound(roundPoints.getOrDefault(player.getId(), 0));
            rank.setPointsTotal(totalPoints.getOrDefault(player.getId(), 0));
            rank.setNumberMatches(matchesPlayed.getOrDefault(player.getId(), 0));
            rank.setPlayed(playingPlayerIds.contains(player.getId()));
            ranksToSave.add(rank);
        }
        playerRankRepository.saveAll(ranksToSave);
    }

    private void calculateAllManagerRanks(Season season, List<Round> rounds, List<Game> allGames) {
        System.out.println("Berechne ManagerRank für " + rounds.size() + " Spieltage...");
        
        List<Manager> managers = managerRepository.findBySeasonId(season.getId());
        System.out.println("Manager in Saison: " + managers.size());
        
        Map<Long, Integer> totalPoints = new HashMap<>();
        for (Manager manager : managers) {
            totalPoints.put(manager.getId(), 0);
        }

        List<Long> allGameIds = allGames.stream().map(Game::getId).collect(Collectors.toList());
        List<Points> allPoints = pointsRepository.findByGameIdIn(allGameIds);
        System.out.println("Gefundene Punkte-Einträge: " + allPoints.size());
        
        Map<Long, List<Points>> pointsByGame = allPoints.stream()
            .collect(Collectors.groupingBy(p -> p.getGame().getId()));

        int roundCount = 0;
        int transferRound = season.getStartRoundRueckrunde() != null ? season.getStartRoundRueckrunde() : 16;
        for (Round round : rounds) {
            roundCount++;
            System.out.println("  Spieltag " + roundCount + "/" + rounds.size() + " (ID: " + round.getId() + ")");
            calculateManagerRanksForRound(round, managers, allGames, totalPoints, pointsByGame, transferRound);
        }
        System.out.println("ManagerRank-Berechnung abgeschlossen.");
    }

    private void calculateManagerRanksForRound(Round round, List<Manager> managers, List<Game> allGames,
            Map<Long, Integer> totalPoints, Map<Long, List<Points>> pointsByGame, int transferRound) {
        
        List<Game> games = allGames.stream()
            .filter(g -> g.getRound().getId().equals(round.getId()))
            .collect(Collectors.toList());

        Map<Long, Integer> pointsByPlayer = new HashMap<>();
        for (Game game : games) {
            List<Points> gamePoints = pointsByGame.getOrDefault(game.getId(), Collections.emptyList());
            for (Points p : gamePoints) {
                pointsByPlayer.merge(p.getPlayer().getId(), p.getNumber(), Integer::sum);
            }
        }

        Map<Long, Integer> roundPoints = new HashMap<>();

        for (Manager manager : managers) {
            Set<Player> activePlayers = getActivePlayersForRound(manager, round.getNumber(), transferRound);
            int points = 0;
            for (Player player : activePlayers) {
                points += pointsByPlayer.getOrDefault(player.getId(), 0);
            }
            roundPoints.put(manager.getId(), points);
            totalPoints.merge(manager.getId(), points, Integer::sum);
        }

        List<Manager> sortedByRound = managers.stream()
            .sorted((a, b) -> roundPoints.getOrDefault(b.getId(), 0) - roundPoints.getOrDefault(a.getId(), 0))
            .collect(Collectors.toList());

        List<Manager> sortedByTotal = managers.stream()
            .sorted((a, b) -> totalPoints.getOrDefault(b.getId(), 0) - totalPoints.getOrDefault(a.getId(), 0))
            .collect(Collectors.toList());

        Map<Long, Integer> roundPosition = new HashMap<>();
        Map<Long, Integer> totalPosition = new HashMap<>();

        for (int i = 0; i < sortedByRound.size(); i++) {
            roundPosition.put(sortedByRound.get(i).getId(), i + 1);
        }
        for (int i = 0; i < sortedByTotal.size(); i++) {
            totalPosition.put(sortedByTotal.get(i).getId(), i + 1);
        }

        List<ManagerRank> ranksToSave = new ArrayList<>();
        for (Manager manager : managers) {
            ManagerRank rank = new ManagerRank();
            rank.setManager(manager);
            rank.setRound(round);
            rank.setPositionRound(roundPosition.getOrDefault(manager.getId(), managers.size()));
            rank.setPositionTotal(totalPosition.getOrDefault(manager.getId(), managers.size()));
            rank.setPointsRound(roundPoints.getOrDefault(manager.getId(), 0));
            rank.setPointsTotal(totalPoints.getOrDefault(manager.getId(), 0));
            ranksToSave.add(rank);
        }
        managerRankRepository.saveAll(ranksToSave);
    }

    private Set<Player> getActivePlayersForRound(Manager manager, int roundNumber, int transferRound) {
        Set<Player> players = new HashSet<>();
        
        if (manager.getPlayerGoalkeeper() != null) players.add(manager.getPlayerGoalkeeper());
        if (manager.getPlayerDefender1() != null) players.add(manager.getPlayerDefender1());
        if (manager.getPlayerDefender2() != null) players.add(manager.getPlayerDefender2());
        if (manager.getPlayerDefender3() != null) players.add(manager.getPlayerDefender3());
        if (manager.getPlayerMidfield1() != null) players.add(manager.getPlayerMidfield1());
        if (manager.getPlayerMidfield2() != null) players.add(manager.getPlayerMidfield2());
        if (manager.getPlayerMidfield3() != null) players.add(manager.getPlayerMidfield3());
        if (manager.getPlayerStriker1() != null) players.add(manager.getPlayerStriker1());
        if (manager.getPlayerStriker2() != null) players.add(manager.getPlayerStriker2());
        if (manager.getPlayerStriker3() != null) players.add(manager.getPlayerStriker3());
        if (manager.getPlayerFreeChoice() != null) players.add(manager.getPlayerFreeChoice());

        if (roundNumber >= transferRound) {
            if (manager.getPlayerExchangedOld1() != null) players.remove(manager.getPlayerExchangedOld1());
            if (manager.getPlayerExchangedOld2() != null) players.remove(manager.getPlayerExchangedOld2());
            if (manager.getPlayerExchangedOld3() != null) players.remove(manager.getPlayerExchangedOld3());
            if (manager.getPlayerExchangedNew1() != null) players.add(manager.getPlayerExchangedNew1());
            if (manager.getPlayerExchangedNew2() != null) players.add(manager.getPlayerExchangedNew2());
            if (manager.getPlayerExchangedNew3() != null) players.add(manager.getPlayerExchangedNew3());
        }

        return players;
    }
}
