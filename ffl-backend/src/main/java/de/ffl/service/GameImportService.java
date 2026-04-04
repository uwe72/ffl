package de.ffl.service;

import de.ffl.domain.*;
import de.ffl.dto.GameDto;
import de.ffl.dto.GameImportResult;
import de.ffl.dto.GameImportResult.MissingPlayer;
import de.ffl.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class GameImportService {

    private static final String FFL_LINE_BREAK = "_LB_";

    private final GameRepository gameRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final PointsRepository pointsRepository;
    private final PlayerRankRepository playerRankRepository;
    private final SeasonCalculationService seasonCalculationService;

    public GameImportService(
            GameRepository gameRepository,
            TeamRepository teamRepository,
            PlayerRepository playerRepository,
            PointsRepository pointsRepository,
            PlayerRankRepository playerRankRepository,
            SeasonCalculationService seasonCalculationService) {
        this.gameRepository = gameRepository;
        this.teamRepository = teamRepository;
        this.playerRepository = playerRepository;
        this.pointsRepository = pointsRepository;
        this.playerRankRepository = playerRankRepository;
        this.seasonCalculationService = seasonCalculationService;
    }

    @Transactional
    public GameImportResult validateAndImport(Long gameId) {
        Game game = gameRepository.findById(gameId)
            .orElse(null);
        
        if (game == null) {
            return GameImportResult.builder()
                .success(false)
                .errorMessage("Spiel nicht gefunden")
                .build();
        }

        if (game.getFormation() == null || game.getFormation().isEmpty()) {
            return GameImportResult.builder()
                .success(false)
                .errorMessage("Kein Formation-String vorhanden")
                .build();
        }

        Team host = game.getHost();
        Team visitor = game.getVisitor();
        
        if (host == null || visitor == null) {
            return GameImportResult.builder()
                .success(false)
                .errorMessage("Heim- oder Gastmannschaft nicht zugeordnet")
                .build();
        }

        List<Player> hostPlayers = playerRepository.findBySeasonIdWithTeams(game.getRound().getSeason().getId()).stream()
            .filter(p -> p.getTeams() != null && p.getTeams().stream().anyMatch(t -> t.getId().equals(host.getId())))
            .collect(Collectors.toList());

        List<Player> visitorPlayers = playerRepository.findBySeasonIdWithTeams(game.getRound().getSeason().getId()).stream()
            .filter(p -> p.getTeams() != null && p.getTeams().stream().anyMatch(t -> t.getId().equals(visitor.getId())))
            .collect(Collectors.toList());

        Set<String> hostPlayerNames = extractPlayerNames(game.getFormation(), true);
        Set<String> visitorPlayerNames = extractPlayerNames(game.getFormation(), false);

        if (hostPlayerNames.isEmpty()) {
            return GameImportResult.builder()
                .success(false)
                .errorMessage("Keine Heim-Spieler in der Formation gefunden")
                .build();
        }

        if (visitorPlayerNames.isEmpty()) {
            return GameImportResult.builder()
                .success(false)
                .errorMessage("Keine Gast-Spieler in der Formation gefunden")
                .build();
        }

        List<MissingPlayer> missingPlayers = new ArrayList<>();

        for (String playerName : hostPlayerNames) {
            if (findPlayerByName(hostPlayers, playerName) == null) {
                missingPlayers.add(MissingPlayer.builder()
                    .playerName(playerName)
                    .teamId(host.getId())
                    .teamName(host.getName())
                    .isHost(true)
                    .build());
            }
        }

        for (String playerName : visitorPlayerNames) {
            if (findPlayerByName(visitorPlayers, playerName) == null) {
                missingPlayers.add(MissingPlayer.builder()
                    .playerName(playerName)
                    .teamId(visitor.getId())
                    .teamName(visitor.getName())
                    .isHost(false)
                    .build());
            }
        }

        if (!missingPlayers.isEmpty()) {
            return GameImportResult.builder()
                .success(false)
                .errorMessage("Spieler nicht gefunden")
                .missingPlayers(missingPlayers)
                .build();
        }

        return processGameImport(game, hostPlayers, visitorPlayers);
    }

    @Transactional
    public GameImportResult processGameImport(Long gameId, Map<String, Long> playerMappings) {
        Game game = gameRepository.findById(gameId)
            .orElse(null);
        
        if (game == null) {
            return GameImportResult.builder()
                .success(false)
                .errorMessage("Spiel nicht gefunden")
                .build();
        }

        Team host = game.getHost();
        Team visitor = game.getVisitor();
        Season season = game.getRound().getSeason();

        for (Map.Entry<String, Long> mapping : playerMappings.entrySet()) {
            String altName = mapping.getKey();
            Long playerId = mapping.getValue();
            
            Player player = playerRepository.findById(playerId).orElse(null);
            if (player == null) continue;

            if (player.getNameKickerAlt1() == null || player.getNameKickerAlt1().isEmpty()) {
                player.setNameKickerAlt1(altName);
            } else if (player.getNameKickerAlt2() == null || player.getNameKickerAlt2().isEmpty()) {
                player.setNameKickerAlt2(altName);
            } else if (player.getNameKickerAlt3() == null || player.getNameKickerAlt3().isEmpty()) {
                player.setNameKickerAlt3(altName);
            }
            playerRepository.save(player);
        }

        return validateAndImport(gameId);
    }

    @Transactional
    public GameImportResult createNewPlayer(Long gameId, String playerName, Long teamId, String position) {
        Game game = gameRepository.findById(gameId).orElse(null);
        if (game == null) {
            return GameImportResult.builder()
                .success(false)
                .errorMessage("Spiel nicht gefunden")
                .build();
        }

        Season season = game.getRound().getSeason();
        Team team = teamRepository.findById(teamId).orElse(null);
        
        Position pos = Position.MIDFIELD;
        if (position != null) {
            try {
                pos = Position.valueOf(position.toUpperCase());
            } catch (IllegalArgumentException e) {
                pos = Position.MIDFIELD;
            }
        }

        Player newPlayer = Player.builder()
            .nameKicker(playerName)
            .nameKickerAlt1(playerName)
            .position(pos)
            .prize(99_000_000)
            .teams(team != null ? List.of(team) : new ArrayList<>())
            .season(season)
            .build();
        
        newPlayer = playerRepository.save(newPlayer);

        return GameImportResult.builder()
            .success(true)
            .game(GameDto.fromEntity(game))
            .build();
    }

    private GameImportResult processGameImport(Game game, List<Player> hostPlayers, List<Player> visitorPlayers) {
        pointsRepository.deleteByGameId(game.getId());

        Set<Player> playersHost = findPlayersFromFormation(game.getFormation(), hostPlayers, true);
        Set<Player> playersVisitor = findPlayersFromFormation(game.getFormation(), visitorPlayers, false);

        game.setPlayersHost(playersHost);
        game.setPlayersVisitor(playersVisitor);

        int goalsHost = seasonCalculationService.countGoals(playersHost, game.getFormation(), true);
        int goalsVisitor = seasonCalculationService.countGoals(playersVisitor, game.getFormation(), false);
        goalsHost += seasonCalculationService.countEigentorGoals(playersVisitor, game.getFormation());
        goalsVisitor += seasonCalculationService.countEigentorGoals(playersHost, game.getFormation());

        game.setGoalHost(goalsHost);
        game.setGoalVisitor(goalsVisitor);

        gameRepository.save(game);

        seasonCalculationService.createPointsForPlayers(game, playersHost, true);
        seasonCalculationService.createPointsForPlayers(game, playersVisitor, false);

        GameDto gameDto = GameDto.fromEntity(game);
        
        return GameImportResult.builder()
            .success(true)
            .game(gameDto)
            .build();
    }

    private Set<String> extractPlayerNames(String formation, boolean isHost) {
        Set<String> names = new HashSet<>();
        
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
        int endIdx = isHost ? Math.min(11, playerList.size()) : Math.min(22, playerList.size());
        
        if (startIdx >= playerList.size()) {
            return names;
        }
        
        for (int i = startIdx; i < endIdx && i < playerList.size(); i++) {
            names.add(playerList.get(i));
        }

        List<String> exchangePlayers = findExchangePlayers(formation, playerList.subList(startIdx, Math.min(endIdx, playerList.size())));
        names.addAll(exchangePlayers);

        return names;
    }

    private Set<Player> findPlayersFromFormation(String formation, List<Player> teamPlayers, boolean isHost) {
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
        int endIdx = isHost ? Math.min(11, playerList.size()) : Math.min(22, playerList.size());
        
        if (startIdx >= playerList.size()) {
            return result;
        }
        
        for (int i = startIdx; i < endIdx && i < playerList.size(); i++) {
            String name = playerList.get(i);
            Player foundPlayer = findPlayerByName(teamPlayers, name);
            if (foundPlayer != null) {
                result.add(foundPlayer);
            }
        }

        List<String> exchangePlayers = findExchangePlayers(formation, playerList.subList(startIdx, Math.min(endIdx, playerList.size())));
        for (String name : exchangePlayers) {
            Player foundPlayer = findPlayerByName(teamPlayers, name);
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
}
