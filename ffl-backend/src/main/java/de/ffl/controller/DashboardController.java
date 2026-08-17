package de.ffl.controller;

import de.ffl.dto.AufstellungDto;
import de.ffl.dto.RanglisteDto;
import de.ffl.service.DashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/aufstellung/{managerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public AufstellungDto getAufstellung(@PathVariable Long managerId) {
        return dashboardService.getAufstellung(managerId);
    }

    @GetMapping("/rangliste/{managerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public RanglisteDto getRangliste(
            @PathVariable Long managerId,
            @RequestParam(defaultValue = "2") int umkreis,
            @RequestParam(defaultValue = "gesamt") String modus) {
        return dashboardService.getRangliste(managerId, umkreis, modus);
    }
}
