package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerRank;
import de.ffl.domain.Player;
import de.ffl.domain.PlayerRank;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.User;
import de.ffl.dto.ManagerDto;
import de.ffl.dto.ManagerRoundStatsDto;
import de.ffl.dto.PlayerDto;
import de.ffl.dto.PositionStatsDto;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.UserRepository;
import org.hibernate.Hibernate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final UserRepository userRepository;

    public ManagerService(ManagerRepository managerRepository,
                          PlayerRepository playerRepository,
                          SeasonRepository seasonRepository,
                          PlayerRankRepository playerRankRepository,
                          ManagerRankRepository managerRankRepository,
                          UserRepository userRepository) {
        this.managerRepository = managerRepository;
        this.playerRepository = playerRepository;
        this.seasonRepository = seasonRepository;
        this.playerRankRepository = playerRankRepository;
        this.managerRankRepository = managerRankRepository;
        this.userRepository = userRepository;
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
        Map<Long, ManagerRank> latestManagerRanks = loadLatestManagerRanks(List.of(id), managers);
        Map<Long, List<ManagerRank>> allManagerRanks = loadAllManagerRanks(List.of(id));
        Map<Long, Integer> playerPositionMap = buildPlayerPositionMap(playerIds, managers);
        Map<Long, Integer> playerPointsLastRoundMap = buildPlayerPointsLastRoundMap(playerIds, managers);
        Map<Long, Integer> playerPositionChangeMap = buildPlayerPositionChangeMap(playerIds, managers);
        
        return convertToDto(manager, latestPlayerRanks, latestManagerRanks, allManagerRanks,
                           playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap);
    }

    private List<ManagerDto> convertManagersToDto(List<Manager> managers) {
        Set<Long> playerIds = collectPlayerIds(managers);
        List<Long> managerIds = managers.stream().map(Manager::getId).collect(Collectors.toList());
        
        Map<Long, PlayerRank> latestPlayerRanks = loadLatestPlayerRanks(playerIds);
        Map<Long, ManagerRank> latestManagerRanks = loadLatestManagerRanks(managerIds, managers);
        Map<Long, List<ManagerRank>> allManagerRanks = loadAllManagerRanks(managerIds);
        Map<Long, Integer> playerPositionMap = buildPlayerPositionMap(playerIds, managers);
        Map<Long, Integer> playerPointsLastRoundMap = buildPlayerPointsLastRoundMap(playerIds, managers);
        Map<Long, Integer> playerPositionChangeMap = buildPlayerPositionChangeMap(playerIds, managers);
        
        return managers.stream()
            .map(m -> convertToDto(m, latestPlayerRanks, latestManagerRanks, allManagerRanks, 
                                   playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap))
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
    
    private Map<Long, Integer> buildPlayerPointsLastRoundMap(Set<Long> playerIds, List<Manager> managers) {
        if (playerIds.isEmpty() || managers.isEmpty()) {
            return Map.of();
        }
        
        Season season = managers.get(0).getSeason();
        if (season == null || season.getCurrentMatchday() == null) {
            return Map.of();
        }
        
        Integer currentMatchday = season.getCurrentMatchday();
        List<PlayerRank> ranks = playerRankRepository.findByPlayerIdIn(new ArrayList<>(playerIds));
        
        Map<Long, Integer> result = new HashMap<>();
        for (PlayerRank rank : ranks) {
            if (rank.getRound() != null && rank.getRound().getNumber() == currentMatchday) {
                result.put(rank.getPlayer().getId(), rank.getPointsRound());
            }
        }
        return result;
    }
    
    private Map<Long, Integer> buildPlayerPositionMap(Set<Long> playerIds, List<Manager> managers) {
        if (playerIds.isEmpty() || managers.isEmpty()) {
            return Map.of();
        }
        
        Season season = managers.get(0).getSeason();
        if (season == null || season.getCurrentMatchday() == null) {
            return Map.of();
        }
        
        Integer currentMatchday = season.getCurrentMatchday();
        List<PlayerRank> ranks = playerRankRepository.findByPlayerIdIn(new ArrayList<>(playerIds));
        
        Map<Long, Integer> result = new HashMap<>();
        for (PlayerRank rank : ranks) {
            if (rank.getRound() != null && rank.getRound().getNumber() == currentMatchday) {
                result.put(rank.getPlayer().getId(), rank.getPositionTotal());
            }
        }
        return result;
    }
    
    private Map<Long, Integer> buildPlayerPositionChangeMap(Set<Long> playerIds, List<Manager> managers) {
        if (playerIds.isEmpty() || managers.isEmpty()) {
            return Map.of();
        }
        
        Season season = managers.get(0).getSeason();
        if (season == null || season.getCurrentMatchday() == null) {
            return Map.of();
        }
        
        Integer currentMatchday = season.getCurrentMatchday();
        List<PlayerRank> ranks = playerRankRepository.findByPlayerIdIn(new ArrayList<>(playerIds));
        
        Map<Long, Map<Integer, PlayerRank>> playerRanksByRound = new HashMap<>();
        for (PlayerRank rank : ranks) {
            Long playerId = rank.getPlayer().getId();
            playerRanksByRound.computeIfAbsent(playerId, k -> new HashMap<>())
                .put(rank.getRound().getNumber(), rank);
        }
        
        Map<Long, Integer> result = new HashMap<>();
        for (Long playerId : playerIds) {
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
        return result;
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
            if (season != null && season.getCurrentMatchday() != null && rank.getRound() != null) {
                if (rank.getRound().getNumber() == season.getCurrentMatchday()) {
                    result.put(managerId, rank);
                }
            }
        }
        return result;
    }

    private Map<Long, List<ManagerRank>> loadAllManagerRanks(List<Long> managerIds) {
        if (managerIds.isEmpty()) {
            return Map.of();
        }
        
        List<ManagerRank> ranks = managerRankRepository.findByManagerIdIn(managerIds);
        
        Map<Long, List<ManagerRank>> allRanks = new HashMap<>();
        for (ManagerRank rank : ranks) {
            Long managerId = rank.getManager().getId();
            allRanks.computeIfAbsent(managerId, k -> new ArrayList<>()).add(rank);
        }
        
        for (List<ManagerRank> managerRanks : allRanks.values()) {
            managerRanks.sort((a, b) -> a.getRound().getNumber().compareTo(b.getRound().getNumber()));
        }
        
        return allRanks;
    }

    private ManagerDto convertToDto(Manager manager, 
                                     Map<Long, PlayerRank> latestPlayerRanks, 
                                     Map<Long, ManagerRank> latestManagerRanks,
                                     Map<Long, List<ManagerRank>> allManagerRanks,
                                     Map<Long, Integer> playerPositionMap,
                                     Map<Long, Integer> playerPointsLastRoundMap,
                                     Map<Long, Integer> playerPositionChangeMap) {
        Hibernate.initialize(manager.getUser());
        Hibernate.initialize(manager.getSeason());
        
        ManagerDto dto = new ManagerDto();
        dto.setId(manager.getId());
        dto.setName(manager.getName());
        dto.setShortName(manager.getShortName());
        
        if (manager.getUser() != null) {
            dto.setFirstName(manager.getUser().getFirstName());
            dto.setLastName(manager.getUser().getLastName());
            dto.setEmail(manager.getUser().getEmail());
            dto.setLogin(manager.getUser().getLogin());
        }

        dto.setPaymentState(manager.getPaymentState().name());
        dto.setDescription(manager.getDescription());
        
        if (manager.getSeason() != null) {
            dto.setSeasonId(manager.getSeason().getId());
            dto.setSeasonName(manager.getSeason().getName());
        }
        
        if (manager.getPlayerGoalkeeper() != null) {
            dto.setPlayerGoalkeeper(convertPlayer(manager.getPlayerGoalkeeper(), latestPlayerRanks, 
                                                   playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerDefender1() != null) {
            dto.setPlayerDefender1(convertPlayer(manager.getPlayerDefender1(), latestPlayerRanks,
                                                  playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerDefender2() != null) {
            dto.setPlayerDefender2(convertPlayer(manager.getPlayerDefender2(), latestPlayerRanks,
                                                  playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerDefender3() != null) {
            dto.setPlayerDefender3(convertPlayer(manager.getPlayerDefender3(), latestPlayerRanks,
                                                  playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerMidfield1() != null) {
            dto.setPlayerMidfield1(convertPlayer(manager.getPlayerMidfield1(), latestPlayerRanks,
                                                  playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerMidfield2() != null) {
            dto.setPlayerMidfield2(convertPlayer(manager.getPlayerMidfield2(), latestPlayerRanks,
                                                  playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerMidfield3() != null) {
            dto.setPlayerMidfield3(convertPlayer(manager.getPlayerMidfield3(), latestPlayerRanks,
                                                  playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerStriker1() != null) {
            dto.setPlayerStriker1(convertPlayer(manager.getPlayerStriker1(), latestPlayerRanks,
                                                 playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerStriker2() != null) {
            dto.setPlayerStriker2(convertPlayer(manager.getPlayerStriker2(), latestPlayerRanks,
                                                 playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerStriker3() != null) {
            dto.setPlayerStriker3(convertPlayer(manager.getPlayerStriker3(), latestPlayerRanks,
                                                 playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerFreeChoice() != null) {
            dto.setPlayerFreeChoice(convertPlayer(manager.getPlayerFreeChoice(), latestPlayerRanks,
                                                   playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        
        if (manager.getPlayerExchangedOld1() != null) {
            dto.setPlayerExchangedOld1(convertPlayer(manager.getPlayerExchangedOld1(), latestPlayerRanks,
                                                      playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerExchangedOld2() != null) {
            dto.setPlayerExchangedOld2(convertPlayer(manager.getPlayerExchangedOld2(), latestPlayerRanks,
                                                      playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerExchangedOld3() != null) {
            dto.setPlayerExchangedOld3(convertPlayer(manager.getPlayerExchangedOld3(), latestPlayerRanks,
                                                      playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerExchangedNew1() != null) {
            dto.setPlayerExchangedNew1(convertPlayer(manager.getPlayerExchangedNew1(), latestPlayerRanks,
                                                      playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerExchangedNew2() != null) {
            dto.setPlayerExchangedNew2(convertPlayer(manager.getPlayerExchangedNew2(), latestPlayerRanks,
                                                      playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
        }
        if (manager.getPlayerExchangedNew3() != null) {
            dto.setPlayerExchangedNew3(convertPlayer(manager.getPlayerExchangedNew3(), latestPlayerRanks,
                                                      playerPositionMap, playerPointsLastRoundMap, playerPositionChangeMap));
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
        
        Season season = manager.getSeason();
        if (season != null && season.getCurrentMatchday() != null) {
            Integer currentMatchday = season.getCurrentMatchday();
            List<ManagerRank> managerRanks = allManagerRanks.get(manager.getId());
            if (managerRanks != null) {
                ManagerRank currentRank = managerRanks.stream()
                    .filter(r -> r.getRound().getNumber().equals(currentMatchday))
                    .findFirst()
                    .orElse(null);
                ManagerRank previousRank = managerRanks.stream()
                    .filter(r -> r.getRound().getNumber().equals(currentMatchday - 1))
                    .findFirst()
                    .orElse(null);
                
                if (currentRank != null && previousRank != null 
                    && currentRank.getPositionTotal() != null 
                    && previousRank.getPositionTotal() != null) {
                    dto.setPositionChange(previousRank.getPositionTotal() - currentRank.getPositionTotal());
                }
            }
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

    private PlayerDto convertPlayer(Player player, 
                                      Map<Long, PlayerRank> latestPlayerRanks,
                                      Map<Long, Integer> playerPositionMap,
                                      Map<Long, Integer> playerPointsLastRoundMap,
                                      Map<Long, Integer> playerPositionChangeMap) {
        if (player == null) return null;
        
        Hibernate.initialize(player.getTeams());
        
        PlayerDto dto = PlayerDto.fromEntity(player);
        
        PlayerRank rank = latestPlayerRanks.get(player.getId());
        if (rank != null) {
            dto.setPoints(rank.getPointsTotal());
        } else {
            dto.setPoints(0);
        }
        
        dto.setPositionTotal(playerPositionMap.get(player.getId()));
        dto.setPointsLastRound(playerPointsLastRoundMap.getOrDefault(player.getId(), 0));
        dto.setPositionChange(playerPositionChangeMap.get(player.getId()));
        
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

    @Transactional(readOnly = true)
    public ManagerDto findByUserId(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return null;
        
        Manager manager = managerRepository.findByUserId(userId);
        if (manager == null) return null;
        
        return findById(manager.getId());
    }

    @Transactional(readOnly = true)
    public PositionStatsDto getPositionStatsForManager(Long managerId) {
        Manager manager = managerRepository.findById(managerId).orElse(null);
        if (manager == null) return null;
        
        List<ManagerRank> ranks = managerRankRepository.findByManagerIdOrderByRoundIdAsc(managerId);
        if (ranks.isEmpty()) return null;
        
        ManagerRank latestRank = ranks.get(ranks.size() - 1);
        
        PositionStatsDto stats = new PositionStatsDto();
        stats.setGoalkeeper(getPointsForPosition(manager, Position.GOALKEEPER, latestRank));
        stats.setDefender(getPointsForPosition(manager, Position.DEFENDER, latestRank));
        stats.setMidfield(getPointsForPosition(manager, Position.MIDFIELD, latestRank));
        stats.setStriker(getPointsForPosition(manager, Position.STRIKER, latestRank));
        
        return stats;
    }

    @Transactional(readOnly = true)
    public PositionStatsDto getLeagueAveragePositionStats(Long seasonId) {
        List<Manager> managers = managerRepository.findBySeasonIdWithPlayers(seasonId);
        if (managers.isEmpty()) return null;
        
        int totalGk = 0, totalDef = 0, totalMid = 0, totalSt = 0;
        int count = 0;
        
        for (Manager manager : managers) {
            List<ManagerRank> ranks = managerRankRepository.findByManagerIdOrderByRoundIdAsc(manager.getId());
            if (!ranks.isEmpty()) {
                ManagerRank latestRank = ranks.get(ranks.size() - 1);
                totalGk += getPointsForPosition(manager, Position.GOALKEEPER, latestRank);
                totalDef += getPointsForPosition(manager, Position.DEFENDER, latestRank);
                totalMid += getPointsForPosition(manager, Position.MIDFIELD, latestRank);
                totalSt += getPointsForPosition(manager, Position.STRIKER, latestRank);
                count++;
            }
        }
        
        if (count == 0) return null;
        
        PositionStatsDto stats = new PositionStatsDto();
        stats.setGoalkeeper(totalGk / count);
        stats.setDefender(totalDef / count);
        stats.setMidfield(totalMid / count);
        stats.setStriker(totalSt / count);
        
        return stats;
    }

    private int getPointsForPosition(Manager manager, Position position, ManagerRank rank) {
        Season season = manager.getSeason();
        boolean isRueckrunde = season != null && season.getSeasonState() == SeasonState.RUNNING_RUECKRUNDE;
        
        int points = 0;
        
        if (position == Position.GOALKEEPER && manager.getPlayerGoalkeeper() != null) {
            points = getPlayerPoints(manager.getPlayerGoalkeeper().getId(), rank);
        } else if (position == Position.DEFENDER) {
            points += getPlayerPointsSafe(manager.getPlayerDefender1(), rank, isRueckrunde);
            points += getPlayerPointsSafe(manager.getPlayerDefender2(), rank, isRueckrunde);
            points += getPlayerPointsSafe(manager.getPlayerDefender3(), rank, isRueckrunde);
        } else if (position == Position.MIDFIELD) {
            points += getPlayerPointsSafe(manager.getPlayerMidfield1(), rank, isRueckrunde);
            points += getPlayerPointsSafe(manager.getPlayerMidfield2(), rank, isRueckrunde);
            points += getPlayerPointsSafe(manager.getPlayerMidfield3(), rank, isRueckrunde);
        } else if (position == Position.STRIKER) {
            points += getPlayerPointsSafe(manager.getPlayerStriker1(), rank, isRueckrunde);
            points += getPlayerPointsSafe(manager.getPlayerStriker2(), rank, isRueckrunde);
            points += getPlayerPointsSafe(manager.getPlayerStriker3(), rank, isRueckrunde);
            points += getPlayerPointsSafe(manager.getPlayerFreeChoice(), rank, isRueckrunde);
        }
        
        return points;
    }

    private int getPlayerPointsSafe(Player player, ManagerRank rank, boolean isRueckrunde) {
        if (player == null) return 0;
        return getPlayerPoints(player.getId(), rank);
    }

    private int getPlayerPoints(Long playerId, ManagerRank rank) {
        if (playerId == null || rank == null) return 0;
        return playerRankRepository.findByPlayerIdAndRoundId(playerId, rank.getRound().getId())
            .map(PlayerRank::getPointsTotal)
            .orElse(0);
    }

    @Transactional(readOnly = true)
    public List<ManagerRoundStatsDto> getRoundStatsForTopManagers(Long seasonId, int limit) {
        List<Manager> managers = managerRepository.findBySeasonIdWithPlayers(seasonId);
        
        List<ManagerDto> managerDtos = managers.stream()
            .map(m -> {
                List<ManagerRank> ranks = managerRankRepository.findByManagerIdOrderByRoundIdAsc(m.getId());
                ManagerDto dto = new ManagerDto();
                dto.setId(m.getId());
                dto.setName(m.getName());
                dto.setShortName(m.getShortName());
                if (!ranks.isEmpty()) {
                    ManagerRank latest = ranks.get(ranks.size() - 1);
                    dto.setPointsTotal(latest.getPointsTotal());
                    dto.setPositionTotal(latest.getPositionTotal());
                }
                return dto;
            })
            .sorted(Comparator.comparing(ManagerDto::getPointsTotal, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(limit)
            .collect(Collectors.toList());
        
        Long currentUserId = getCurrentUserId();
        boolean currentUserIncluded = managerDtos.stream().anyMatch(d -> d.getId().equals(currentUserId));
        
        if (!currentUserIncluded && currentUserId != null) {
            Manager currentUserManager = managerRepository.findByUserId(currentUserId);
            if (currentUserManager != null) {
                ManagerDto userDto = findById(currentUserManager.getId());
                if (userDto != null) {
                    managerDtos.add(userDto);
                }
            }
        }
        
        return managerDtos.stream()
            .map(this::convertToRoundStatsDto)
            .collect(Collectors.toList());
    }

    private ManagerRoundStatsDto convertToRoundStatsDto(ManagerDto dto) {
        ManagerRoundStatsDto stats = new ManagerRoundStatsDto();
        stats.setManagerId(dto.getId());
        stats.setManagerName(dto.getName());
        stats.setShortName(dto.getShortName());
        
        List<ManagerRank> ranks = managerRankRepository.findByManagerIdOrderByRoundIdAsc(dto.getId());
        
        List<ManagerRoundStatsDto.RoundPointDto> roundData = new ArrayList<>();
        int cumulative = 0;
        for (ManagerRank rank : ranks) {
            cumulative += rank.getPointsRound();
            ManagerRoundStatsDto.RoundPointDto rp = new ManagerRoundStatsDto.RoundPointDto();
            rp.setRound(rank.getRound().getNumber());
            rp.setPointsCumulative(cumulative);
            roundData.add(rp);
        }
        stats.setRoundData(roundData);
        
        return stats;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        String login = auth.getName();
        return userRepository.findByLogin(login)
            .map(User::getId)
            .orElse(null);
    }
}
