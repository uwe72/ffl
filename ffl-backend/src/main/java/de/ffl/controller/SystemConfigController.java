package de.ffl.controller;

import de.ffl.dto.SystemConfigDto;
import de.ffl.service.SystemConfigService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/system")
@PreAuthorize("hasRole('ADMIN')")
public class SystemConfigController {

    private final SystemConfigService configService;

    public SystemConfigController(SystemConfigService configService) {
        this.configService = configService;
    }

    @GetMapping("/config")
    public ResponseEntity<SystemConfigDto> getConfig() {
        return ResponseEntity.ok(configService.getConfig());
    }

    @PutMapping("/config")
    public ResponseEntity<SystemConfigDto> updateConfig(@RequestBody SystemConfigDto updateData) {
        return ResponseEntity.ok(configService.updateConfig(updateData));
    }
}
