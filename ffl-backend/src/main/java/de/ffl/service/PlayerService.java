package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerRank;
import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.domain.Game;
import de.ffl.domain.Points;
import de.ffl.domain.Rule;
import de.ffl.dto.PlayerDto;
import de.ffl.dto.PlayerRankDto;
import de.ffl.dto.PlayerSearchDto;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.TeamRepository;
import de.ffl.repository.GameRepository;
import de.ffl.repository.PointsRepository;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final ManagerRepository managerRepository;
    private final PlayerRankRepository playerRankRepository;
    private final TeamRepository teamRepository;
    private final ManagerRankRepository managerRankRepository;
    private final GameRepository gameRepository;
    private final PointsRepository pointsRepository;

    public PlayerService(PlayerRepository playerRepository, ManagerRepository managerRepository, 
                         PlayerRankRepository playerRankRepository, TeamRepository teamRepository,
                         ManagerRankRepository managerRankRepository, GameRepository gameRepository,
                         PointsRepository pointsRepository) {
        this.playerRepository = playerRepository;
        this.managerRepository = managerRepository;
        this.playerRankRepository = playerRankRepository;
        this.teamRepository = teamRepository;
        this.managerRankRepository = managerRankRepository;
        this.gameRepository = gameRepository;
        this.pointsRepository = pointsRepository;
    }

    private Map<Long, Integer> buildPlayerPointsMap(List<Long> playerIds) {
        if (playerIds.isEmpty()) {
            return Map.of();
        }
        List<PlayerRank> allRanks = playerRankRepository.findByPlayerIdInWithRound(playerIds);
        Map<Long, PlayerRank> latestRankPerPlayer = new HashMap<>();
        for (PlayerRank rank : allRanks) {
            Long playerId = rank.getPlayer().getId();
            latestRankPerPlayer.compute(playerId, (k, current) -> {
                if (current == null) {
                    return rank;
                }
                long currentRoundId = current.getRound() != null ? current.getRound().getId() : 0;
                long newRoundId = rank.getRound() != null ? rank.getRound().getId() : 0;
                return newRoundId > currentRoundId ? rank : current;
            });
        }
        Map<Long, Integer> result = new HashMap<>();
        for (Map.Entry<Long, PlayerRank> entry : latestRankPerPlayer.entrySet()) {
            result.put(entry.getKey(), entry.getValue().getPointsTotal());
        }
        return result;
    }

    private Map<Long, Integer> buildPlayerPositionMap(List<Long> playerIds) {
        if (playerIds.isEmpty()) {
            return Map.of();
        }
        List<PlayerRank> allRanks = playerRankRepository.findByPlayerIdInWithRound(playerIds);
        Map<Long, PlayerRank> latestRankPerPlayer = new HashMap<>();
        for (PlayerRank rank : allRanks) {
            Long playerId = rank.getPlayer().getId();
            latestRankPerPlayer.compute(playerId, (k, current) -> {
                if (current == null) {
                    return rank;
                }
                long currentRoundId = current.getRound() != null ? current.getRound().getId() : 0;
                long newRoundId = rank.getRound() != null ? rank.getRound().getId() : 0;
                return newRoundId > currentRoundId ? rank : current;
            });
        }
        Map<Long, Integer> result = new HashMap<>();
        for (Map.Entry<Long, PlayerRank> entry : latestRankPerPlayer.entrySet()) {
            result.put(entry.getKey(), entry.getValue().getPositionTotal());
        }
        return result;
    }

    private Map<Long, Integer> buildPlayerPointsLastRoundMap(List<Long> playerIds) {
        if (playerIds.isEmpty()) {
            return Map.of();
        }
        List<PlayerRank> allRanks = playerRankRepository.findByPlayerIdInWithRound(playerIds);
        Map<Long, Season> playerToSeason = new HashMap<>();
        List<Player> players = playerRepository.findAllById(playerIds);
        for (Player p : players) {
            if (p.getSeason() != null) {
                playerToSeason.put(p.getId(), p.getSeason());
            }
        }
        Map<Long, Integer> result = new HashMap<>();
        for (PlayerRank rank : allRanks) {
            Long playerId = rank.getPlayer().getId();
            Season season = playerToSeason.get(playerId);
            if (season != null && season.getCurrentMatchday() != null && rank.getRound() != null) {
                if (rank.getRound().getNumber() == season.getCurrentMatchday()) {
                    result.put(playerId, rank.getPointsRound());
                }
            }
        }
        return result;
    }

    private Map<Long, Integer> buildPlayerPositionChangeMap(List<Long> playerIds) {
        if (playerIds.isEmpty()) {
            return Map.of();
        }
        List<PlayerRank> allRanks = playerRankRepository.findByPlayerIdInWithRound(playerIds);
        Map<Long, Season> playerToSeason = new HashMap<>();
        List<Player> players = playerRepository.findAllById(playerIds);
        for (Player p : players) {
            if (p.getSeason() != null) {
                playerToSeason.put(p.getId(), p.getSeason());
            }
        }
        
        Map<Long, Map<Integer, PlayerRank>> playerRanksByRound = new HashMap<>();
        for (PlayerRank rank : allRanks) {
            Long playerId = rank.getPlayer().getId();
            playerRanksByRound.computeIfAbsent(playerId, k -> new HashMap<>())
                .put(rank.getRound().getNumber(), rank);
        }
        
        Map<Long, Integer> result = new HashMap<>();
        for (Long playerId : playerIds) {
            Season season = playerToSeason.get(playerId);
            if (season != null && season.getCurrentMatchday() != null) {
                Integer currentMatchday = season.getCurrentMatchday();
                Map<Integer, PlayerRank> ranksByRound = playerRanksByRound.get(playerId);
                if (ranksByRound != null) {
                    PlayerRank currentRank = ranksByRound.get(currentMatchday);
                    PlayerRank previousRank = ranksByRound.get(currentMatchday - 1);
                    if (currentRank != null && previousRank != null 
                        && currentRank.getPositionTotal() != null 
                        && previousRank.getPositionTotal() != null) {
                        result.put(playerId, previousRank.getPositionTotal() - currentRank.getPositionTotal());
                    }
                }
            }
        }
        return result;
    }

    private Map<Long, Integer> buildManagerCountMap(List<Long> playerIds) {
        if (playerIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> counts = managerRepository.countManagersByPlayerIdIn(playerIds);
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

    private List<PlayerDto> convertToDtos(List<Player> players) {
        if (players.isEmpty()) {
            return List.of();
        }
        List<Long> playerIds = players.stream().map(Player::getId).collect(Collectors.toList());
        Map<Long, Integer> pointsMap = buildPlayerPointsMap(playerIds);
        Map<Long, Integer> managerCountMap = buildManagerCountMap(playerIds);
        Map<Long, Integer> positionMap = buildPlayerPositionMap(playerIds);
        Map<Long, Integer> pointsLastRoundMap = buildPlayerPointsLastRoundMap(playerIds);
        Map<Long, Integer> positionChangeMap = buildPlayerPositionChangeMap(playerIds);
        return players.stream()
            .map(p -> {
                PlayerDto dto = PlayerDto.fromEntity(p);
                dto.setManagerCount(managerCountMap.getOrDefault(p.getId(), 0));
                dto.setManagers(null);
                dto.setPoints(pointsMap.getOrDefault(p.getId(), 0));
                dto.setPositionTotal(positionMap.getOrDefault(p.getId(), null));
                dto.setPointsLastRound(pointsLastRoundMap.getOrDefault(p.getId(), 0));
                dto.setPositionChange(positionChangeMap.get(p.getId()));
                return dto;
            })
            .collect(Collectors.toList());
    }

    public List<PlayerDto> findAll() {
        List<Player> players = playerRepository.findAllWithTeams();
        return convertToDtos(players);
    }

    public List<PlayerDto> findBySeasonId(Long seasonId) {
        List<Player> players = playerRepository.findBySeasonIdWithTeams(seasonId);
        return convertToDtos(players);
    }

    public List<PlayerDto> findBySeasonAndPosition(Long seasonId, Position position) {
        List<Player> players = playerRepository.findBySeasonIdWithTeams(seasonId).stream()
            .filter(p -> p.getPosition() == position)
            .toList();
        return convertToDtos(players);
    }

    public List<PlayerDto> findByTeamId(Long teamId) {
        List<Player> players = playerRepository.findByTeamIdWithTeams(teamId);
        return convertToDtos(players);
    }

    public List<PlayerSearchDto> findByTeamAndSeason(Long teamId, Long seasonId) {
        List<Player> players = playerRepository.findByTeamIdAndSeasonId(teamId, seasonId);
        return players.stream()
            .map(PlayerSearchDto::fromEntity)
            .collect(Collectors.toList());
    }

    public List<PlayerSearchDto> findBySeasonIdAsSearchDto(Long seasonId) {
        List<Player> players = playerRepository.findBySeasonIdWithTeams(seasonId);
        return players.stream()
            .map(PlayerSearchDto::fromEntity)
            .collect(Collectors.toList());
    }

    public PlayerDto findByIdWithManagers(Long id) {
        Player player = playerRepository.findById(id).orElse(null);
        if (player == null) {
            return null;
        }
        Hibernate.initialize(player.getTeams());
        Hibernate.initialize(player.getSeason());
        List<Manager> managers = managerRepository.findManagersByPlayerId(id);
        
        List<Long> managerIds = managers.stream().map(Manager::getId).collect(Collectors.toList());
        Map<Long, ManagerRank> latestRanks = loadLatestManagerRanks(managerIds, managers);
        Map<Long, ManagerRank> previousRanks = loadPreviousManagerRanks(managerIds, managers);
        
        PlayerDto dto = PlayerDto.fromEntityWithManagers(player, managers);
        dto.setPoints(getPlayerPoints(id));
        dto.setPositionTotal(getPlayerPositionTotal(id));
        dto.setPointsLastRound(getPlayerPointsLastRound(id));
        
        if (player.getSeason() != null) {
            PlayerDto.SeasonInfo seasonInfo = new PlayerDto.SeasonInfo();
            seasonInfo.setId(player.getSeason().getId());
            seasonInfo.setName(player.getSeason().getName());
            seasonInfo.setCurrentMatchday(player.getSeason().getCurrentMatchday());
            dto.setSeason(seasonInfo);
        }
        
        for (int i = 0; i < managers.size(); i++) {
            Manager m = managers.get(i);
            PlayerDto.ManagerInfo info = dto.getManagers().get(i);
            ManagerRank currentRank = latestRanks.get(m.getId());
            ManagerRank prevRank = previousRanks.get(m.getId());
            
            if (m.getUser() != null) {
                info.setFirstName(m.getUser().getFirstName());
                info.setLastName(m.getUser().getLastName());
            }
            
            info.setTeamValue(calculateTeamValue(m));
            info.setPaymentState(m.getPaymentState().name());
            
            if (currentRank != null) {
                info.setPositionTotal(currentRank.getPositionTotal());
                info.setPointsTotal(currentRank.getPointsTotal());
                info.setPointsLastRound(currentRank.getPointsRound());
                
                if (prevRank != null && prevRank.getPositionTotal() != null) {
                    info.setPositionChange(prevRank.getPositionTotal() - currentRank.getPositionTotal());
                }
            }
        }
        
        return dto;
    }
    
    private Map<Long, ManagerRank> loadLatestManagerRanks(List<Long> managerIds, List<Manager> managers) {
        if (managerIds.isEmpty()) {
            return Map.of();
        }
        
        List<ManagerRank> ranks = managerRankRepository.findByManagerIdIn(managerIds);
        
        Map<Long, Season> managerToSeason = new HashMap<>();
        for (Manager m : managers) {
            if (m.getSeason() != null) {
                managerToSeason.put(m.getId(), m.getSeason());
            }
        }
        
        Map<Long, ManagerRank> result = new HashMap<>();
        for (ManagerRank rank : ranks) {
            Long managerId = rank.getManager().getId();
            Season season = managerToSeason.get(managerId);
            if (season != null && season.getCurrentMatchday() != null) {
                if (rank.getRound().getNumber() == season.getCurrentMatchday()) {
                    result.put(managerId, rank);
                }
            }
        }
        return result;
    }
    
    private int calculateTeamValue(Manager manager) {
        int value = 0;
        if (manager.getPlayerGoalkeeper() != null) value += manager.getPlayerGoalkeeper().getPrize();
        if (manager.getPlayerDefender1() != null) value += manager.getPlayerDefender1().getPrize();
        if (manager.getPlayerDefender2() != null) value += manager.getPlayerDefender2().getPrize();
        if (manager.getPlayerDefender3() != null) value += manager.getPlayerDefender3().getPrize();
        if (manager.getPlayerMidfield1() != null) value += manager.getPlayerMidfield1().getPrize();
        if (manager.getPlayerMidfield2() != null) value += manager.getPlayerMidfield2().getPrize();
        if (manager.getPlayerMidfield3() != null) value += manager.getPlayerMidfield3().getPrize();
        if (manager.getPlayerStriker1() != null) value += manager.getPlayerStriker1().getPrize();
        if (manager.getPlayerStriker2() != null) value += manager.getPlayerStriker2().getPrize();
        if (manager.getPlayerStriker3() != null) value += manager.getPlayerStriker3().getPrize();
        if (manager.getPlayerFreeChoice() != null) value += manager.getPlayerFreeChoice().getPrize();
        return value;
    }
    
    private Map<Long, ManagerRank> loadPreviousManagerRanks(List<Long> managerIds, List<Manager> managers) {
        if (managerIds.isEmpty()) {
            return Map.of();
        }
        
        List<ManagerRank> ranks = managerRankRepository.findByManagerIdIn(managerIds);
        
        Map<Long, Season> managerToSeason = new HashMap<>();
        for (Manager m : managers) {
            if (m.getSeason() != null) {
                managerToSeason.put(m.getId(), m.getSeason());
            }
        }
        
        Map<Long, ManagerRank> result = new HashMap<>();
        for (ManagerRank rank : ranks) {
            Long managerId = rank.getManager().getId();
            Season season = managerToSeason.get(managerId);
            if (season != null && season.getCurrentMatchday() != null && rank.getRound() != null) {
                if (rank.getRound().getNumber() == season.getCurrentMatchday() - 1) {
                    result.put(managerId, rank);
                }
            }
        }
        return result;
    }
    
    public List<PlayerRankDto> findRanksByPlayerId(Long id) {
        Player player = playerRepository.findById(id).orElse(null);
        if (player == null) {
            return null;
        }
        
        List<PlayerRank> ranks = playerRankRepository.findByPlayerId(id);
        
        List<Points> allPoints = pointsRepository.findByPlayerIdWithGameAndRound(id);
        Map<Long, List<Points>> pointsByRoundId = allPoints.stream()
            .filter(p -> p.getGame() != null && p.getGame().getRound() != null)
            .collect(Collectors.groupingBy(p -> p.getGame().getRound().getId()));
        
        return ranks.stream()
            .filter(PlayerRank::getPlayed)
            .sorted(Comparator.comparing(r -> r.getRound().getNumber()))
            .map(rank -> {
                PlayerRankDto dto = PlayerRankDto.fromEntity(rank);
                
                List<Game> games = gameRepository.findByRoundId(rank.getRound().getId());
                games.stream()
                    .filter(g -> g.getPlayersHost().contains(player) || g.getPlayersVisitor().contains(player))
                    .findFirst()
                    .ifPresent(game -> {
                        String hostName = game.getHost() != null ? game.getHost().getName() : "";
                        String visitorName = game.getVisitor() != null ? game.getVisitor().getName() : "";
                        dto.setGameName(hostName + " - " + visitorName);
                        dto.setGoalHost(game.getGoalHost());
                        dto.setGoalVisitor(game.getGoalVisitor());
                    });
                
                List<Points> roundPoints = pointsByRoundId.getOrDefault(rank.getRound().getId(), List.of());
                Map<Rule, Integer> ruleCounts = new HashMap<>();
                for (Points p : roundPoints) {
                    ruleCounts.merge(p.getRule(), 1, Integer::sum);
                }
                
                List<PlayerRankDto.RulePointDto> rules = ruleCounts.entrySet().stream()
                    .map(entry -> PlayerRankDto.RulePointDto.builder()
                        .rule(entry.getKey().name())
                        .ruleLabel(getRuleLabel(entry.getKey()))
                        .count(entry.getValue())
                        .points(entry.getKey().getPoints() * entry.getValue())
                        .build())
                    .sorted(Comparator.comparing(PlayerRankDto.RulePointDto::getPoints).reversed())
                    .collect(Collectors.toList());
                
                dto.setRules(rules);
                return dto;
            })
            .collect(Collectors.toList());
    }
    
    private String getRuleLabel(Rule rule) {
        return switch (rule) {
            case GOAL_STRIKER -> "Tor Stürmer";
            case GOAL_MIDFIELDER -> "Tor Mittelfeldspieler";
            case GOAL_DEFENDER -> "Tor Verteidiger";
            case TO_NULL_GOALKEEPER -> "Zu Null Torwart";
            case TO_NULL_DEFENDER -> "Zu Null Verteidiger";
            case GOAL_GOALKEEPER -> "Tor Torwart";
            case GOAL_GOALKEEPER_BY_PENALTY -> "Tor Torwart (Elfmeter)";
        };
    }

    public PlayerDto fromEntityWithPoints(Player player) {
        Hibernate.initialize(player.getTeams());
        PlayerDto dto = PlayerDto.fromEntity(player);
        dto.setPoints(getPlayerPoints(player.getId()));
        return dto;
    }

    public Player findById(Long id) {
        Player player = playerRepository.findById(id).orElse(null);
        if (player != null) {
            Hibernate.initialize(player.getTeams());
        }
        return player;
    }

    public Player save(Player player) {
        return playerRepository.save(player);
    }

    public void delete(Long id) {
        playerRepository.deleteById(id);
    }

    private Integer getPlayerPoints(Long playerId) {
        List<PlayerRank> ranks = playerRankRepository.findByPlayerId(playerId);
        return ranks.stream()
            .max(Comparator.comparing(r -> r.getRound().getId()))
            .map(PlayerRank::getPointsTotal)
            .orElse(0);
    }
    
    private Integer getPlayerPositionTotal(Long playerId) {
        List<PlayerRank> ranks = playerRankRepository.findByPlayerId(playerId);
        return ranks.stream()
            .max(Comparator.comparing(r -> r.getRound().getId()))
            .map(PlayerRank::getPositionTotal)
            .orElse(null);
    }
    
    private Integer getPlayerPointsLastRound(Long playerId) {
        List<PlayerRank> ranks = playerRankRepository.findByPlayerId(playerId);
        return ranks.stream()
            .max(Comparator.comparing(r -> r.getRound().getId()))
            .map(PlayerRank::getPointsRound)
            .orElse(null);
    }

    public List<PlayerSearchDto> searchPlayers(Long seasonId, String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return List.of();
        }
        List<Player> players = playerRepository.searchBySeasonIdAndName(seasonId, searchTerm.trim());
        return players.stream()
            .map(PlayerSearchDto::fromEntity)
            .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional
    public void assignPlayerToTeam(Long playerId, Long teamId, String alternativeName) {
        Player player = playerRepository.findById(playerId).orElse(null);
        if (player == null) return;
        
        if (alternativeName != null && !alternativeName.trim().isEmpty()) {
            if (player.getNameKickerAlt1() == null || player.getNameKickerAlt1().isEmpty()) {
                player.setNameKickerAlt1(alternativeName);
            } else if (player.getNameKickerAlt2() == null || player.getNameKickerAlt2().isEmpty()) {
                player.setNameKickerAlt2(alternativeName);
            } else if (player.getNameKickerAlt3() == null || player.getNameKickerAlt3().isEmpty()) {
                player.setNameKickerAlt3(alternativeName);
            }
        }
        
        var team = teamRepository.findById(teamId).orElse(null);
        if (team != null && player.getTeams() != null && !player.getTeams().contains(team)) {
            player.getTeams().add(team);
        }
        
        playerRepository.save(player);
    }

    @org.springframework.transaction.annotation.Transactional
    public PlayerDto update(Long id, PlayerDto updateData) {
        Player player = playerRepository.findById(id).orElse(null);
        if (player == null) {
            return null;
        }
        
        if (updateData.getPrize() != null) {
            player.setPrize(updateData.getPrize());
        }
        if (updateData.getPictureUrl() != null) {
            player.setPictureUrl(updateData.getPictureUrl().isEmpty() ? null : updateData.getPictureUrl());
        }
        if (updateData.getPosition() != null) {
            player.setPosition(updateData.getPosition());
        }
        
        Player saved = playerRepository.save(player);
        Hibernate.initialize(saved.getTeams());
        return PlayerDto.fromEntity(saved);
    }
}
