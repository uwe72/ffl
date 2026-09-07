package de.ffl.controller;

import de.ffl.dto.AufstellungDto;
import de.ffl.dto.RanglisteDto;
import de.ffl.service.BeforeSeasonAccess;
import de.ffl.service.DashboardService;
import de.ffl.service.SeasonService;
import de.ffl.service.ViewerAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final ViewerAccessService viewerAccessService;
    private final SeasonService seasonService;

    public DashboardController(DashboardService dashboardService, ViewerAccessService viewerAccessService, SeasonService seasonService) {
        this.dashboardService = dashboardService;
        this.viewerAccessService = viewerAccessService;
        this.seasonService = seasonService;
    }

    @GetMapping("/aufstellung/{managerId}")
    public ResponseEntity<?> getAufstellung(@PathVariable Long managerId) {
        boolean ownOrAdmin = viewerAccessService.isAdmin() || viewerAccessService.ownsManagerId(managerId);
        if (!ownOrAdmin && BeforeSeasonAccess.isDetailBlocked(seasonService)) {
            return ResponseEntity.status(403).body("Zugriff verweigert: Fremde Kaderdaten sind vor Saisonstart nicht sichtbar");
        }
        AufstellungDto aufstellung = dashboardService.getAufstellung(managerId);
        if (!ownOrAdmin && !viewerAccessService.canSeeWinterTransfersForManagerId(managerId)) {
            removeHiddenWinterTransferPlayers(managerId, aufstellung);
        }
        return ResponseEntity.ok(aufstellung);
    }

    private void removeHiddenWinterTransferPlayers(Long managerId, AufstellungDto aufstellung) {
        if (aufstellung == null || aufstellung.getSpieler() == null) {
            return;
        }
        Set<Long> hiddenIds = viewerAccessService.hiddenWinterTransferPlayerIds(managerId);
        if (hiddenIds.isEmpty()) {
            return;
        }
        aufstellung.getSpieler().removeIf(spieler -> spieler.getId() != null && hiddenIds.contains(spieler.getId()));
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
