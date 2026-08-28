package de.ffl.controller;

import de.ffl.dto.AddFavoriteRequest;
import de.ffl.dto.FriendTeamDto;
import de.ffl.dto.SetStandardRequest;
import de.ffl.repository.UserRepository;
import de.ffl.service.FriendTeamService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
public class FriendTeamController {

    private static final Logger log = LoggerFactory.getLogger(FriendTeamController.class);

    private final FriendTeamService friendTeamService;
    private final UserRepository userRepository;

    public FriendTeamController(FriendTeamService friendTeamService, UserRepository userRepository) {
        this.friendTeamService = friendTeamService;
        this.userRepository = userRepository;
    }

    private Long resolveUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            log.warn("favorites: not authenticated");
            return null;
        }
        String login = auth.getName();
        return userRepository.findByLogin(login)
            .map(u -> u.getId())
            .orElse(null);
    }

    @GetMapping("/season/{seasonId}")
    public ResponseEntity<?> listFavorites(@PathVariable Long seasonId) {
        Long userId = resolveUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(friendTeamService.listFavorites(userId, seasonId));
    }

    @PostMapping
    public ResponseEntity<?> addFavorite(@Valid @RequestBody AddFavoriteRequest request) {
        Long userId = resolveUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            return ResponseEntity.ok(friendTeamService.addFavorite(userId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{friendManagerId}")
    public ResponseEntity<?> removeFavorite(@PathVariable Long friendManagerId, @RequestParam Long seasonId) {
        Long userId = resolveUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            friendTeamService.removeFavorite(userId, seasonId, friendManagerId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/standard")
    public ResponseEntity<?> setStandard(@Valid @RequestBody SetStandardRequest request) {
        Long userId = resolveUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            FriendTeamDto dto = friendTeamService.setStandard(userId, request);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
