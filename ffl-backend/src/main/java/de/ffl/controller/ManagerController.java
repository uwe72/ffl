package de.ffl.controller;

import de.ffl.domain.Manager;
import de.ffl.domain.ManagerRank;
import de.ffl.dto.ManagerDto;
import de.ffl.dto.ManagerGroupDto;
import de.ffl.dto.ManagerRankDto;
import de.ffl.dto.ManagerRoundStatsDto;
import de.ffl.dto.PositionStatsDto;
import de.ffl.dto.RoundDetailDto;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.PointsRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.ManagerGroupService;
import de.ffl.service.ManagerService;
import de.ffl.service.ManagerRoundService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/managers")
public class ManagerController {

    private final ManagerService managerService;
    private final ManagerRankRepository managerRankRepository;
    private final ManagerRoundService managerRoundService;
    private final PointsRepository pointsRepository;
    private final ManagerGroupService managerGroupService;
    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;

    public ManagerController(ManagerService managerService, ManagerRankRepository managerRankRepository, ManagerRoundService managerRoundService, PointsRepository pointsRepository, ManagerGroupService managerGroupService, JdbcTemplate jdbcTemplate, UserRepository userRepository) {
        this.managerService = managerService;
        this.managerRankRepository = managerRankRepository;
        this.managerRoundService = managerRoundService;
        this.pointsRepository = pointsRepository;
        this.managerGroupService = managerGroupService;
        this.jdbcTemplate = jdbcTemplate;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<ManagerDto> getAllManagers() {
        return managerService.findAll();
    }

    @GetMapping("/season/{seasonId}")
    public List<ManagerDto> getManagersBySeason(@PathVariable Long seasonId) {
        return managerService.findBySeasonId(seasonId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ManagerDto> getManagerById(@PathVariable Long id) {
        ManagerDto manager = managerService.findById(id);
        if (manager == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(manager);
    }

    @GetMapping("/{id}/ranks")
    public ResponseEntity<List<ManagerRankDto>> getManagerRanks(@PathVariable Long id) {
        List<ManagerRank> ranks = managerRankRepository.findByManagerIdOrderByRoundIdAsc(id);
        List<ManagerRankDto> dtos = ranks.stream()
            .map(ManagerRankDto::fromEntity)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}/round-details")
    public ResponseEntity<List<RoundDetailDto>> getManagerRoundDetails(@PathVariable Long id) {
        List<RoundDetailDto> details = managerRoundService.getRoundDetailsForManager(id);
        return ResponseEntity.ok(details);
    }

    @GetMapping("/{id}/current-players")
    public ResponseEntity<List<RoundDetailDto.PlayerPointDto>> getCurrentPlayers(@PathVariable Long id) {
        List<RoundDetailDto.PlayerPointDto> players = managerRoundService.getCurrentPlayersForManager(id);
        return ResponseEntity.ok(players);
    }

    @GetMapping("/debug/points-count")
    public ResponseEntity<Long> getPointsCount() {
        return ResponseEntity.ok(pointsRepository.count());
    }

    @GetMapping("/{id}/groups")
    public ResponseEntity<List<ManagerGroupDto>> getManagerGroups(@PathVariable Long id) {
        List<ManagerGroupDto> groups = managerGroupService.getGroupsForManager(id);
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/debug/manager-groups")
    public ResponseEntity<List<Object>> debugManagerGroups() {
        String sql = "SELECT mg.id, mg.name, mgm.manager_id FROM ffl_manager_group mg " +
                     "LEFT JOIN manager_group_2_manager mgm ON mg.id = mgm.manager_group_id " +
                     "WHERE mgm.manager_id = 1 OR mgm.manager_id IS NULL ORDER BY mg.id";
        List<Object> result = jdbcTemplate.query(sql, (rs, rowNum) -> {
            return java.util.Map.of("groupId", rs.getLong("id"), "name", rs.getString("name"), "managerId", rs.getObject("manager_id"));
        });
        return ResponseEntity.ok(result);
    }

    @GetMapping("/debug/raw-members")
    public ResponseEntity<List<Object>> debugRawMembers() {
        String sql = "SELECT manager_group_id, manager_id FROM manager_group_2_manager ORDER BY manager_group_id, manager_id";
        List<Object> result = jdbcTemplate.query(sql, (rs, rowNum) -> {
            return java.util.Map.of("groupId", rs.getLong("manager_group_id"), "managerId", rs.getLong("manager_id"));
        });
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> createManager(@Valid @RequestBody Manager manager) {
        try {
            return ResponseEntity.ok(managerService.createManager(manager));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateManager(@PathVariable Long id, @Valid @RequestBody Manager manager) {
        manager.setId(id);
        try {
            return ResponseEntity.ok(managerService.updateManager(manager));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/current")
    public ResponseEntity<ManagerDto> getCurrentManager() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        String login = auth.getName();
        Long userId = userRepository.findByLogin(login)
            .map(u -> u.getId())
            .orElse(null);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        ManagerDto manager = managerService.findByUserId(userId);
        if (manager == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(manager);
    }

    @GetMapping("/{id}/position-stats")
    public ResponseEntity<PositionStatsDto> getManagerPositionStats(@PathVariable Long id) {
        PositionStatsDto stats = managerService.getPositionStatsForManager(id);
        if (stats == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/league/position-stats")
    public ResponseEntity<PositionStatsDto> getLeaguePositionStats(@RequestParam Long seasonId) {
        PositionStatsDto stats = managerService.getLeagueAveragePositionStats(seasonId);
        if (stats == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/round-stats")
    public ResponseEntity<List<ManagerRoundStatsDto>> getRoundStats(@RequestParam Long seasonId) {
        List<ManagerRoundStatsDto> stats = managerService.getRoundStatsForTopManagers(seasonId, 5);
        return ResponseEntity.ok(stats);
    }
}