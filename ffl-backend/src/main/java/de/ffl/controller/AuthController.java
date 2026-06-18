package de.ffl.controller;

import de.ffl.config.JwtTokenProvider;
import de.ffl.domain.MailTheme;
import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Season;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.AuthResponse;
import de.ffl.dto.LoginRequest;
import de.ffl.dto.RefreshRequest;
import de.ffl.dto.RegisterRequest;
import de.ffl.dto.UserDto;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.ManagerService;
import de.ffl.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final ManagerRepository managerRepository;
    private final UserService userService;
    private final SeasonRepository seasonRepository;
    private final PlayerRepository playerRepository;
    private final ManagerService managerService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider tokenProvider,
                          ManagerRepository managerRepository,
                          UserService userService,
                          SeasonRepository seasonRepository,
                          PlayerRepository playerRepository,
                          ManagerService managerService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.managerRepository = managerRepository;
        this.userService = userService;
        this.seasonRepository = seasonRepository;
        this.playerRepository = playerRepository;
        this.managerService = managerService;
    }

    @Transactional(readOnly = true)
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getLogin(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(request.getLogin(), 
            userRepository.findByLogin(request.getLogin()).orElseThrow().getRole().name());

        User user = userRepository.findByLogin(request.getLogin()).orElseThrow();
        return ResponseEntity.ok(new AuthResponse(jwt, refreshToken, user.getLogin(), user.getRole().name()));
    }

    @Transactional
    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> register(@Valid @RequestPart("data") RegisterRequest request,
                                       @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        if (userRepository.existsByLogin(request.getLogin())) {
            return ResponseEntity.badRequest().body("Login bereits vergeben");
        }

        Season season = seasonRepository.findAll().stream().findFirst().orElse(null);
        if (season == null) {
            return ResponseEntity.badRequest().body("Keine Season vorhanden");
        }

        List<Long> playerIds = List.of(
            request.getPlayerGoalkeeperId(),
            request.getPlayerDefender1Id(),
            request.getPlayerDefender2Id(),
            request.getPlayerDefender3Id(),
            request.getPlayerMidfield1Id(),
            request.getPlayerMidfield2Id(),
            request.getPlayerMidfield3Id(),
            request.getPlayerStriker1Id(),
            request.getPlayerStriker2Id(),
            request.getPlayerStriker3Id(),
            request.getPlayerFreeChoiceId()
        );

        Set<Long> uniqueIds = new HashSet<>(playerIds);
        if (uniqueIds.size() != 11) {
            return ResponseEntity.badRequest().body("Jeder Spieler darf nur einmal ausgewählt werden");
        }

        List<Player> players = playerRepository.findByIdsWithTeams(playerIds);
        if (players.size() != 11) {
            return ResponseEntity.badRequest().body("Nicht alle Spieler gefunden");
        }

        Map<Long, Player> playerMap = new java.util.HashMap<>();
        for (Player p : players) {
            playerMap.put(p.getId(), p);
        }

        Manager validationManager = Manager.builder()
            .budget(season.getBudget())
            .players(new HashSet<>(players))
            .build();

        try {
            managerService.validateTeam(validationManager);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        User user = User.builder()
            .login(request.getLogin())
            .password(passwordEncoder.encode(request.getPassword()))
            .email(request.getEmail())
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .role(UserRole.NORMAL)
            .build();

        userRepository.save(user);

        if (avatar != null && !avatar.isEmpty()) {
            String contentType = avatar.getContentType();
            if (contentType != null && (contentType.equals("image/jpeg") || contentType.equals("image/png") || contentType.equals("image/webp"))) {
                if (avatar.getSize() <= 2 * 1024 * 1024) {
                    try {
                        user.setAvatar(avatar.getBytes());
                        user.setAvatarContentType(contentType);
                        userRepository.save(user);
                    } catch (Exception ignored) {
                    }
                }
            }
        }

        String managerName = buildManagerName(request);

        Manager manager = Manager.builder()
            .name(managerName)
            .user(user)
            .season(season)
            .budget(season.getBudget())
            .playerGoalkeeper(playerMap.get(request.getPlayerGoalkeeperId()))
            .playerDefender1(playerMap.get(request.getPlayerDefender1Id()))
            .playerDefender2(playerMap.get(request.getPlayerDefender2Id()))
            .playerDefender3(playerMap.get(request.getPlayerDefender3Id()))
            .playerMidfield1(playerMap.get(request.getPlayerMidfield1Id()))
            .playerMidfield2(playerMap.get(request.getPlayerMidfield2Id()))
            .playerMidfield3(playerMap.get(request.getPlayerMidfield3Id()))
            .playerStriker1(playerMap.get(request.getPlayerStriker1Id()))
            .playerStriker2(playerMap.get(request.getPlayerStriker2Id()))
            .playerStriker3(playerMap.get(request.getPlayerStriker3Id()))
            .playerFreeChoice(playerMap.get(request.getPlayerFreeChoiceId()))
            .players(new HashSet<>(players))
            .build();

        managerRepository.save(manager);

        return ResponseEntity.status(201).body(Map.of("message", "Registrierung erfolgreich"));
    }

    private String buildManagerName(RegisterRequest request) {
        String firstName = request.getFirstName();
        String lastName = request.getLastName();
        if (firstName != null && !firstName.isBlank() && lastName != null && !lastName.isBlank()) {
            return firstName.trim() + " " + lastName.trim();
        }
        if (firstName != null && !firstName.isBlank()) {
            return firstName.trim();
        }
        if (lastName != null && !lastName.isBlank()) {
            return lastName.trim();
        }
        return request.getLogin();
    }

    @Transactional(readOnly = true)
    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByLogin(auth.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("id", user.getId());
        body.put("login", user.getLogin());
        body.put("email", user.getEmail());
        body.put("firstName", user.getFirstName());
        body.put("lastName", user.getLastName());
        body.put("role", user.getRole().name());
        
        Manager manager = managerRepository.findByUserId(user.getId());
        if (manager != null) {
            body.put("mailTheme", manager.getMailTheme() != null ? manager.getMailTheme().name() : MailTheme.LIGHTMODE.name());
        }
        
        if (user.getAvatar() != null && user.getAvatar().length > 0) {
            body.put("avatarUrl", "/api/users/" + user.getId() + "/avatar");
        }
        
        return ResponseEntity.ok(body);
    }

    @Transactional
    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@RequestBody Map<String, String> updates) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByLogin(auth.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        if (updates.containsKey("email")) {
            String newEmail = updates.get("email");
            user.setEmail(newEmail);
        }
        userRepository.save(user);
        
        if (updates.containsKey("mailTheme")) {
            Manager manager = managerRepository.findByUserId(user.getId());
            if (manager != null) {
                try {
                    manager.setMailTheme(MailTheme.valueOf(updates.get("mailTheme")));
                    managerRepository.save(manager);
                } catch (IllegalArgumentException ignored) {
                }
            }
        }
        
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("id", user.getId());
        body.put("login", user.getLogin());
        body.put("email", user.getEmail());
        body.put("firstName", user.getFirstName());
        body.put("lastName", user.getLastName());
        body.put("role", user.getRole().name());
        
        Manager manager = managerRepository.findByUserId(user.getId());
        if (manager != null) {
            body.put("mailTheme", manager.getMailTheme() != null ? manager.getMailTheme().name() : MailTheme.LIGHTMODE.name());
        }
        
        if (user.getAvatar() != null && user.getAvatar().length > 0) {
            body.put("avatarUrl", "/api/users/" + user.getId() + "/avatar");
        }
        
        return ResponseEntity.ok(body);
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        try {
            UserDto updated = userService.updateAvatar(auth.getName(), file);
            if (updated == null) {
                return ResponseEntity.status(401).build();
            }
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Fehler beim Hochladen des Bildes");
        }
    }

    @DeleteMapping("/me/avatar")
    public ResponseEntity<?> deleteAvatar() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }
        userService.removeAvatar(auth.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/check-login")
    public ResponseEntity<Boolean> checkLoginAvailable(@RequestParam String login) {
        return ResponseEntity.ok(!userRepository.existsByLogin(login));
    }



    @Transactional(readOnly = true)
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest request) {
        String refreshToken = request.getRefreshToken();
        
        if (!tokenProvider.validateRefreshToken(refreshToken)) {
            return ResponseEntity.status(401).body("Ungültiger oder abgelaufener Refresh-Token");
        }

        String login = tokenProvider.getUsernameFromToken(refreshToken);
        String role = tokenProvider.getRoleFromToken(refreshToken);

        User user = userRepository.findByLogin(login).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body("Benutzer nicht gefunden");
        }

        String newAccessToken = tokenProvider.generateToken(
            new UsernamePasswordAuthenticationToken(login, null, java.util.Collections.emptyList())
        );
        String newRefreshToken = tokenProvider.generateRefreshToken(login, role);

        return ResponseEntity.ok(new AuthResponse(newAccessToken, newRefreshToken, login, role));
    }
}