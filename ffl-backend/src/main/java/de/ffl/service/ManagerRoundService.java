package de.ffl.service;

import de.ffl.domain.*;
import de.ffl.dto.RoundDetailDto;
import de.ffl.repository.*;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ManagerRoundService {

    private final ManagerRepository managerRepository;
    private final ManagerRankRepository managerRankRepository;
    private final GameRepository gameRepository;
    private final PointsRepository pointsRepository;

    public ManagerRoundService(ManagerRepository managerRepository, ManagerRankRepository managerRankRepository, GameRepository gameRepository, PointsRepository pointsRepository) {
        this.managerRepository = managerRepository;
        this.managerRankRepository = managerRankRepository;
        this.gameRepository = gameRepository;
        this.pointsRepository = pointsRepository;
    }

    public List<RoundDetailDto> getRoundDetailsForManager(Long managerId) {
        Manager manager = managerRepository.findById(managerId).orElse(null);
        if (manager == null) return List.of();

        List<ManagerRank> managerRanks = managerRankRepository.findByManagerIdOrderByRoundIdAsc(managerId);
        
        Set<Long> exchangedOldIds = getExchangedOldPlayerIds(manager);
        Set<Long> exchangedNewIds = getExchangedNewPlayerIds(manager);
        
        int transferRound = findTransferRound(manager, managerRanks);

        return managerRanks.stream().map(rank -> {
            RoundDetailDto dto = new RoundDetailDto();
            Hibernate.initialize(rank.getRound());
            dto.setRoundId(rank.getRound().getId());
            dto.setRoundNumber(rank.getRound().getNumber());
            dto.setPointsRound(rank.getPointsRound());
            dto.setPointsTotal(rank.getPointsTotal());
            dto.setPositionRound(rank.getPositionRound());
            dto.setPositionTotal(rank.getPositionTotal());

            List<Player> activePlayers = getActivePlayersForRound(manager, rank.getRound().getNumber(), transferRound, exchangedOldIds, exchangedNewIds);
            
            List<Game> games = gameRepository.findByRoundId(rank.getRound().getId());
            
            List<RoundDetailDto.PlayerPointDto> playerPoints = new ArrayList<>();
            for (Player player : activePlayers) {
                int totalPoints = 0;
                List<RoundDetailDto.RulePointDto> rulePoints = new ArrayList<>();
                
                for (Game game : games) {
                    List<Points> pointsList = pointsRepository.findByPlayerIdAndGameId(player.getId(), game.getId());
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

    private Set<Long> getExchangedOldPlayerIds(Manager manager) {
        Set<Long> ids = new HashSet<>();
        if (manager.getPlayerExchangedOld1() != null) ids.add(manager.getPlayerExchangedOld1().getId());
        if (manager.getPlayerExchangedOld2() != null) ids.add(manager.getPlayerExchangedOld2().getId());
        if (manager.getPlayerExchangedOld3() != null) ids.add(manager.getPlayerExchangedOld3().getId());
        return ids;
    }

    private Set<Long> getExchangedNewPlayerIds(Manager manager) {
        Set<Long> ids = new HashSet<>();
        if (manager.getPlayerExchangedNew1() != null) ids.add(manager.getPlayerExchangedNew1().getId());
        if (manager.getPlayerExchangedNew2() != null) ids.add(manager.getPlayerExchangedNew2().getId());
        if (manager.getPlayerExchangedNew3() != null) ids.add(manager.getPlayerExchangedNew3().getId());
        return ids;
    }

    private int findTransferRound(Manager manager, List<ManagerRank> ranks) {
        if (manager.getPlayerExchangedNew1() == null && manager.getPlayerExchangedNew2() == null && manager.getPlayerExchangedNew3() == null) {
            return Integer.MAX_VALUE;
        }
        
        return 18;
    }

    private List<Player> getActivePlayersForRound(Manager manager, int roundNumber, int transferRound, Set<Long> exchangedOldIds, Set<Long> exchangedNewIds) {
        List<Player> players = new ArrayList<>();
        
        if (roundNumber < transferRound) {
            if (manager.getPlayerGoalkeeper() != null && !exchangedOldIds.contains(manager.getPlayerGoalkeeper().getId())) 
                players.add(manager.getPlayerGoalkeeper());
            if (manager.getPlayerDefender1() != null && !exchangedOldIds.contains(manager.getPlayerDefender1().getId())) 
                players.add(manager.getPlayerDefender1());
            if (manager.getPlayerDefender2() != null && !exchangedOldIds.contains(manager.getPlayerDefender2().getId())) 
                players.add(manager.getPlayerDefender2());
            if (manager.getPlayerDefender3() != null && !exchangedOldIds.contains(manager.getPlayerDefender3().getId())) 
                players.add(manager.getPlayerDefender3());
            if (manager.getPlayerMidfield1() != null && !exchangedOldIds.contains(manager.getPlayerMidfield1().getId())) 
                players.add(manager.getPlayerMidfield1());
            if (manager.getPlayerMidfield2() != null && !exchangedOldIds.contains(manager.getPlayerMidfield2().getId())) 
                players.add(manager.getPlayerMidfield2());
            if (manager.getPlayerMidfield3() != null && !exchangedOldIds.contains(manager.getPlayerMidfield3().getId())) 
                players.add(manager.getPlayerMidfield3());
            if (manager.getPlayerStriker1() != null && !exchangedOldIds.contains(manager.getPlayerStriker1().getId())) 
                players.add(manager.getPlayerStriker1());
            if (manager.getPlayerStriker2() != null && !exchangedOldIds.contains(manager.getPlayerStriker2().getId())) 
                players.add(manager.getPlayerStriker2());
            if (manager.getPlayerStriker3() != null && !exchangedOldIds.contains(manager.getPlayerStriker3().getId())) 
                players.add(manager.getPlayerStriker3());
            if (manager.getPlayerFreeChoice() != null && !exchangedOldIds.contains(manager.getPlayerFreeChoice().getId())) 
                players.add(manager.getPlayerFreeChoice());
        } else {
            if (manager.getPlayerGoalkeeper() != null && !exchangedOldIds.contains(manager.getPlayerGoalkeeper().getId())) 
                players.add(manager.getPlayerGoalkeeper());
            if (manager.getPlayerDefender1() != null && !exchangedOldIds.contains(manager.getPlayerDefender1().getId())) 
                players.add(manager.getPlayerDefender1());
            if (manager.getPlayerDefender2() != null && !exchangedOldIds.contains(manager.getPlayerDefender2().getId())) 
                players.add(manager.getPlayerDefender2());
            if (manager.getPlayerDefender3() != null && !exchangedOldIds.contains(manager.getPlayerDefender3().getId())) 
                players.add(manager.getPlayerDefender3());
            if (manager.getPlayerMidfield1() != null && !exchangedOldIds.contains(manager.getPlayerMidfield1().getId())) 
                players.add(manager.getPlayerMidfield1());
            if (manager.getPlayerMidfield2() != null && !exchangedOldIds.contains(manager.getPlayerMidfield2().getId())) 
                players.add(manager.getPlayerMidfield2());
            if (manager.getPlayerMidfield3() != null && !exchangedOldIds.contains(manager.getPlayerMidfield3().getId())) 
                players.add(manager.getPlayerMidfield3());
            if (manager.getPlayerStriker1() != null && !exchangedOldIds.contains(manager.getPlayerStriker1().getId())) 
                players.add(manager.getPlayerStriker1());
            if (manager.getPlayerStriker2() != null && !exchangedOldIds.contains(manager.getPlayerStriker2().getId())) 
                players.add(manager.getPlayerStriker2());
            if (manager.getPlayerStriker3() != null && !exchangedOldIds.contains(manager.getPlayerStriker3().getId())) 
                players.add(manager.getPlayerStriker3());
            if (manager.getPlayerFreeChoice() != null && !exchangedOldIds.contains(manager.getPlayerFreeChoice().getId())) 
                players.add(manager.getPlayerFreeChoice());
            if (manager.getPlayerExchangedNew1() != null) players.add(manager.getPlayerExchangedNew1());
            if (manager.getPlayerExchangedNew2() != null) players.add(manager.getPlayerExchangedNew2());
            if (manager.getPlayerExchangedNew3() != null) players.add(manager.getPlayerExchangedNew3());
        }
        
        return players;
    }
}
