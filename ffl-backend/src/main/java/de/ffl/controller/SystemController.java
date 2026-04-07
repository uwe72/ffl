package de.ffl.controller;

import de.ffl.dto.ImportResult;
import de.ffl.service.ExportService;
import de.ffl.service.ImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/admin/system")
public class SystemController {

    private static final Logger log = LoggerFactory.getLogger(SystemController.class);

    private final ExportService exportService;
    private final ImportService importService;

    public SystemController(ExportService exportService, ImportService importService) {
        this.exportService = exportService;
        this.importService = importService;
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportData() {
        log.info("Export requested");
        try {
            byte[] zipData = exportService.createExportZip();
            String filename = exportService.getExportFilename();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", filename);

            log.info("Export successful: {}", filename);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(zipData);
        } catch (Exception e) {
            log.error("Export failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/import")
    public ResponseEntity<ImportResult> importData(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "dryRun", defaultValue = "false") boolean dryRun) {
        log.info("Import requested, dryRun={}", dryRun);
        try {
            byte[] zipData = file.getBytes();

            ImportResult result;
            if (dryRun) {
                result = importService.validateImport(zipData);
            } else {
                result = importService.importData(zipData);
            }

            log.info("Import result: success={}, message={}", result.isSuccess(), result.getMessage());
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            log.error("Import failed - could not read file", e);
            ImportResult error = new ImportResult();
            error.setSuccess(false);
            error.setMessage("Could not read file: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            log.error("Import failed", e);
            ImportResult error = new ImportResult();
            error.setSuccess(false);
            error.setMessage("Import failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
