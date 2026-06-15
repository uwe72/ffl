package de.ffl.controller;

import de.ffl.domain.ManagerGroup;
import de.ffl.dto.CreateManagerGroupDto;
import de.ffl.dto.ManagerGroupDto;
import de.ffl.dto.ManagerGroupListDto;
import de.ffl.dto.ManagerGroupRoundStatsDto;
import de.ffl.service.ManagerGroupService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/manager-groups")
public class ManagerGroupController {

    private static final Logger log = LoggerFactory.getLogger(ManagerGroupController.class);

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

    @PostMapping("/{id}/logo")
    public ResponseEntity<?> uploadLogo(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        log.info("uploadLogo: id={}, file={}, size={}, contentType={}", id, file.getOriginalFilename(), file.getSize(), file.getContentType());
        try {
            ManagerGroupDto updated = managerGroupService.updateLogo(id, file);
            if (updated == null) {
                log.warn("uploadLogo: returned null for id={}", id);
                return ResponseEntity.status(403).body("Keine Berechtigung oder Gruppe nicht gefunden");
            }
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            log.warn("uploadLogo: validation error for id={}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("uploadLogo: unexpected error for id={}", id, e);
            return ResponseEntity.internalServerError().body("Fehler beim Hochladen des Bildes: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}/logo")
    public ResponseEntity<?> deleteLogo(@PathVariable Long id) {
        ManagerGroupDto updated = managerGroupService.removeLogo(id);
        if (updated == null) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/logo")
    public ResponseEntity<byte[]> getLogo(@PathVariable Long id) {
        byte[] logo = managerGroupService.getLogo(id);
        if (logo == null) {
            return ResponseEntity.notFound().build();
        }
        String contentType = managerGroupService.getLogoContentType(id);
        if (contentType == null) {
            contentType = MediaType.IMAGE_JPEG_VALUE;
        }
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header(HttpHeaders.CACHE_CONTROL, "no-cache")
            .body(logo);
    }
}
