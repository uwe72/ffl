package de.ffl.controller;

import de.ffl.domain.Team;
import de.ffl.dto.PlayerDto;
import de.ffl.repository.TeamRepository;
import de.ffl.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamRepository teamRepository;
    private final PlayerService playerService;

    public TeamController(TeamRepository teamRepository, PlayerService playerService) {
        this.teamRepository = teamRepository;
        this.playerService = playerService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    @GetMapping("/season/{seasonId}")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Team> getTeamsBySeason(@PathVariable Long seasonId) {
        return teamRepository.findBySeasonId(seasonId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Team> getTeamById(@PathVariable Long id) {
        return teamRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/players")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PlayerDto>> getPlayersByTeam(@PathVariable Long id) {
        if (!teamRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(playerService.findByTeamId(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Team createTeam(@RequestBody Team team) {
        return teamRepository.save(team);
    }
}