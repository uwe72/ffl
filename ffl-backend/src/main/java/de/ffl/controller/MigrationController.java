package de.ffl.controller;

import de.ffl.service.H2ToPostgresMigrationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/migration")
public class MigrationController {

    private final H2ToPostgresMigrationService migrationService;

    @Value("${migration.password:none347}")
    private String migrationPassword;

    public MigrationController(H2ToPostgresMigrationService migrationService) {
        this.migrationService = migrationService;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("h2Available", migrationService.isH2Available());
        status.put("postgresHasData", migrationService.hasPostgresData());
        return ResponseEntity.ok(status);
    }

    @PostMapping("/h2-to-postgres")
    public ResponseEntity<?> migrateH2ToPostgres(
            @RequestHeader(value = "X-Migration-Password", required = false) String password,
            @RequestParam(defaultValue = "false") boolean force) {
        
        if (!migrationPassword.equals(password)) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Invalid migration password");
            return ResponseEntity.status(403).body(error);
        }

        if (!migrationService.isH2Available()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "H2 database not available. Make sure the H2 database file is mounted.");
            return ResponseEntity.badRequest().body(error);
        }

        if (migrationService.hasPostgresData() && !force) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "PostgreSQL already contains data. Use force=true to overwrite.");
            return ResponseEntity.badRequest().body(error);
        }

        H2ToPostgresMigrationService.MigrationResult result = migrationService.migrateAll(force);
        return ResponseEntity.ok(result);
    }
}