package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Position;
import de.ffl.dto.PlayerDto;
import de.ffl.dto.PlayerSearchDto;
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

    public PlayerService(PlayerRepository playerRepository, ManagerRepository managerRepository, 
                         PlayerRankRepository playerRankRepository, TeamRepository teamRepository) {
        this.playerRepository = playerRepository;
        this.managerRepository = managerRepository;
        this.playerRankRepository = playerRankRepository;
        this.teamRepository = teamRepository;
    }

    private Map<Long, Integer> buildPlayerPointsMap(List<Long> playerIds) {
        if (playerIds.isEmpty()) {
            return Map.of();
        }
        List<PlayerRank> allRanks = playerRankRepository.findByPlayerIdInWithRound(playerIds);
        Map<Long, Integer> pointsMap = new HashMap<>();
        for (PlayerRank rank : allRanks) {
            Long playerId = rank.getPlayer().getId();
            pointsMap.compute(playerId, (k, current) -> {
                if (current == null) {
                    return rank.getPointsTotal();
                }
                Integer currentRoundId = rank.getRound() != null ? Math.toIntExact(rank.getRound().getId()) : 0;
                return rank.getPointsTotal();
            });
        }
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
        return players.stream()
            .map(p -> {
                PlayerDto dto = PlayerDto.fromEntity(p);
                dto.setManagerCount(managerCountMap.getOrDefault(p.getId(), 0));
                dto.setManagers(null);
                dto.setPoints(pointsMap.getOrDefault(p.getId(), 0));
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

    public PlayerDto findByIdWithManagers(Long id) {
        Player player = playerRepository.findById(id).orElse(null);
        if (player == null) {
            return null;
        }
        Hibernate.initialize(player.getTeams());
        List<Manager> managers = managerRepository.findManagersByPlayerId(id);
        PlayerDto dto = PlayerDto.fromEntityWithManagers(player, managers);
        dto.setPoints(getPlayerPoints(id));
        return dto;
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
