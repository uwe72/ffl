package de.ffl.service;

import de.ffl.domain.Game;
import de.ffl.domain.Points;
import de.ffl.domain.Rule;
import de.ffl.domain.Player;
import de.ffl.dto.GameDto;
import de.ffl.dto.PlayerPointsDto;
import de.ffl.dto.FormationValidationResult;
import de.ffl.repository.GameRepository;
import de.ffl.repository.PointsRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class GameService {

    private final GameRepository gameRepository;
    private final PointsRepository pointsRepository;
    private final FormationConverterService formationConverterService;

    public GameService(GameRepository gameRepository, PointsRepository pointsRepository, FormationConverterService formationConverterService) {
        this.gameRepository = gameRepository;
        this.pointsRepository = pointsRepository;
        this.formationConverterService = formationConverterService;
    }

    public List<GameDto> findAll() {
        return gameRepository.findAll().stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    public List<GameDto> findBySeasonId(Long seasonId) {
        return gameRepository.findAll().stream()
            .filter(g -> g.getRound() != null && g.getRound().getSeason() != null && g.getRound().getSeason().getId().equals(seasonId))
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    public List<GameDto> findByRoundId(Long roundId) {
        return gameRepository.findByRoundId(roundId).stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    public GameDto findById(Long id) {
        return gameRepository.findById(id)
            .map(this::convertToDtoWithPlayers)
            .orElse(null);
    }

    public GameDto save(Game game) {
        Game saved = gameRepository.save(game);
        return convertToDto(saved);
    }

    public GameDto updateFormation(Long id, String formation) {
        Game game = gameRepository.findById(id).orElse(null);
        if (game == null) {
            return null;
        }
        game.setFormation(formation == null || formation.isEmpty() ? null : formation);
        game = gameRepository.save(game);
        return convertToDto(game);
    }

    public GameDto importFormation(Long id, String formationExtern) {
        Game game = gameRepository.findById(id).orElse(null);
        if (game == null) {
            return null;
        }
        
        String formationIntern = formationConverterService.convertToIntern(formationExtern);
        FormationConverterService.ValidationResult validation = formationConverterService.validateFormation(formationIntern);
        
        if (!validation.isValid()) {
            throw new IllegalArgumentException(String.join("; ", validation.getErrors()));
        }
        
        game.setFormationExtern(formationExtern);
        game.setFormationIntern(formationIntern);
        game.setFormation(formationIntern);
        game = gameRepository.save(game);
        
        return convertToDto(game);
    }
    
    public FormationConverterService.ValidationResult validateFormationExtern(String formationExtern) {
        String formationIntern = formationConverterService.convertToIntern(formationExtern);
        return formationConverterService.validateFormation(formationIntern);
    }

    public FormationValidationResult validateFormationForGameDto(Long gameId, String formationExtern) {
        return formationConverterService.validateFormationWithPlayersDto(gameId, formationExtern);
    }

    public FormationConverterService.ValidationResult validateFormationForGame(Long gameId, String formationExtern) {
        return formationConverterService.validateFormationWithPlayers(gameId, formationExtern);
    }

    public void delete(Long id) {
        gameRepository.deleteById(id);
    }

    public Integer findLatestCompletedRound() {
        List<Game> allGames = gameRepository.findAll();
        
        Map<Integer, List<Game>> gamesByRound = allGames.stream()
            .filter(g -> g.getRound() != null && g.getRound().getNumber() != null)
            .collect(Collectors.groupingBy(g -> g.getRound().getNumber()));
        
        return gamesByRound.entrySet().stream()
            .filter(entry -> {
                List<Game> roundGames = entry.getValue();
                long completedGames = roundGames.stream()
                    .filter(g -> g.getGoalHost() != null && g.getGoalVisitor() != null)
                    .count();
                return completedGames == roundGames.size() && completedGames == 9;
            })
            .map(Map.Entry::getKey)
            .max(Integer::compareTo)
            .orElse(null);
    }

    private GameDto convertToDto(Game game) {
        GameDto dto = GameDto.fromEntity(game);
        if (game.getRound() != null && game.getRound().getSeason() != null) {
            dto.setSeasonId(game.getRound().getSeason().getId());
        }
        return dto;
    }

    private GameDto convertToDtoWithPlayers(Game game) {
        GameDto dto = GameDto.fromEntity(game);
        
        if (game.getRound() != null && game.getRound().getSeason() != null) {
            dto.setSeasonId(game.getRound().getSeason().getId());
            
            List<Points> gamePoints = pointsRepository.findByGameId(game.getId());
            
            Map<Long, List<Points>> pointsByPlayer = gamePoints.stream()
                .filter(p -> p.getPlayer() != null)
                .collect(Collectors.groupingBy(p -> p.getPlayer().getId()));
            
            dto.setPlayersHost(buildPlayerPointsList(new ArrayList<>(game.getPlayersHost()), pointsByPlayer));
            dto.setPlayersVisitor(buildPlayerPointsList(new ArrayList<>(game.getPlayersVisitor()), pointsByPlayer));
        }
        
        return dto;
    }

    private List<PlayerPointsDto> buildPlayerPointsList(List<Player> players, Map<Long, List<Points>> pointsByPlayer) {
        if (players == null || players.isEmpty()) {
            return new ArrayList<>();
        }
        
        return players.stream()
            .map(player -> {
                PlayerPointsDto dto = PlayerPointsDto.builder()
                    .playerId(player.getId())
                    .playerName(player.getNameKicker())
                    .nameKickerAlt1(player.getNameKickerAlt1())
                    .nameKickerAlt2(player.getNameKickerAlt2())
                    .nameKickerAlt3(player.getNameKickerAlt3())
                    .position(player.getPosition() != null ? player.getPosition().name() : null)
                    .totalPoints(0)
                    .rules(new ArrayList<>())
                    .build();
                
                List<Points> playerPoints = pointsByPlayer.getOrDefault(player.getId(), Collections.emptyList());
                
                if (!playerPoints.isEmpty()) {
                    Map<Rule, Integer> ruleCounts = new HashMap<>();
                    int totalPoints = 0;
                    
                    for (Points point : playerPoints) {
                        Rule rule = point.getRule();
                        int pointsValue = point.getNumber() != null ? point.getNumber() : rule.getPoints();
                        ruleCounts.merge(rule, 1, Integer::sum);
                        totalPoints += pointsValue;
                    }
                    
                    dto.setTotalPoints(totalPoints);
                    
                    List<PlayerPointsDto.RulePointDto> rules = ruleCounts.entrySet().stream()
                        .map(ruleEntry -> PlayerPointsDto.RulePointDto.builder()
                            .rule(ruleEntry.getKey().name())
                            .ruleLabel(getRuleLabel(ruleEntry.getKey()))
                            .count(ruleEntry.getValue())
                            .points(ruleEntry.getKey().getPoints() * ruleEntry.getValue())
                            .build())
                        .sorted(Comparator.comparing(PlayerPointsDto.RulePointDto::getRule))
                        .collect(Collectors.toList());
                    
                    dto.setRules(rules);
                }
                
                return dto;
            })
            .sorted(Comparator.comparing(PlayerPointsDto::getPlayerName))
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
}