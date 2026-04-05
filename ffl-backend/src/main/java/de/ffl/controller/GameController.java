package de.ffl.controller;

import de.ffl.domain.Game;
import de.ffl.dto.GameDto;
import de.ffl.dto.GameImportRequest;
import de.ffl.dto.GameImportResult;
import de.ffl.dto.FormationValidationResult;
import de.ffl.service.FormationConverterService;
import de.ffl.service.GameImportService;
import de.ffl.service.GameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/games")
public class GameController {

    private static final Logger log = LoggerFactory.getLogger(GameController.class);

    private final GameService gameService;
    private final GameImportService gameImportService;

    public GameController(GameService gameService, GameImportService gameImportService) {
        this.gameService = gameService;
        this.gameImportService = gameImportService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<GameDto> getAllGames() {
        return gameService.findAll();
    }

    @GetMapping("/season/{seasonId}")
    @PreAuthorize("hasRole('ADMIN')")
    public List<GameDto> getGamesBySeason(@PathVariable Long seasonId) {
        return gameService.findBySeasonId(seasonId);
    }

    @GetMapping("/round/{roundId}")
    @PreAuthorize("hasRole('ADMIN')")
    public List<GameDto> getGamesByRound(@PathVariable Long roundId) {
        return gameService.findByRoundId(roundId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameDto> getGameById(@PathVariable Long id) {
        GameDto game = gameService.findById(id);
        if (game == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(game);
    }

    @GetMapping("/latest-completed-round")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Integer> getLatestCompletedRound() {
        Integer round = gameService.findLatestCompletedRound();
        return ResponseEntity.ok(round);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public GameDto createGame(@RequestBody Game game) {
        return gameService.save(game);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameDto> updateGame(@PathVariable Long id, @RequestBody Game game) {
        GameDto existing = gameService.findById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        game.setId(id);
        return ResponseEntity.ok(gameService.save(game));
    }

    @PutMapping("/{id}/formation")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameDto> updateFormation(@PathVariable Long id, @RequestBody String formation) {
        GameDto updated = gameService.updateFormation(id, formation);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/import-formation")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> importFormation(@PathVariable Long id, @RequestBody String formationExtern) {
        FormationConverterService.ValidationResult validation = gameService.validateFormationForGame(id, formationExtern);
        if (!validation.isValid()) {
            return ResponseEntity.badRequest().body(validation);
        }
        try {
            GameDto updated = gameService.importFormation(id, formationExtern);
            if (updated == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/validate-formation")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FormationValidationResult> validateFormation(
            @PathVariable Long id, @RequestBody String formationExtern) {
        log.info("=== VALIDATE FORMATION ===");
        log.info("Empfangene Länge: {}", formationExtern.length());
        int start = Math.max(0, formationExtern.length() - 100);
        log.info("Letzte 100 Zeichen: [{}]", formationExtern.substring(start));
        FormationValidationResult result = gameService.validateFormationForGameDto(id, formationExtern);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteGame(@PathVariable Long id) {
        if (gameService.findById(id) == null) {
            return ResponseEntity.notFound().build();
        }
        gameService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/import")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameImportResult> importGame(@PathVariable Long id) {
        GameImportResult result = gameImportService.validateAndImport(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/import-with-mappings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameImportResult> importGameWithMappings(
            @PathVariable Long id,
            @RequestBody GameImportRequest request) {
        GameImportResult result = gameImportService.processGameImport(id, request.getPlayerMappings());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/create-player")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GameImportResult> createNewPlayer(
            @PathVariable Long id,
            @RequestBody GameImportRequest.CreatePlayerRequest request) {
        GameImportResult result = gameImportService.createNewPlayer(
            id, 
            request.getPlayerName(), 
            request.getTeamId(), 
            request.getPosition()
        );
        return ResponseEntity.ok(result);
    }
}
