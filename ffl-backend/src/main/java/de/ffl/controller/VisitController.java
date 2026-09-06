package de.ffl.controller;

import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.repository.UserRepository;
import de.ffl.service.VisitStatisticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VisitController {

    private final VisitStatisticsService visitStatisticsService;
    private final UserRepository userRepository;

    public VisitController(VisitStatisticsService visitStatisticsService, UserRepository userRepository) {
        this.visitStatisticsService = visitStatisticsService;
        this.userRepository = userRepository;
    }

    @PostMapping("/api/visits")
    public ResponseEntity<Void> recordVisit() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByLoginIgnoreCase(auth.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        if (user.getRole() != UserRole.ADMIN) {
            visitStatisticsService.recordVisit(user);
        }
        return ResponseEntity.ok().build();
    }
}
