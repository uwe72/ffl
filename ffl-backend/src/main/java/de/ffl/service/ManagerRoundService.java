package de.ffl.service;

import de.ffl.domain.*;
import de.ffl.dto.RoundDetailDto;
import de.ffl.repository.*;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ManagerRoundService {

    private final ManagerRepository managerRepository;
    private final ManagerRankRepository managerRankRepository;
    private final GameRepository gameRepository;
    private final PointsRepository pointsRepository;
    private final PlayerRankRepository playerRankRepository;
    private final ManagerRepository managerRepositoryForCount;
    private final RoundRepository roundRepository;

    public ManagerRoundService(ManagerRepository managerRepository, ManagerRankRepository managerRankRepository, GameRepository gameRepository, PointsRepository pointsRepository, PlayerRankRepository playerRankRepository, ManagerRepository managerRepositoryForCount, RoundRepository roundRepository) {
        this.managerRepository = managerRepository;
        this.managerRankRepository = managerRankRepository;
        this.gameRepository = gameRepository;
        this.pointsRepository = pointsRepository;
        this.playerRankRepository = playerRankRepository;
        this.managerRepositoryForCount = managerRepositoryForCount;
        this.roundRepository = roundRepository;
    }

    public List<RoundDetailDto> getRoundDetailsForManager(Long managerId) {
        Manager manager = managerRepository.findById(managerId).orElse(null);
        if (manager == null) return List.of();

        List<ManagerRank> managerRanks = managerRankRepository.findByManagerIdOrderByRoundIdAsc(managerId);

        int transferRound = findTransferRound(manager);

        Season season = manager.getSeason();
        Integer currentMatchday = season != null ? season.getCurrentMatchday() : null;

        return managerRanks.stream().map(rank -> {
            RoundDetailDto dto = new RoundDetailDto();
            Hibernate.initialize(rank.getRound());
            dto.setRoundId(rank.getRound().getId());
            dto.setRoundNumber(rank.getRound().getNumber());
            dto.setPointsRound(rank.getPointsRound());
            dto.setPointsTotal(rank.getPointsTotal());
            dto.setPositionRound(rank.getPositionRound());
            dto.setPositionTotal(rank.getPositionTotal());

            List<Player> activePlayers = getActivePlayersForRound(manager, rank.getRound().getNumber(), transferRound);
            
            List<Game> games = gameRepository.findByRoundId(rank.getRound().getId());
            List<Long> gameIds = games.stream().map(Game::getId).toList();
            
            Set<Long> playerIds = activePlayers.stream().map(Player::getId).collect(Collectors.toSet());
            Map<Long, PlayerRank> playerRanks = loadPlayerRanksForRound(playerIds, rank.getRound().getId());
            
            Round previousRound = null;
            Map<Long, PlayerRank> previousPlayerRanks = Map.of();
            if (rank.getRound().getNumber() > 1) {
                previousRound = roundRepository.findBySeasonIdAndNumber(season.getId(), rank.getRound().getNumber() - 1).orElse(null);
                if (previousRound != null) {
                    previousPlayerRanks = loadPlayerRanksForRound(playerIds, previousRound.getId());
                }
            }
            
            Map<Long, Integer> managerCountMap = buildManagerCountMap(playerIds);
            
            Map<Long, Map<Long, List<Points>>> pointsByPlayerAndGame = loadPointsForPlayersAndGames(playerIds, gameIds);
            
            List<RoundDetailDto.PlayerPointDto> playerPoints = new ArrayList<>();
            for (Player player : activePlayers) {
                int totalPoints = 0;
                List<RoundDetailDto.RulePointDto> rulePoints = new ArrayList<>();
                
                Map<Long, List<Points>> pointsByGame = pointsByPlayerAndGame.getOrDefault(player.getId(), Map.of());
                for (Game game : games) {
                    List<Points> pointsList = pointsByGame.getOrDefault(game.getId(), List.of());
                    for (Points p : pointsList) {
                        int pointsForRule = p.getNumber();
                        totalPoints += pointsForRule;
                        
                        RoundDetailDto.RulePointDto rp = new RoundDetailDto.RulePointDto();
                        rp.setRule(p.getRule().name());
                        rp.setRuleLabel(getRuleLabel(p.getRule()));
                        rp.setCount(1);
                        rp.setPoints(pointsForRule);
                        rulePoints.add(rp);
                    }
                }
                
                if (totalPoints > 0) {
                    RoundDetailDto.PlayerPointDto pp = new RoundDetailDto.PlayerPointDto();
                    pp.setPlayerId(player.getId());
                    pp.setPlayerName(player.getNameKicker());
                    pp.setPoints(totalPoints);
                    
                    pp.setPosition(player.getPosition() != null ? player.getPosition().name() : null);
                    pp.setPrize(player.getPrize());
                    
                    Hibernate.initialize(player.getTeams());
                    if (player.getTeams() != null && !player.getTeams().isEmpty()) {
                        Team team = player.getTeams().get(player.getTeams().size() - 1);
                        pp.setTeamName(team.getName());
                        pp.setTeamLogoUrl(team.getLogoSUrl());
                    }
                    
                    PlayerRank playerRank = playerRanks.get(player.getId());
                    if (playerRank != null) {
                        pp.setPositionTotal(playerRank.getPositionTotal());
                        pp.setPointsLastRound(playerRank.getPointsRound());
                        pp.setPointsTotal(playerRank.getPointsTotal());
                        
                        PlayerRank previousPlayerRank = previousPlayerRanks.get(player.getId());
                        if (previousPlayerRank != null) {
                            int positionChange = previousPlayerRank.getPositionTotal() - playerRank.getPositionTotal();
                            pp.setPositionChange(positionChange);
                        }
                    }
                    pp.setManagerCount(managerCountMap.getOrDefault(player.getId(), 0));
                    
                    populateGameInfo(pp, player, games);
                    
                    Map<String, RoundDetailDto.RulePointDto> mergedRules = new LinkedHashMap<>();
                    for (RoundDetailDto.RulePointDto rp : rulePoints) {
                        mergedRules.merge(rp.getRule(), rp, (a, b) -> {
                            RoundDetailDto.RulePointDto merged = new RoundDetailDto.RulePointDto();
                            merged.setRule(a.getRule());
                            merged.setRuleLabel(a.getRuleLabel());
                            merged.setCount(a.getCount() + b.getCount());
                            merged.setPoints(a.getPoints() + b.getPoints());
                            return merged;
                        });
                    }
                    pp.setRules(new ArrayList<>(mergedRules.values()));
                    playerPoints.add(pp);
                }
            }
            playerPoints.sort((a, b) -> b.getPoints() - a.getPoints());
            dto.setPlayerPoints(playerPoints);

            return dto;
        }).collect(Collectors.toList());
    }
    
    private void populateGameInfo(RoundDetailDto.PlayerPointDto pp, Player player, List<Game> games) {
        for (Game game : games) {
            Set<Player> hostPlayers = game.getPlayersHost();
            Set<Player> visitorPlayers = game.getPlayersVisitor();
            Hibernate.initialize(hostPlayers);
            Hibernate.initialize(visitorPlayers);
            boolean isHost = hostPlayers.contains(player);
            boolean isVisitor = visitorPlayers.contains(player);
            if (isHost || isVisitor) {
                Team host = game.getHost();
                Team visitor = game.getVisitor();
                String hostName = host != null ? host.getName() : "";
                String visitorName = visitor != null ? visitor.getName() : "";
                pp.setGameName(hostName + " - " + visitorName);
                pp.setGoalHost(game.getGoalHost());
                pp.setGoalVisitor(game.getGoalVisitor());
                Team opponent = isHost ? visitor : host;
                pp.setOpponent(opponent != null
                    ? (opponent.getShortName() != null && !opponent.getShortName().isBlank()
                        ? opponent.getShortName() : opponent.getName())
                    : "");
                pp.setHomeAway(isHost ? "H" : "A");
                pp.setGoalsOwn(isHost ? game.getGoalHost() : game.getGoalVisitor());
                pp.setGoalsOpponent(isHost ? game.getGoalVisitor() : game.getGoalHost());
                break;
            }
        }
    }
    
    private Map<Long, PlayerRank> loadPlayerRanksForRound(Set<Long> playerIds, Long roundId) {
        if (playerIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, PlayerRank> result = new HashMap<>();
        List<PlayerRank> ranks = playerRankRepository.findByPlayerIdInAndRoundId(new ArrayList<>(playerIds), roundId);
        for (PlayerRank rank : ranks) {
            result.put(rank.getPlayer().getId(), rank);
        }
        return result;
    }
    
    private Map<Long, Map<Long, List<Points>>> loadPointsForPlayersAndGames(Set<Long> playerIds, List<Long> gameIds) {
        if (playerIds.isEmpty() || gameIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Map<Long, List<Points>>> result = new HashMap<>();
        List<Points> allPoints = pointsRepository.findByPlayerIdInAndGameIdIn(new ArrayList<>(playerIds), gameIds);
        for (Points p : allPoints) {
            result.computeIfAbsent(p.getPlayer().getId(), k -> new HashMap<>())
                  .computeIfAbsent(p.getGame().getId(), k -> new ArrayList<>())
                  .add(p);
        }
        return result;
    }
    
    private Map<Long, Integer> buildManagerCountMap(Set<Long> playerIds) {
        if (playerIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> counts = managerRepositoryForCount.countManagersByPlayerIdIn(new ArrayList<>(playerIds));
        Map<Long, Integer> result = new HashMap<>();
        for (Object[] row : counts) {
            Long playerId = ((Number) row[0]).longValue();
            Integer count = ((Number) row[1]).intValue();
            result.put(playerId, count);
        }
        for (Long playerId : playerIds) {
            result.putIfAbsent(playerId, 0);
        }
        return result;
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

    private int findTransferRound(Manager manager) {
        if (manager.getPlayerExchangedNew1() == null && manager.getPlayerExchangedNew2() == null && manager.getPlayerExchangedNew3() == null) {
            return Integer.MAX_VALUE;
        }

        Season season = manager.getSeason();
        return season != null && season.getStartRoundRueckrunde() != null ? season.getStartRoundRueckrunde() : 16;
    }

    private List<Player> getActivePlayersForRound(Manager manager, int roundNumber, int transferRound) {
        List<Player> players = new ArrayList<>();

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
            if (manager.getPlayerExchangedOld1() != null) players.removeIf(p -> p.getId().equals(manager.getPlayerExchangedOld1().getId()));
            if (manager.getPlayerExchangedOld2() != null) players.removeIf(p -> p.getId().equals(manager.getPlayerExchangedOld2().getId()));
            if (manager.getPlayerExchangedOld3() != null) players.removeIf(p -> p.getId().equals(manager.getPlayerExchangedOld3().getId()));
            if (manager.getPlayerExchangedNew1() != null) players.add(manager.getPlayerExchangedNew1());
            if (manager.getPlayerExchangedNew2() != null) players.add(manager.getPlayerExchangedNew2());
            if (manager.getPlayerExchangedNew3() != null) players.add(manager.getPlayerExchangedNew3());
        }

        return players;
    }

    @Transactional(readOnly = true)
    public List<RoundDetailDto.PlayerPointDto> getCurrentPlayersForManager(Long managerId) {
        Manager manager = managerRepository.findById(managerId).orElse(null);
        if (manager == null) return List.of();
        
        Season season = manager.getSeason();
        if (season == null || season.getCurrentMatchday() == null) return List.of();
        
        int transferRound = findTransferRound(manager);

        List<Player> currentPlayers = getActivePlayersForRound(manager, season.getCurrentMatchday(), transferRound);
        if (currentPlayers.isEmpty()) return List.of();
        
        Round currentRound = roundRepository.findBySeasonIdAndNumber(season.getId(), season.getCurrentMatchday()).orElse(null);
        if (currentRound == null) return List.of();
        
        Round previousRound = null;
        if (season.getCurrentMatchday() > 1) {
            previousRound = roundRepository.findBySeasonIdAndNumber(season.getId(), season.getCurrentMatchday() - 1).orElse(null);
        }
        
        Set<Long> playerIds = currentPlayers.stream().map(Player::getId).collect(Collectors.toSet());
        Map<Long, PlayerRank> currentPlayerRanks = loadPlayerRanksForRound(playerIds, currentRound.getId());
        Map<Long, PlayerRank> previousPlayerRanks = previousRound != null ? loadPlayerRanksForRound(playerIds, previousRound.getId()) : Map.of();
        
        List<Game> games = gameRepository.findByRoundId(currentRound.getId());
        List<Long> gameIds = games.stream().map(Game::getId).toList();
        Map<Long, Map<Long, List<Points>>> pointsByPlayerAndGame = loadPointsForPlayersAndGames(playerIds, gameIds);
        Map<Long, Integer> managerCountMap = buildManagerCountMap(playerIds);
        
        List<RoundDetailDto.PlayerPointDto> result = new ArrayList<>();
        for (Player player : currentPlayers) {
            RoundDetailDto.PlayerPointDto pp = new RoundDetailDto.PlayerPointDto();
            pp.setPlayerId(player.getId());
            pp.setPlayerName(player.getNameKicker());
            pp.setPosition(player.getPosition() != null ? player.getPosition().name() : null);
            pp.setPrize(player.getPrize());
            pp.setPictureUrl(player.getPictureUrl());
            
            Hibernate.initialize(player.getTeams());
            if (player.getTeams() != null && !player.getTeams().isEmpty()) {
                Team team = player.getTeams().get(player.getTeams().size() - 1);
                pp.setTeamName(team.getName());
                pp.setTeamLogoUrl(team.getLogoSUrl());
            }
            
            int roundPoints = 0;
            Map<Long, List<Points>> pointsByGame = pointsByPlayerAndGame.getOrDefault(player.getId(), Map.of());
            for (Game game : games) {
                List<Points> pointsList = pointsByGame.getOrDefault(game.getId(), List.of());
                for (Points p : pointsList) {
                    roundPoints += p.getNumber();
                }
            }
            pp.setPoints(roundPoints);
            
            PlayerRank playerRank = currentPlayerRanks.get(player.getId());
            if (playerRank != null) {
                pp.setPositionTotal(playerRank.getPositionTotal());
                pp.setPointsTotal(playerRank.getPointsTotal());
                pp.setPointsLastRound(playerRank.getPointsRound());
                
                PlayerRank previousRank = previousPlayerRanks.get(player.getId());
                if (previousRank != null) {
                    int positionChange = previousRank.getPositionTotal() - playerRank.getPositionTotal();
                    pp.setPositionChange(positionChange);
                }
            }
            
            pp.setManagerCount(managerCountMap.getOrDefault(player.getId(), 0));
            result.add(pp);
        }
        
        result.sort((a, b) -> {
            int posOrder = (a.getPositionTotal() != null ? a.getPositionTotal() : 999) - (b.getPositionTotal() != null ? b.getPositionTotal() : 999);
            if (posOrder != 0) return posOrder;
            return a.getPlayerName().compareToIgnoreCase(b.getPlayerName());
        });
        
        return result;
    }
}
