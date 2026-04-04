package de.ffl.service;

import de.ffl.domain.Game;
import de.ffl.domain.Player;
import de.ffl.domain.Team;
import de.ffl.dto.FormationValidationResult;
import de.ffl.dto.MissingPlayerInfo;
import de.ffl.repository.GameRepository;
import de.ffl.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class FormationConverterService {

    private static final String FFL_LINE_BREAK = "_LB_";
    
    private final GameRepository gameRepository;
    private final PlayerRepository playerRepository;

    public FormationConverterService(GameRepository gameRepository, PlayerRepository playerRepository) {
        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
    }

    public String convertToIntern(String extern) {
        if (extern == null || extern.trim().isEmpty()) {
            return null;
        }
        
        String normalized = extern
            .replace("\r\n", "\n")
            .replace("\r", "\n")
            .replaceAll("\\n+", "_LB_")
            .replaceAll("_LB__LB_+", "_LB_");
        
        if (normalized.startsWith("_LB_")) {
            normalized = normalized.substring(5);
        }
        if (normalized.endsWith("_LB_")) {
            normalized = normalized.substring(0, normalized.length() - 5);
        }
        
        return normalized;
    }

    public ValidationResult validateFormation(String formationIntern) {
        ValidationResult result = new ValidationResult();
        
        if (formationIntern == null || formationIntern.isEmpty()) {
            result.addError("Kein Formation-String vorhanden");
            return result;
        }
        
        String aufstellung = extractAufstellung(formationIntern);
        if (aufstellung.isEmpty()) {
            result.addError("Keine Aufstellung gefunden");
            return result;
        }
        
        String[] lines = aufstellung.split(FFL_LINE_BREAK);
        List<String> playerList = new ArrayList<>();
        
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                String cleaned = replaceKickerNote(trimmed);
                if (!cleaned.isEmpty()) {
                    playerList.add(cleaned);
                }
            }
        }
        
        if (playerList.size() != 22) {
            result.addError("Es wurden " + playerList.size() + " statt 22 Spieler in der Aufstellung gefunden");
            return result;
        }
        
        List<String> hostPlayers = new ArrayList<>(playerList.subList(0, 11));
        List<String> visitorPlayers = new ArrayList<>(playerList.subList(11, 22));
        
        List<String> hostExchangePlayers = findExchangePlayers(formationIntern, hostPlayers);
        List<String> visitorExchangePlayers = findExchangePlayers(formationIntern, visitorPlayers);
        
        if (hostExchangePlayers.size() > 5) {
            result.addError("Heim-Mannschaft hat " + hostExchangePlayers.size() + " statt max. 5 Auswechselspieler");
        }
        
        if (visitorExchangePlayers.size() > 5) {
            result.addError("Gast-Mannschaft hat " + visitorExchangePlayers.size() + " statt max. 5 Auswechselspieler");
        }
        
        result.setHostPlayerCount(hostPlayers.size() + hostExchangePlayers.size());
        result.setVisitorPlayerCount(visitorPlayers.size() + visitorExchangePlayers.size());
        
        return result;
    }

    public ValidationResult validateFormationWithPlayers(Long gameId, String formationExtern) {
        ValidationResult result = new ValidationResult();
        
        Game game = gameRepository.findById(gameId).orElse(null);
        if (game == null) {
            result.addError("Spiel nicht gefunden");
            return result;
        }
        
        String formationIntern = convertToIntern(formationExtern);
        
        ValidationResult basicValidation = validateFormation(formationIntern);
        if (!basicValidation.isValid()) {
            return basicValidation;
        }
        
        String aufstellung = extractAufstellung(formationIntern);
        String[] lines = aufstellung.split(FFL_LINE_BREAK);
        List<String> playerList = new ArrayList<>();
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                String cleaned = replaceKickerNote(trimmed);
                if (!cleaned.isEmpty()) {
                    playerList.add(cleaned);
                }
            }
        }
        
        List<String> hostPlayerNames = new ArrayList<>(playerList.subList(0, 11));
        List<String> visitorPlayerNames = new ArrayList<>(playerList.subList(11, 22));
        
        List<String> hostExchangeNames = findExchangePlayers(formationIntern, hostPlayerNames);
        List<String> visitorExchangeNames = findExchangePlayers(formationIntern, visitorPlayerNames);
        
        hostPlayerNames.addAll(hostExchangeNames);
        visitorPlayerNames.addAll(visitorExchangeNames);
        
        List<Player> hostTeamPlayers = playerRepository.findByTeamId(game.getHost().getId());
        List<Player> visitorTeamPlayers = playerRepository.findByTeamId(game.getVisitor().getId());
        
        for (String playerName : hostPlayerNames) {
            Player found = findPlayerByName(hostTeamPlayers, playerName);
            if (found == null) {
                result.addMissingPlayer(playerName, game.getHost().getName(), game.getHost().getId(), true);
            }
        }
        
        for (String playerName : visitorPlayerNames) {
            Player found = findPlayerByName(visitorTeamPlayers, playerName);
            if (found == null) {
                result.addMissingPlayer(playerName, game.getVisitor().getName(), game.getVisitor().getId(), false);
            }
        }
        
        List<String> allGoalScorers = extractAllGoalScorers(formationIntern);
        for (String scorer : allGoalScorers) {
            if (!hostPlayerNames.contains(scorer) && !visitorPlayerNames.contains(scorer)) {
                Player inHost = findPlayerByName(hostTeamPlayers, scorer);
                Player inVisitor = findPlayerByName(visitorTeamPlayers, scorer);
                if (inHost == null && inVisitor == null) {
                    result.addMissingPlayer(scorer, "Unbekannt (Torschütze)", null, false);
                }
            }
        }
        
        result.setHostPlayerCount(hostPlayerNames.size());
        result.setVisitorPlayerCount(visitorPlayerNames.size());
        
        return result;
    }
    
    private List<String> extractAllGoalScorers(String formation) {
        List<String> scorers = new ArrayList<>();
        
        int toreStart = formation.indexOf("Tore");
        if (toreStart < 0) return scorers;
        
        String toreSection = formation.substring(toreStart + 4);
        int endMarker = toreSection.indexOf("Aufstellung");
        if (endMarker < 0) endMarker = toreSection.indexOf("Besondere Vorkommnisse");
        if (endMarker > 0) toreSection = toreSection.substring(0, endMarker);
        
        String[] lines = toreSection.split(FFL_LINE_BREAK);
        
        for (String line : lines) {
            if (line == null || line.trim().isEmpty()) continue;
            String trimmed = line.trim();
            
            if (Character.isDigit(trimmed.charAt(0))) continue;
            if (trimmed.startsWith("Rechtsschuss") || trimmed.startsWith("Linksschuss") || 
                trimmed.startsWith("Kopfball") || trimmed.startsWith("Brust")) continue;
            if (trimmed.contains("(Eigentor)")) continue;
            if (trimmed.equals(":")) continue;
            
            String playerName = trimmed.replace("(Elfmeter)", "").trim();
            if (!playerName.isEmpty() && !scorers.contains(playerName)) {
                scorers.add(playerName);
            }
        }
        
        return scorers;
    }
    
    private Player findPlayerByName(List<Player> players, String name) {
        for (Player player : players) {
            if (name.equals(player.getNameKicker()) ||name.equals(player.getNameKickerAlt1()) ||
                name.equals(player.getNameKickerAlt2()) || name.equals(player.getNameKickerAlt3())) {
                return player;
            }
        }
        return null;
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

        List<String> allPlayers = new ArrayList<>();
        for (String line : lines) {
            if (line == null || line.trim().isEmpty()) continue;
            if (Character.isDigit(line.charAt(0))) continue;
            String cleaned = replaceKickerNote(line);
            if (!cleaned.isEmpty()) {
                allPlayers.add(cleaned);
            }
        }

        java.util.Map<String, String> auswechselMap = new java.util.HashMap<>();
        for (int i = 0; i < allPlayers.size() - 1; i += 2) {
            String eingewechselt = allPlayers.get(i);
            String ausgewechselt = allPlayers.get(i + 1);
            auswechselMap.put(eingewechselt, ausgewechselt);
        }

        for (String eingewechselt : auswechselMap.keySet()) {
            String ausgewechselt = auswechselMap.get(eingewechselt);
            if (startingPlayers.contains(ausgewechselt)) {
                result.add(eingewechselt);
            }
        }

        return result;
    }

    private String replaceKickerNote(String input) {
        String result = input;
        result = result.replace('(', ' ');
        result = result.replace(')', ' ');
        result = result.replaceAll("1,0", " ");
        result = result.replaceAll("1,5", " ");
        result = result.replaceAll("2,0", " ");
        result = result.replaceAll("2,5", " ");
        result = result.replaceAll("3,0", " ");
        result = result.replaceAll("3,5", " ");
        result = result.replaceAll("4,0", " ");
        result = result.replaceAll("4,5", " ");
        result = result.replaceAll("5,0", " ");
        result = result.replaceAll("5,5", " ");
        result = result.replaceAll("6,0", " ");
        result = result.replaceAll("1", " ");
        result = result.replaceAll("2", " ");
        result = result.replaceAll("3", " ");
        result = result.replaceAll("4", " ");
        result = result.replaceAll("5", " ");
        result = result.replaceAll("6", " ");
        result = result.replaceAll(",", " ");
        result = result.replaceAll("\\s+", " ");
        return result.trim();
    }

    public static class ValidationResult {
        private final List<String> errors = new ArrayList<>();
        private final List<MissingPlayer> missingPlayers = new ArrayList<>();
        private int hostPlayerCount;
        private int visitorPlayerCount;

        public void addError(String error) {
            errors.add(error);
        }

        public void addMissingPlayer(String playerName, String teamName, Long teamId, boolean isHost) {
            missingPlayers.add(new MissingPlayer(playerName, teamName, teamId, isHost));
        }

        public boolean isValid() {
            return errors.isEmpty() && missingPlayers.isEmpty();
        }

        public List<String> getErrors() {
            return errors;
        }

        public List<MissingPlayer> getMissingPlayers() {
            return missingPlayers;
        }

        public int getHostPlayerCount() {
            return hostPlayerCount;
        }

        public void setHostPlayerCount(int hostPlayerCount) {
            this.hostPlayerCount = hostPlayerCount;
        }

        public int getVisitorPlayerCount() {
            return visitorPlayerCount;
        }

        public void setVisitorPlayerCount(int visitorPlayerCount) {
            this.visitorPlayerCount = visitorPlayerCount;
        }
    }

    public static class MissingPlayer {
        private final String playerName;
        private final String teamName;
        private final Long teamId;
        private final boolean host;

        public MissingPlayer(String playerName, String teamName, Long teamId, boolean host) {
            this.playerName = playerName;
            this.teamName = teamName;
            this.teamId = teamId;
            this.host = host;
        }

        public String getPlayerName() {
            return playerName;
        }

        public String getTeamName() {
            return teamName;
        }

        public Long getTeamId() {
            return teamId;
        }

        public boolean isHost() {
            return host;
        }
    }

    public FormationValidationResult validateFormationWithPlayersDto(Long gameId, String formationExtern) {
        String formationIntern = convertToIntern(formationExtern);
        FormationValidationResult result = FormationValidationResult.builder().build();
        
        Game game = gameRepository.findById(gameId).orElse(null);
        if (game == null) {
            result.getErrors().add("Spiel nicht gefunden");
            result.setValid(false);
            return result;
        }

        ValidationResult basicValidation = validateFormation(formationIntern);
        if (!basicValidation.isValid()) {
            result.setValid(false);
            result.setErrors(basicValidation.getErrors());
            return result;
        }

        String aufstellung = extractAufstellung(formationIntern);
        String[] lines = aufstellung.split(FFL_LINE_BREAK);
        List<String> playerList = new ArrayList<>();
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                String cleaned = replaceKickerNote(trimmed);
                if (!cleaned.isEmpty()) {
                    playerList.add(cleaned);
                }
            }
        }

        if (playerList.size() != 22) {
            result.getErrors().add("Es wurden " + playerList.size() + " statt 22 Spieler in der Aufstellung gefunden");
            result.setValid(false);
            return result;
        }

        List<String> hostPlayerNames = new ArrayList<>(playerList.subList(0, 11));
        List<String> visitorPlayerNames = new ArrayList<>(playerList.subList(11, 22));

        List<String> hostExchangeNames = findExchangePlayers(formationIntern, hostPlayerNames);
        List<String> visitorExchangeNames = findExchangePlayers(formationIntern, visitorPlayerNames);

        hostPlayerNames.addAll(hostExchangeNames);
        visitorPlayerNames.addAll(visitorExchangeNames);

        if (hostPlayerNames.size() > 16) {
            result.getErrors().add("Heim-Mannschaft hat " + hostPlayerNames.size() + " statt max. 16 Spieler");
        }
        if (visitorPlayerNames.size() > 16) {
            result.getErrors().add("Gast-Mannschaft hat " + visitorPlayerNames.size() + " statt max. 16 Spieler");
        }

        List<Player> hostTeamPlayers = playerRepository.findByTeamId(game.getHost().getId());
        List<Player> visitorTeamPlayers = playerRepository.findByTeamId(game.getVisitor().getId());

        for (String playerName : hostPlayerNames) {
            Player found = findPlayerByName(hostTeamPlayers, playerName);
            if (found == null) {
                result.getMissingPlayers().add(MissingPlayerInfo.builder()
                    .playerName(playerName)
                    .teamName(game.getHost().getName())
                    .teamId(game.getHost().getId())
                    .host(true)
                    .build());
            }
        }

        for (String playerName : visitorPlayerNames) {
            Player found = findPlayerByName(visitorTeamPlayers, playerName);
            if (found == null) {
                result.getMissingPlayers().add(MissingPlayerInfo.builder()
                    .playerName(playerName)
                    .teamName(game.getVisitor().getName())
                    .teamId(game.getVisitor().getId())
                    .host(false)
                    .build());
            }
        }

        List<String> allGoalScorers = extractAllGoalScorers(formationIntern);
        for (String scorer : allGoalScorers) {
            Player inHost = findPlayerByName(hostTeamPlayers, scorer);
            Player inVisitor = findPlayerByName(visitorTeamPlayers, scorer);
            if (inHost == null && inVisitor == null) {
                boolean alreadyMissing = result.getMissingPlayers().stream()
                    .anyMatch(mp -> mp.getPlayerName().equals(scorer));
                if (!alreadyMissing) {
                    result.getMissingPlayers().add(MissingPlayerInfo.builder()
                        .playerName(scorer)
                        .teamName("Unbekannt (Torschütze)")
                        .host(false)
                        .build());
                }
            }
        }

        result.setHostPlayerCount(hostPlayerNames.size());
        result.setVisitorPlayerCount(visitorPlayerNames.size());
        result.setValid(result.getErrors().isEmpty() && result.getMissingPlayers().isEmpty());
        
        return result;
    }
}
