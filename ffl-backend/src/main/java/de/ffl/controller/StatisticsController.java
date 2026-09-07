package de.ffl.controller;

import de.ffl.domain.VisitTimelineGranularity;
import de.ffl.dto.DownloadStatisticDto;
import de.ffl.dto.InstallStatisticDto;
import de.ffl.dto.VisitStatisticDto;
import de.ffl.dto.VisitTimelineDto;
import de.ffl.service.DownloadStatisticsService;
import de.ffl.service.InstallStatisticsService;
import de.ffl.service.VisitStatisticsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    private final VisitStatisticsService visitStatisticsService;
    private final InstallStatisticsService installStatisticsService;
    private final DownloadStatisticsService downloadStatisticsService;

    public StatisticsController(VisitStatisticsService visitStatisticsService,
                                InstallStatisticsService installStatisticsService,
                                DownloadStatisticsService downloadStatisticsService) {
        this.visitStatisticsService = visitStatisticsService;
        this.installStatisticsService = installStatisticsService;
        this.downloadStatisticsService = downloadStatisticsService;
    }

    @GetMapping("/visits")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VisitStatisticDto> getVisitStatistics(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (!to.isAfter(from)) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(visitStatisticsService.getStatistics(from, to));
    }

    @GetMapping("/visits/timeline")
    public ResponseEntity<VisitTimelineDto> getVisitTimeline(
        @RequestParam VisitTimelineGranularity granularity) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        boolean isAdmin = auth.getAuthorities().stream()
            .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (!isAdmin) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(visitStatisticsService.getTimeline(granularity));
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
