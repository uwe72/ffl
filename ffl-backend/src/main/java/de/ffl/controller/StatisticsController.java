package de.ffl.controller;

import de.ffl.dto.DownloadStatisticDto;
import de.ffl.dto.InstallStatisticDto;
import de.ffl.dto.LoginStatisticDto;
import de.ffl.service.DownloadStatisticsService;
import de.ffl.service.InstallStatisticsService;
import de.ffl.service.LoginStatisticsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    private final LoginStatisticsService loginStatisticsService;
    private final InstallStatisticsService installStatisticsService;
    private final DownloadStatisticsService downloadStatisticsService;

    public StatisticsController(LoginStatisticsService loginStatisticsService,
                                InstallStatisticsService installStatisticsService,
                                DownloadStatisticsService downloadStatisticsService) {
        this.loginStatisticsService = loginStatisticsService;
        this.installStatisticsService = installStatisticsService;
        this.downloadStatisticsService = downloadStatisticsService;
    }

    @GetMapping("/logins")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LoginStatisticDto> getLoginStatistics(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (!to.isAfter(from)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(loginStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay()));
    }

    @GetMapping("/install-clicks")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InstallStatisticDto> getInstallClickStatistics(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (!to.isAfter(from)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(installStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay()));
    }

    @GetMapping("/downloads")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DownloadStatisticDto> getDownloadStatistics(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (!to.isAfter(from)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(downloadStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay()));
    }
}
