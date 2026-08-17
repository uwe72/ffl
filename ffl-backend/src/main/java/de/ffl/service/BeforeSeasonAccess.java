package de.ffl.service;

import de.ffl.domain.SeasonState;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class BeforeSeasonAccess {

    private BeforeSeasonAccess() {
    }

    public static boolean isDetailBlocked(SeasonService seasonService) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream()
                .anyMatch(g -> "ROLE_ADMIN".equals(g.getAuthority()))) {
            return false;
        }
        return seasonService.findCurrentSeason()
                .map(season -> season.getSeasonState() == SeasonState.BEFORE_SEASON)
                .orElse(false);
    }
}
