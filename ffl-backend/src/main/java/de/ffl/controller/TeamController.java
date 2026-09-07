package de.ffl.controller;

import de.ffl.domain.Team;
import de.ffl.dto.PlayerDto;
import de.ffl.repository.TeamRepository;
import de.ffl.service.PlayerService;
import de.ffl.service.ViewerAccessService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamRepository teamRepository;
    private final PlayerService playerService;
    private final ViewerAccessService viewerAccessService;

    public TeamController(TeamRepository teamRepository, PlayerService playerService, ViewerAccessService viewerAccessService) {
        this.teamRepository = teamRepository;
        this.playerService = playerService;
        this.viewerAccessService = viewerAccessService;
    }

    @GetMapping
    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    @GetMapping("/season/{seasonId}")
    public List<Team> getTeamsBySeason(@PathVariable Long seasonId) {
        return teamRepository.findBySeasonId(seasonId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Team> getTeamById(@PathVariable Long id) {
        return teamRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/players")
    public ResponseEntity<List<PlayerDto>> getPlayersByTeam(@PathVariable Long id) {
        if (!teamRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        List<PlayerDto> players = playerService.findByTeamId(id);
        if (!viewerAccessService.isAdmin() && viewerAccessService.isBeforeSeason()) {
            players.forEach(player -> player.setManagerCount(null));
        }
        return ResponseEntity.ok(players);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Team createTeam(@Valid @RequestBody Team team) {
        return teamRepository.save(team);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Team> updateTeam(@PathVariable Long id, @Valid @RequestBody Team updateData) {
        return teamRepository.findById(id)
            .map(team -> {
                team.setShortName(updateData.getShortName());
                team.setSlogan(updateData.getSlogan());
                team.setLogoSUrl(updateData.getLogoSUrl());
                return ResponseEntity.ok(teamRepository.save(team));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}