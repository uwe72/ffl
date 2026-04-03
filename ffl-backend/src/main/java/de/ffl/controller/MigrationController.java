package de.ffl.controller;

import de.ffl.service.CsvImportService;
import de.ffl.service.DataMigrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/migration")
public class MigrationController {

    private final DataMigrationService migrationService;
    private final CsvImportService csvImportService;
    private final JdbcTemplate jdbcTemplate;

    public MigrationController(DataMigrationService migrationService, CsvImportService csvImportService, JdbcTemplate jdbcTemplate) {
        this.migrationService = migrationService;
        this.csvImportService = csvImportService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostMapping("/run")
    public ResponseEntity<DataMigrationService.MigrationResult> runMigration() {
        DataMigrationService.MigrationResult result = migrationService.migrateAll();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/csv")
    public ResponseEntity<CsvImportService.CsvImportResult> importFromCsv() {
        CsvImportService.CsvImportResult result = csvImportService.importFromCsv();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/update-season")
    public ResponseEntity<String> updateSeason() {
        jdbcTemplate.update("UPDATE ffl_season SET name = '2025/26', season_state = 'RUNNING_RUECKRUNDE' WHERE id = 1");
        return ResponseEntity.ok("Season updated to 2025/26 RUNNING_RUECKRUNDE");
    }

    @PostMapping("/update-manager-groups")
    public ResponseEntity<String> updateManagerGroups() {
        migrationService.updateManagerGroups();
        return ResponseEntity.ok("Manager groups updated");
    }
}