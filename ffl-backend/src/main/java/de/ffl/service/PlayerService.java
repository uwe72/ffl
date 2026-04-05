package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerRank;
import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.dto.PlayerDto;
import de.ffl.dto.PlayerSearchDto;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.TeamRepository;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;

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

    public PlayerService(PlayerRepository playerRepository, ManagerRepository managerRepository, 
                         PlayerRankRepository playerRankRepository, TeamRepository teamRepository,
                         ManagerRankRepository managerRankRepository) {
        this.playerRepository = playerRepository;
        this.managerRepository = managerRepository;
        this.playerRankRepository = playerRankRepository;
        this.teamRepository = teamRepository;
        this.managerRankRepository = managerRankRepository;
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
        return players.stream()
            .map(p -> {
                PlayerDto dto = PlayerDto.fromEntity(p);
                dto.setManagerCount(managerCountMap.getOrDefault(p.getId(), 0));
                dto.setManagers(null);
                dto.setPoints(pointsMap.getOrDefault(p.getId(), 0));
                dto.setPositionTotal(positionMap.getOrDefault(p.getId(), null));
                dto.setPointsLastRound(pointsLastRoundMap.getOrDefault(p.getId(), 0));
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
        List<Manager> managers = managerRepository.findManagersByPlayerId(id);
        
        List<Long> managerIds = managers.stream().map(Manager::getId).collect(Collectors.toList());
        Map<Long, ManagerRank> latestRanks = loadLatestManagerRanks(managerIds, managers);
        
        PlayerDto dto = PlayerDto.fromEntityWithManagers(player, managers);
        dto.setPoints(getPlayerPoints(id));
        
        for (int i = 0; i < managers.size(); i++) {
            Manager m = managers.get(i);
            PlayerDto.ManagerInfo info = dto.getManagers().get(i);
            ManagerRank rank = latestRanks.get(m.getId());
            
            if (m.getUser() != null) {
                info.setFirstName(m.getUser().getFirstName());
                info.setLastName(m.getUser().getLastName());
            }
            
            info.setTeamValue(calculateTeamValue(m));
            info.setPaymentState(m.getPaymentState().name());
            
            if (rank != null) {
                info.setPositionTotal(rank.getPositionTotal());
                info.setPointsTotal(rank.getPointsTotal());
                info.setPointsLastRound(rank.getPointsRound());
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
}
