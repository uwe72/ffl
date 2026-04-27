package de.ffl.controller;

import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.dto.PlayerDto;
import de.ffl.dto.PlayerRankDto;
import de.ffl.dto.PlayerSearchDto;
import de.ffl.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    @GetMapping
    public List<PlayerDto> getAllPlayers() {
        return playerService.findAll();
    }

    @GetMapping("/season/{seasonId}")
    public List<PlayerDto> getPlayersBySeason(@PathVariable Long seasonId) {
        return playerService.findBySeasonId(seasonId);
    }

    @GetMapping("/season/{seasonId}/position/{position}")
    public List<PlayerDto> getPlayersByPosition(@PathVariable Long seasonId, 
                                              @PathVariable Position position) {
        return playerService.findBySeasonAndPosition(seasonId, position);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlayerDto> getPlayerById(@PathVariable Long id) {
        PlayerDto player = playerService.findByIdWithManagers(id);
        if (player == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(player);
    }

    @GetMapping("/search")
    public List<PlayerSearchDto> searchPlayers(
            @RequestParam Long seasonId,
            @RequestParam(required = false) String name) {
        return playerService.searchPlayers(seasonId, name);
    }

    @GetMapping("/team/{teamId}/season/{seasonId}")
    public List<PlayerSearchDto> getPlayersByTeamAndSeason(
            @PathVariable Long teamId,
            @PathVariable Long seasonId) {
        return playerService.findByTeamAndSeason(teamId, seasonId);
    }

    @GetMapping("/season/{seasonId}/all")
    public List<PlayerSearchDto> getAllPlayersBySeason(@PathVariable Long seasonId) {
        return playerService.findBySeasonIdAsSearchDto(seasonId);
    }

    @PostMapping("/{playerId}/assign-team/{teamId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> assignPlayerToTeam(
            @PathVariable Long playerId,
            @PathVariable Long teamId,
            @RequestParam(required = false) String alternativeName) {
        playerService.assignPlayerToTeam(playerId, teamId, alternativeName);
        return ResponseEntity.ok().build();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public PlayerDto createPlayer(@RequestBody Player player) {
        return PlayerDto.fromEntity(playerService.save(player));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PlayerDto> updatePlayer(@PathVariable Long id, @RequestBody PlayerDto updateData) {
        PlayerDto updated = playerService.update(id, updateData);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/ranks")
    public ResponseEntity<List<PlayerRankDto>> getPlayerRanks(@PathVariable Long id) {
        List<PlayerRankDto> ranks = playerService.findRanksByPlayerId(id);
        if (ranks == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ranks);
    }
}