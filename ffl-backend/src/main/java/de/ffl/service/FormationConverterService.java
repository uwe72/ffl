package de.ffl.service;

import de.ffl.domain.Game;
import de.ffl.domain.Player;
import de.ffl.domain.Team;
import de.ffl.dto.FormationValidationResult;
import de.ffl.dto.MissingPlayerInfo;
import de.ffl.repository.GameRepository;
import de.ffl.repository.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class FormationConverterService {

    private static final Logger log = LoggerFactory.getLogger(FormationConverterService.class);
    private static final String FFL_LINE_BREAK = "_LB_";
    private static final int MAX_SUBSTITUTIONS = 5;
    
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
        
        log.info("=== CONVERT TO INTERN ===");
        log.info("Input Länge: {}", extern.length());
        int inputStart = Math.max(0, extern.length() - 50);
        log.info("Letzte 50 Zeichen Input: [{}]", extern.substring(inputStart));
        
        log.info("=== Letzte 20 Zeichen als Codes ===");
        String lastPart = extern.substring(Math.max(0, extern.length() - 20));
        for (int i = 0; i < lastPart.length(); i++) {
            char c = lastPart.charAt(i);
            log.info("  [{}]: '{}' (ASCII: {})", i, c, (int)c);
        }
        
        String normalized = extern
            .replace("\r\n", "\n")
            .replace("\r", "\n")
            .replaceAll("\\n+", "_LB_")
            .replaceAll("_LB__LB_+", "_LB_");
        
        log.info("=== Nach replaceAll ===");
        log.info("Normalized Länge: {}", normalized.length());
        int normStart = Math.max(0, normalized.length() - 50);
        log.info("Letzte 50 Zeichen normalized: [{}]", normalized.substring(normStart));
        
        if (normalized.startsWith("_LB_")) {
            log.info("=== Entferne _LB_ am Anfang ===");
            normalized = normalized.substring(4);
            log.info("Nach Entfernen Anfang, Länge: {}", normalized.length());
        }
        if (normalized.endsWith("_LB_")) {
            log.info("=== Entferne _LB_ am Ende ===");
            log.info("Vorher: Letzte 10 Zeichen: [{}]", normalized.substring(Math.max(0, normalized.length() - 10)));
            normalized = normalized.substring(0, normalized.length() - 4);
            log.info("Nachher: Letzte 10 Zeichen: [{}]", normalized.substring(Math.max(0, normalized.length() - 10)));
            log.info("Nach Entfernen Ende, Länge: {}", normalized.length());
        }
        
        log.info("Output Länge: {}", normalized.length());
        int outputStart = Math.max(0, normalized.length() - 50);
        log.info("Letzte 50 Zeichen Output: [{}]", normalized.substring(outputStart));
        
        return normalized;
    }

    public ValidationResult validateFormation(String formationIntern) {
        return validateFormation(formationIntern, null, null);
    }

    public ValidationResult validateFormation(String formationIntern, Set<String> hostRosterNames, Set<String> visitorRosterNames) {
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
            result.addError("Fehler beim Parsen der Aufstellung: Erwartet wurden 22 Spieler, aber " + playerList.size() + " Einträge gefunden. Hinweis: Prüfe ob 'Trainer' oder 'Wechsel' als Trenner vorhanden sind.");
            return result;
        }
        
        List<String> hostPlayers = new ArrayList<>(playerList.subList(0, 11));
        List<String> visitorPlayers = new ArrayList<>(playerList.subList(11, 22));
        
        ExchangeSubstitutions substitutions = findExchangePlayers(formationIntern, hostPlayers, visitorPlayers, hostRosterNames, visitorRosterNames);

        if (substitutions.getHostPlayers().size() > 5) {
            result.addError("Heim-Mannschaft hat " + substitutions.getHostPlayers().size() + " statt max. 5 Auswechselspieler");
        }

        if (substitutions.getVisitorPlayers().size() > 5) {
            result.addError("Gast-Mannschaft hat " + substitutions.getVisitorPlayers().size() + " statt max. 5 Auswechselspieler");
        }
        
        result.setHostPlayerCount(hostPlayers.size() + substitutions.getHostPlayers().size());
        result.setVisitorPlayerCount(visitorPlayers.size() + substitutions.getVisitorPlayers().size());
        
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

        List<Player> hostTeamPlayers = playerRepository.findByTeamId(game.getHost().getId());
        List<Player> visitorTeamPlayers = playerRepository.findByTeamId(game.getVisitor().getId());
        Set<String> hostRosterNames = toRosterNameSet(hostTeamPlayers);
        Set<String> visitorRosterNames = toRosterNameSet(visitorTeamPlayers);

        ValidationResult basicValidation = validateFormation(formationIntern, hostRosterNames, visitorRosterNames);
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

        ExchangeSubstitutions exchangeSubstitutions = findExchangePlayers(formationIntern, hostPlayerNames, visitorPlayerNames, hostRosterNames, visitorRosterNames);
        List<String> hostExchangeNames = exchangeSubstitutions.getHostPlayers();
        List<String> visitorExchangeNames = exchangeSubstitutions.getVisitorPlayers();

        hostPlayerNames.addAll(hostExchangeNames);
        visitorPlayerNames.addAll(visitorExchangeNames);

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
        int endMarkerAufstellung = toreSection.indexOf("Aufstellung");
        int endMarkerBesondere = toreSection.indexOf("Besondere Vorkommnisse");
        int endMarker = -1;
        
        if (endMarkerAufstellung >= 0 && endMarkerBesondere >= 0) {
            endMarker = Math.min(endMarkerAufstellung, endMarkerBesondere);
        } else if (endMarkerAufstellung >= 0) {
            endMarker = endMarkerAufstellung;
        } else {
            endMarker = endMarkerBesondere;
        }
        
        if (endMarker > 0) toreSection = toreSection.substring(0, endMarker);
        
        String[] lines = toreSection.split(FFL_LINE_BREAK);
        
        for (String line : lines) {
            if (line == null || line.trim().isEmpty()) continue;
            String trimmed = line.trim();
            
            if (!Character.isAlphabetic(trimmed.charAt(0))) continue;
            if (trimmed.equals("Fehlanzeige")) continue;
            if (trimmed.startsWith("Rechtsschuss") || trimmed.startsWith("Linksschuss") || 
                trimmed.startsWith("Kopfball") || trimmed.startsWith("Brust") ||
                trimmed.startsWith("linke Hand") || trimmed.startsWith("rechte Hand")) continue;
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

    public ExchangeSubstitutions findExchangePlayers(String formation, List<String> fallbackHostStarters, List<String> fallbackVisitorStarters) {
        return findExchangePlayers(formation, fallbackHostStarters, fallbackVisitorStarters, null, null);
    }

    public ExchangeSubstitutions findExchangePlayers(String formation, List<String> fallbackHostStarters, List<String> fallbackVisitorStarters,
                                                     Set<String> hostRosterNames, Set<String> visitorRosterNames) {
        List<List<String>> startingXIs = extractStartingXIs(formation);
        List<String> hostStarters = startingXIs != null ? startingXIs.get(0) : fallbackHostStarters;
        List<String> visitorStarters = startingXIs != null ? startingXIs.get(1) : fallbackVisitorStarters;

        List<String> names = extractWechselNames(formation);
        if (names.isEmpty()) {
            return new ExchangeSubstitutions(new ArrayList<>(), new ArrayList<>());
        }

        return selectSubstitutions(names, hostStarters, visitorStarters, hostRosterNames, visitorRosterNames);
    }

    public List<String> findExchangePlayersForTeam(String formation, List<String> parsedPlayerList, boolean isHost) {
        return findExchangePlayersForTeam(formation, parsedPlayerList, isHost, null, null);
    }

    public List<String> findExchangePlayersForTeam(String formation, List<String> parsedPlayerList, boolean isHost,
                                                   Set<String> hostRosterNames, Set<String> visitorRosterNames) {
        List<String> hostStarters = new ArrayList<>(parsedPlayerList.subList(0, Math.min(11, parsedPlayerList.size())));
        List<String> visitorStarters = parsedPlayerList.size() > 11
            ? new ArrayList<>(parsedPlayerList.subList(11, Math.min(22, parsedPlayerList.size())))
            : new ArrayList<>();
        ExchangeSubstitutions substitutions = findExchangePlayers(formation, hostStarters, visitorStarters, hostRosterNames, visitorRosterNames);
        return isHost ? substitutions.getHostPlayers() : substitutions.getVisitorPlayers();
    }

    private ExchangeSubstitutions selectSubstitutions(List<String> names, List<String> hostStarters, List<String> visitorStarters,
                                                      Set<String> hostRosterNames, Set<String> visitorRosterNames) {
        List<List<String>> hostCandidates = new ArrayList<>();
        List<List<String>> visitorCandidates = new ArrayList<>();
        for (int shift = 0; shift <= 2; shift++) {
            hostCandidates.add(pairSubstitutions(names, shift, new HashSet<>(hostStarters)));
            visitorCandidates.add(pairSubstitutions(names, shift, new HashSet<>(visitorStarters)));
        }

        boolean hasRosters = hostRosterNames != null && visitorRosterNames != null
            && !hostRosterNames.isEmpty() && !visitorRosterNames.isEmpty();

        if (hasRosters) {
            int bestShift = 0;
            int bestLimitPenalty = Integer.MAX_VALUE;
            int bestViolations = Integer.MAX_VALUE;
            int bestTotal = Integer.MIN_VALUE;
            for (int shift = 0; shift <= 2; shift++) {
                int limitPenalty = (hostCandidates.get(shift).size() > MAX_SUBSTITUTIONS ? 1 : 0)
                    + (visitorCandidates.get(shift).size() > MAX_SUBSTITUTIONS ? 1 : 0);
                int violations = countRosterViolations(hostCandidates.get(shift), hostRosterNames)
                    + countRosterViolations(visitorCandidates.get(shift), visitorRosterNames);
                int total = hostCandidates.get(shift).size() + visitorCandidates.get(shift).size();
                if (limitPenalty < bestLimitPenalty
                    || (limitPenalty == bestLimitPenalty && violations < bestViolations)
                    || (limitPenalty == bestLimitPenalty && violations == bestViolations && total > bestTotal)) {
                    bestShift = shift;
                    bestLimitPenalty = limitPenalty;
                    bestViolations = violations;
                    bestTotal = total;
                }
            }
            return new ExchangeSubstitutions(hostCandidates.get(bestShift), visitorCandidates.get(bestShift));
        }

        for (int shift = 0; shift <= 2; shift++) {
            if (hostCandidates.get(shift).size() <= MAX_SUBSTITUTIONS && visitorCandidates.get(shift).size() <= MAX_SUBSTITUTIONS) {
                return new ExchangeSubstitutions(hostCandidates.get(shift), visitorCandidates.get(shift));
            }
        }
        return new ExchangeSubstitutions(hostCandidates.get(0), visitorCandidates.get(0));
    }

    private int countRosterViolations(List<String> substitutions, Set<String> rosterNames) {
        int violations = 0;
        for (String name : substitutions) {
            if (!rosterNames.contains(name)) {
                violations++;
            }
        }
        return violations;
    }

    public static Set<String> toRosterNameSet(List<Player> players) {
        Set<String> names = new HashSet<>();
        for (Player player : players) {
            if (player.getNameKicker() != null) names.add(player.getNameKicker());
            if (player.getNameKickerAlt1() != null) names.add(player.getNameKickerAlt1());
            if (player.getNameKickerAlt2() != null) names.add(player.getNameKickerAlt2());
            if (player.getNameKickerAlt3() != null) names.add(player.getNameKickerAlt3());
        }
        return names;
    }

    private List<List<String>> extractStartingXIs(String formation) {
        String aufstellung = extractAufstellung(formation);
        if (aufstellung.isEmpty()) {
            return null;
        }
        List<String> playerList = new ArrayList<>();
        for (String line : aufstellung.split(FFL_LINE_BREAK)) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                String cleaned = replaceKickerNote(trimmed);
                if (!cleaned.isEmpty()) {
                    playerList.add(cleaned);
                }
            }
        }
        if (playerList.size() < 22) {
            return null;
        }
        List<List<String>> result = new ArrayList<>();
        result.add(new ArrayList<>(playerList.subList(0, 11)));
        result.add(new ArrayList<>(playerList.subList(11, Math.min(22, playerList.size()))));
        return result;
    }

    private List<String> extractWechselNames(String formation) {
        List<String> names = new ArrayList<>();

        int wechselStart = formation.indexOf("Wechsel");
        if (wechselStart < 0) return names;

        String wechsel = formation.substring(wechselStart + 7);
        for (String marker : new String[]{"Trainer", "Aufstellung", "Besondere Vorkommnisse", "Tore"}) {
            int markerIndex = wechsel.indexOf(marker);
            if (markerIndex >= 0) {
                wechsel = wechsel.substring(0, markerIndex);
            }
        }

        for (String line : wechsel.split(FFL_LINE_BREAK)) {
            if (line == null || line.trim().isEmpty()) continue;
            char first = line.trim().charAt(0);
            if (Character.isDigit(first) || first == '+' || first == ':') continue;
            String cleaned = replaceKickerNote(line);
            if (!cleaned.isEmpty()) {
                names.add(cleaned);
            }
        }

        return names;
    }

    private List<String> pairSubstitutions(List<String> names, int shift, Set<String> activePlayers) {
        List<String> result = new ArrayList<>();

        int i = shift;
        while (i < names.size() - 1) {
            String first = names.get(i);
            String second = names.get(i + 1);
            boolean firstActive = activePlayers.contains(first);
            boolean secondActive = activePlayers.contains(second);

            if (firstActive && !secondActive) {
                activePlayers.remove(first);
                activePlayers.add(second);
                result.add(second);
                i += 2;
            } else if (!firstActive && secondActive) {
                activePlayers.remove(second);
                activePlayers.add(first);
                result.add(first);
                i += 2;
            } else {
                i += 2;
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

    public static class ExchangeSubstitutions {
        private final List<String> hostPlayers;
        private final List<String> visitorPlayers;

        public ExchangeSubstitutions(List<String> hostPlayers, List<String> visitorPlayers) {
            this.hostPlayers = hostPlayers;
            this.visitorPlayers = visitorPlayers;
        }

        public List<String> getHostPlayers() {
            return hostPlayers;
        }

        public List<String> getVisitorPlayers() {
            return visitorPlayers;
        }
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

        List<Player> hostTeamPlayers = playerRepository.findByTeamId(game.getHost().getId());
        List<Player> visitorTeamPlayers = playerRepository.findByTeamId(game.getVisitor().getId());
        Set<String> hostRosterNames = toRosterNameSet(hostTeamPlayers);
        Set<String> visitorRosterNames = toRosterNameSet(visitorTeamPlayers);

        ValidationResult basicValidation = validateFormation(formationIntern, hostRosterNames, visitorRosterNames);
        if (!basicValidation.isValid()) {
            result.setValid(false);
            result.setErrors(basicValidation.getErrors());
            result.setHostPlayerCount(basicValidation.getHostPlayerCount());
            result.setVisitorPlayerCount(basicValidation.getVisitorPlayerCount());
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
            result.getErrors().add("Fehler beim Parsen der Aufstellung: Erwartet wurden 22 Spieler, aber " + playerList.size() + " Einträge gefunden. Hinweis: Prüfe ob 'Trainer' oder 'Wechsel' als Trenner vorhanden sind.");
            result.setValid(false);
            return result;
        }

        List<String> hostPlayerNames = new ArrayList<>(playerList.subList(0, 11));
        List<String> visitorPlayerNames = new ArrayList<>(playerList.subList(11, 22));

        ExchangeSubstitutions exchangeSubstitutions = findExchangePlayers(formationIntern, hostPlayerNames, visitorPlayerNames, hostRosterNames, visitorRosterNames);
        List<String> hostExchangeNames = exchangeSubstitutions.getHostPlayers();
        List<String> visitorExchangeNames = exchangeSubstitutions.getVisitorPlayers();

        hostPlayerNames.addAll(hostExchangeNames);
        visitorPlayerNames.addAll(visitorExchangeNames);

        if (hostPlayerNames.size() > 16) {
            result.getErrors().add("Heim-Mannschaft hat " + hostPlayerNames.size() + " statt max. 16 Spieler");
        }
        if (visitorPlayerNames.size() > 16) {
            result.getErrors().add("Gast-Mannschaft hat " + visitorPlayerNames.size() + " statt max. 16 Spieler");
        }

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
