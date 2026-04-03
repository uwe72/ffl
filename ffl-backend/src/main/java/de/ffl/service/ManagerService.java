package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerRank;
import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.dto.ManagerDto;
import de.ffl.dto.PlayerDto;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.SeasonRepository;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ManagerService {

    private final ManagerRepository managerRepository;
    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;
    private final PlayerRankRepository playerRankRepository;
    private final ManagerRankRepository managerRankRepository;

    public ManagerService(ManagerRepository managerRepository,
                          PlayerRepository playerRepository,
                          SeasonRepository seasonRepository,
                          PlayerRankRepository playerRankRepository,
                          ManagerRankRepository managerRankRepository) {
        this.managerRepository = managerRepository;
        this.playerRepository = playerRepository;
        this.seasonRepository = seasonRepository;
        this.playerRankRepository = playerRankRepository;
        this.managerRankRepository = managerRankRepository;
    }

    @Transactional(readOnly = true)
    public List<ManagerDto> findAll() {
        List<Manager> managers = managerRepository.findAllWithPlayers();
        return convertManagersToDto(managers);
    }

    @Transactional(readOnly = true)
    public List<ManagerDto> findBySeasonId(Long seasonId) {
        List<Manager> managers = managerRepository.findBySeasonIdWithPlayers(seasonId);
        return convertManagersToDto(managers);
    }

    @Transactional(readOnly = true)
    public ManagerDto findById(Long id) {
        Manager manager = managerRepository.findById(id).orElse(null);
        if (manager == null) {
            return null;
        }
        
        List<Manager> managers = List.of(manager);
        Set<Long> playerIds = collectPlayerIds(managers);
        
        Map<Long, PlayerRank> latestPlayerRanks = loadLatestPlayerRanks(playerIds);
        Map<Long, ManagerRank> latestManagerRanks = loadLatestManagerRanks(List.of(id));
        
        return convertToDto(manager, latestPlayerRanks, latestManagerRanks);
    }

    private List<ManagerDto> convertManagersToDto(List<Manager> managers) {
        Set<Long> playerIds = collectPlayerIds(managers);
        List<Long> managerIds = managers.stream().map(Manager::getId).collect(Collectors.toList());
        
        Map<Long, PlayerRank> latestPlayerRanks = loadLatestPlayerRanks(playerIds);
        Map<Long, ManagerRank> latestManagerRanks = loadLatestManagerRanks(managerIds);
        
        return managers.stream()
            .map(m -> convertToDto(m, latestPlayerRanks, latestManagerRanks))
            .collect(Collectors.toList());
    }

    private Set<Long> collectPlayerIds(List<Manager> managers) {
        Set<Long> playerIds = new HashSet<>();
        for (Manager m : managers) {
            if (m.getPlayerGoalkeeper() != null) playerIds.add(m.getPlayerGoalkeeper().getId());
            if (m.getPlayerDefender1() != null) playerIds.add(m.getPlayerDefender1().getId());
            if (m.getPlayerDefender2() != null) playerIds.add(m.getPlayerDefender2().getId());
            if (m.getPlayerDefender3() != null) playerIds.add(m.getPlayerDefender3().getId());
            if (m.getPlayerMidfield1() != null) playerIds.add(m.getPlayerMidfield1().getId());
            if (m.getPlayerMidfield2() != null) playerIds.add(m.getPlayerMidfield2().getId());
            if (m.getPlayerMidfield3() != null) playerIds.add(m.getPlayerMidfield3().getId());
            if (m.getPlayerStriker1() != null) playerIds.add(m.getPlayerStriker1().getId());
            if (m.getPlayerStriker2() != null) playerIds.add(m.getPlayerStriker2().getId());
            if (m.getPlayerStriker3() != null) playerIds.add(m.getPlayerStriker3().getId());
            if (m.getPlayerFreeChoice() != null) playerIds.add(m.getPlayerFreeChoice().getId());
            if (m.getPlayerExchangedOld1() != null) playerIds.add(m.getPlayerExchangedOld1().getId());
            if (m.getPlayerExchangedOld2() != null) playerIds.add(m.getPlayerExchangedOld2().getId());
            if (m.getPlayerExchangedOld3() != null) playerIds.add(m.getPlayerExchangedOld3().getId());
            if (m.getPlayerExchangedNew1() != null) playerIds.add(m.getPlayerExchangedNew1().getId());
            if (m.getPlayerExchangedNew2() != null) playerIds.add(m.getPlayerExchangedNew2().getId());
            if (m.getPlayerExchangedNew3() != null) playerIds.add(m.getPlayerExchangedNew3().getId());
        }
        return playerIds;
    }

    private Map<Long, PlayerRank> loadLatestPlayerRanks(Set<Long> playerIds) {
        if (playerIds.isEmpty()) {
            return Map.of();
        }
        
        List<PlayerRank> ranks = playerRankRepository.findByPlayerIdIn(new ArrayList<>(playerIds));
        
        Map<Long, PlayerRank> latestRanks = new HashMap<>();
        for (PlayerRank rank : ranks) {
            Long playerId = rank.getPlayer().getId();
            latestRanks.compute(playerId, (k, existing) -> {
                if (existing == null || rank.getRound().getId() > existing.getRound().getId()) {
                    return rank;
                }
                return existing;
            });
        }
        return latestRanks;
    }

    private Map<Long, ManagerRank> loadLatestManagerRanks(List<Long> managerIds) {
        if (managerIds.isEmpty()) {
            return Map.of();
        }
        
        List<ManagerRank> ranks = managerRankRepository.findByManagerIdIn(managerIds);
        
        Map<Long, ManagerRank> latestRanks = new HashMap<>();
        for (ManagerRank rank : ranks) {
            Long managerId = rank.getManager().getId();
            latestRanks.compute(managerId, (k, existing) -> {
                if (existing == null || rank.getRound().getId() > existing.getRound().getId()) {
                    return rank;
                }
                return existing;
            });
        }
        return latestRanks;
    }

    private ManagerDto convertToDto(Manager manager, 
                                     Map<Long, PlayerRank> latestPlayerRanks,
                                     Map<Long, ManagerRank> latestManagerRanks) {
        Hibernate.initialize(manager.getUser());
        Hibernate.initialize(manager.getSeason());
        
        ManagerDto dto = new ManagerDto();
        dto.setId(manager.getId());
        dto.setName(manager.getName());
        dto.setShortName(manager.getShortName());
        
        if (manager.getUser() != null) {
            dto.setFirstName(manager.getUser().getFirstName());
            dto.setLastName(manager.getUser().getLastName());
        }
        
        dto.setPaymentState(manager.getPaymentState().name());
        dto.setDescription(manager.getDescription());
        
        if (manager.getSeason() != null) {
            dto.setSeasonId(manager.getSeason().getId());
            dto.setSeasonName(manager.getSeason().getName());
        }
        
        if (manager.getPlayerGoalkeeper() != null) {
            dto.setPlayerGoalkeeper(convertPlayer(manager.getPlayerGoalkeeper(), latestPlayerRanks));
        }
        if (manager.getPlayerDefender1() != null) {
            dto.setPlayerDefender1(convertPlayer(manager.getPlayerDefender1(), latestPlayerRanks));
        }
        if (manager.getPlayerDefender2() != null) {
            dto.setPlayerDefender2(convertPlayer(manager.getPlayerDefender2(), latestPlayerRanks));
        }
        if (manager.getPlayerDefender3() != null) {
            dto.setPlayerDefender3(convertPlayer(manager.getPlayerDefender3(), latestPlayerRanks));
        }
        if (manager.getPlayerMidfield1() != null) {
            dto.setPlayerMidfield1(convertPlayer(manager.getPlayerMidfield1(), latestPlayerRanks));
        }
        if (manager.getPlayerMidfield2() != null) {
            dto.setPlayerMidfield2(convertPlayer(manager.getPlayerMidfield2(), latestPlayerRanks));
        }
        if (manager.getPlayerMidfield3() != null) {
            dto.setPlayerMidfield3(convertPlayer(manager.getPlayerMidfield3(), latestPlayerRanks));
        }
        if (manager.getPlayerStriker1() != null) {
            dto.setPlayerStriker1(convertPlayer(manager.getPlayerStriker1(), latestPlayerRanks));
        }
        if (manager.getPlayerStriker2() != null) {
            dto.setPlayerStriker2(convertPlayer(manager.getPlayerStriker2(), latestPlayerRanks));
        }
        if (manager.getPlayerStriker3() != null) {
            dto.setPlayerStriker3(convertPlayer(manager.getPlayerStriker3(), latestPlayerRanks));
        }
        if (manager.getPlayerFreeChoice() != null) {
            dto.setPlayerFreeChoice(convertPlayer(manager.getPlayerFreeChoice(), latestPlayerRanks));
        }
        
        if (manager.getPlayerExchangedOld1() != null) {
            dto.setPlayerExchangedOld1(convertPlayer(manager.getPlayerExchangedOld1(), latestPlayerRanks));
        }
        if (manager.getPlayerExchangedOld2() != null) {
            dto.setPlayerExchangedOld2(convertPlayer(manager.getPlayerExchangedOld2(), latestPlayerRanks));
        }
        if (manager.getPlayerExchangedOld3() != null) {
            dto.setPlayerExchangedOld3(convertPlayer(manager.getPlayerExchangedOld3(), latestPlayerRanks));
        }
        if (manager.getPlayerExchangedNew1() != null) {
            dto.setPlayerExchangedNew1(convertPlayer(manager.getPlayerExchangedNew1(), latestPlayerRanks));
        }
        if (manager.getPlayerExchangedNew2() != null) {
            dto.setPlayerExchangedNew2(convertPlayer(manager.getPlayerExchangedNew2(), latestPlayerRanks));
        }
        if (manager.getPlayerExchangedNew3() != null) {
            dto.setPlayerExchangedNew3(convertPlayer(manager.getPlayerExchangedNew3(), latestPlayerRanks));
        }
        
        int teamValue = calculateTeamValue(manager);
        dto.setTeamValue(teamValue);
        
        ManagerRank rank = latestManagerRanks.get(manager.getId());
        if (rank != null) {
            dto.setPointsTotal(rank.getPointsTotal());
            dto.setPositionTotal(rank.getPositionTotal());
            dto.setPointsLastRound(rank.getPointsRound());
            dto.setPositionLastRound(rank.getPositionRound());
        }
        
        return dto;
    }

    private int calculateTeamValue(Manager manager) {
        int hinrundeValue = 0;
        hinrundeValue += getPlayerPrize(manager.getPlayerGoalkeeper());
        hinrundeValue += getPlayerPrize(manager.getPlayerDefender1());
        hinrundeValue += getPlayerPrize(manager.getPlayerDefender2());
        hinrundeValue += getPlayerPrize(manager.getPlayerDefender3());
        hinrundeValue += getPlayerPrize(manager.getPlayerMidfield1());
        hinrundeValue += getPlayerPrize(manager.getPlayerMidfield2());
        hinrundeValue += getPlayerPrize(manager.getPlayerMidfield3());
        hinrundeValue += getPlayerPrize(manager.getPlayerStriker1());
        hinrundeValue += getPlayerPrize(manager.getPlayerStriker2());
        hinrundeValue += getPlayerPrize(manager.getPlayerStriker3());
        hinrundeValue += getPlayerPrize(manager.getPlayerFreeChoice());

        Season season = manager.getSeason();
        if (season != null && season.getSeasonState() == SeasonState.RUNNING_RUECKRUNDE) {
            int rueckrundeValue = hinrundeValue;
            rueckrundeValue -= getPlayerPrize(manager.getPlayerExchangedOld1());
            rueckrundeValue -= getPlayerPrize(manager.getPlayerExchangedOld2());
            rueckrundeValue -= getPlayerPrize(manager.getPlayerExchangedOld3());
            rueckrundeValue += getPlayerPrize(manager.getPlayerExchangedNew1());
            rueckrundeValue += getPlayerPrize(manager.getPlayerExchangedNew2());
            rueckrundeValue += getPlayerPrize(manager.getPlayerExchangedNew3());
            return rueckrundeValue;
        }
        
        return hinrundeValue;
    }

    private int getPlayerPrize(Player player) {
        return player != null ? player.getPrize() : 0;
    }

    private PlayerDto convertPlayer(Player player, Map<Long, PlayerRank> latestPlayerRanks) {
        if (player == null) return null;
        
        Hibernate.initialize(player.getTeams());
        
        PlayerDto dto = PlayerDto.fromEntity(player);
        
        PlayerRank rank = latestPlayerRanks.get(player.getId());
        if (rank != null) {
            dto.setPoints(rank.getPointsTotal());
        } else {
            dto.setPoints(0);
        }
        
        return dto;
    }

    @Transactional
    public Manager createManager(Manager manager) {
        validateTeam(manager);
        return managerRepository.save(manager);
    }

    @Transactional
    public Manager updateManager(Manager manager) {
        validateTeam(manager);
        return managerRepository.save(manager);
    }

    public void validateTeam(Manager manager) {
        List<Player> players = manager.getPlayers().stream().toList();
        
        if (players.size() != 11) {
            throw new IllegalArgumentException("Team must have exactly 11 players");
        }

        Map<Position, Long> positionCount = players.stream()
            .collect(Collectors.groupingBy(Player::getPosition, Collectors.counting()));

        int goalkeepers = positionCount.getOrDefault(Position.GOALKEEPER, 0L).intValue();
        int defenders = positionCount.getOrDefault(Position.DEFENDER, 0L).intValue();
        int midfielders = positionCount.getOrDefault(Position.MIDFIELD, 0L).intValue();
        int strikers = positionCount.getOrDefault(Position.STRIKER, 0L).intValue();

        if (goalkeepers != 1) {
            throw new IllegalArgumentException("Team must have exactly 1 goalkeeper");
        }
        if (defenders < 3 || defenders > 4) {
            throw new IllegalArgumentException("Team must have 3-4 defenders");
        }
        if (midfielders < 3 || midfielders > 4) {
            throw new IllegalArgumentException("Team must have 3-4 midfielders");
        }
        if (strikers < 3 || strikers > 4) {
            throw new IllegalArgumentException("Team must have 3-4 strikers");
        }

        int totalValue = players.stream().mapToInt(Player::getPrize).sum();
        if (totalValue > manager.getBudget()) {
            throw new IllegalArgumentException("Team value exceeds budget");
        }

        Map<Long, Long> teamCount = players.stream()
            .filter(p -> p.getTeams() != null && !p.getTeams().isEmpty())
            .collect(Collectors.groupingBy(p -> p.getTeams().get(p.getTeams().size() - 1).getId(), Collectors.counting()));

        for (Long count : teamCount.values()) {
            if (count > 5) {
                throw new IllegalArgumentException("Maximum 5 players from the same team allowed");
            }
        }
    }
}
