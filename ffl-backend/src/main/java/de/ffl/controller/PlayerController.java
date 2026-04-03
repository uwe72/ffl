package de.ffl.controller;

import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.dto.PlayerDto;
import de.ffl.service.PlayerService;
import org.springframework.http.ResponseEntity;
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

    @PostMapping
    public PlayerDto createPlayer(@RequestBody Player player) {
        return PlayerDto.fromEntity(playerService.save(player));
    }
}