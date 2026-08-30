package de.ffl.controller;

import de.ffl.dto.LoginStatisticDto;
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

    public StatisticsController(LoginStatisticsService loginStatisticsService) {
        this.loginStatisticsService = loginStatisticsService;
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
}
