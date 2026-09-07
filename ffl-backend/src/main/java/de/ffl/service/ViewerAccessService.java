package de.ffl.service;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
public class ViewerAccessService {

    private static final int DEFAULT_START_ROUND_RUECKRUNDE = 16;

    private final UserRepository userRepository;
    private final SeasonService seasonService;
    private final ManagerRepository managerRepository;

    public ViewerAccessService(UserRepository userRepository, SeasonService seasonService, ManagerRepository managerRepository) {
        this.userRepository = userRepository;
        this.seasonService = seasonService;
        this.managerRepository = managerRepository;
    }

    public Optional<User> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Optional.empty();
        }
        return userRepository.findByLogin(auth.getName());
    }

    public boolean isAdmin() {
        return currentUser().map(user -> user.getRole() == UserRole.ADMIN).orElse(false);
    }

    @Transactional(readOnly = true)
    public User effectiveUser() {
        User user = currentUser().orElse(null);
        if (user == null) {
            return null;
        }
        if (user.getRole() != UserRole.ADMIN) {
            return user;
        }
        String fallbackLogin = seasonService.findCurrentSeason()
            .map(Season::getAdminFallbackUser)
            .orElse(null);
        if (fallbackLogin == null || fallbackLogin.isBlank()) {
            return null;
        }
        return userRepository.findByLogin(fallbackLogin).orElse(null);
    }

    public boolean isBeforeSeason() {
        return seasonService.findCurrentSeason()
            .map(season -> season.getSeasonState() == SeasonState.BEFORE_SEASON)
            .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean ownsManagerId(Long managerId) {
        if (managerId == null) {
            return false;
        }
        User effective = effectiveUser();
        if (effective == null) {
            return false;
        }
        return managerRepository.findById(managerId)
            .map(manager -> manager.getUser() != null && effective.getId().equals(manager.getUser().getId()))
            .orElse(false);
    }

    public boolean canSeeWinterTransfersForManagerId(Long managerId) {
        Season season = seasonService.findCurrentSeason().orElse(null);
        if (season == null) {
            return true;
        }
        if (isWinterTransferEffective(season)) {
            return true;
        }
        if (managerId == null) {
            return false;
        }
        User effective = effectiveUser();
        if (effective == null) {
            return false;
        }
        return managerRepository.findById(managerId)
            .map(manager -> manager.getUser() != null && effective.getId().equals(manager.getUser().getId()))
            .orElse(false);
    }

    @Transactional(readOnly = true)
    public Set<Long> hiddenWinterTransferPlayerIds(Long managerId) {
        if (canSeeWinterTransfersForManagerId(managerId)) {
            return Set.of();
        }
        return managerRepository.findById(managerId)
            .map(manager -> {
                Set<Long> ids = new HashSet<>();
                for (WinterTransferPairs.Pair pair : WinterTransferPairs.of(manager)) {
                    if (pair.oldPlayer() != null) {
                        ids.add(pair.oldPlayer().getId());
                    }
                    if (pair.newPlayer() != null) {
                        ids.add(pair.newPlayer().getId());
                    }
                }
                return ids;
            })
            .orElse(Set.of());
    }

    private boolean isWinterTransferEffective(Season season) {
        if (season.getSeasonState() == SeasonState.RUNNING_RUECKRUNDE) {
            return true;
        }
        int currentMatchday = season.getCurrentMatchday() != null ? season.getCurrentMatchday() : 0;
        int startRoundRueckrunde = season.getStartRoundRueckrunde() != null ? season.getStartRoundRueckrunde() : DEFAULT_START_ROUND_RUECKRUNDE;
        return currentMatchday >= startRoundRueckrunde;
    }
}
