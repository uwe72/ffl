package de.ffl.controller;

import de.ffl.domain.ManagerGroup;
import de.ffl.dto.CreateManagerGroupDto;
import de.ffl.dto.ManagerGroupDto;
import de.ffl.dto.ManagerGroupListDto;
import de.ffl.dto.ManagerGroupRoundStatsDto;
import de.ffl.service.ManagerGroupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manager-groups")
public class ManagerGroupController {

    private final ManagerGroupService managerGroupService;

    public ManagerGroupController(ManagerGroupService managerGroupService) {
        this.managerGroupService = managerGroupService;
    }

    @GetMapping
    public ResponseEntity<List<ManagerGroupListDto>> getAllVisibleGroups() {
        List<ManagerGroupListDto> groups = managerGroupService.getVisibleGroups();
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/my-groups-with-stats")
    public ResponseEntity<List<ManagerGroupRoundStatsDto>> getMyGroupsWithStats() {
        List<ManagerGroupRoundStatsDto> groups = managerGroupService.getMyGroupsWithStats();
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/manager/{managerId}/with-stats")
    public ResponseEntity<List<ManagerGroupRoundStatsDto>> getGroupsWithStatsByManagerId(@PathVariable Long managerId) {
        List<ManagerGroupRoundStatsDto> groups = managerGroupService.getGroupsWithStatsByManagerId(managerId);
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ManagerGroupDto> getGroupById(@PathVariable Long id) {
        ManagerGroupDto group = managerGroupService.getGroupById(id);
        if (group == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(group);
    }

    @PostMapping
    public ResponseEntity<ManagerGroupDto> createGroup(@Valid @RequestBody CreateManagerGroupDto dto) {
        try {
            ManagerGroupDto created = managerGroupService.createGroup(dto);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ManagerGroupDto> updateGroup(@PathVariable Long id, @RequestBody ManagerGroup group) {
        ManagerGroupDto updated = managerGroupService.updateGroup(id, group);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        boolean deleted = managerGroupService.deleteGroup(id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/managers/{managerId}")
    public ResponseEntity<ManagerGroupDto> addManagerToGroup(@PathVariable Long id, @PathVariable Long managerId) {
        ManagerGroupDto group = managerGroupService.addManagerToGroup(id, managerId);
        if (group == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{id}/managers/{managerId}")
    public ResponseEntity<ManagerGroupDto> removeManagerFromGroup(@PathVariable Long id, @PathVariable Long managerId) {
        ManagerGroupDto group = managerGroupService.removeManagerFromGroup(id, managerId);
        if (group == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(group);
    }

    @PutMapping("/{id}/creator")
    public ResponseEntity<ManagerGroupDto> changeCreator(@PathVariable Long id, @RequestBody java.util.Map<String, Long> request) {
        Long newCreatorId = request.get("newCreatorId");
        if (newCreatorId == null) {
            return ResponseEntity.badRequest().build();
        }
        ManagerGroupDto group = managerGroupService.changeCreator(id, newCreatorId);
        if (group == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(group);
    }
}
