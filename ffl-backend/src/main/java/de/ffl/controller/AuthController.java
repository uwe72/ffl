package de.ffl.controller;

import de.ffl.config.JwtTokenProvider;
import de.ffl.domain.MailTheme;
import de.ffl.domain.Manager;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.AuthResponse;
import de.ffl.dto.LoginRequest;
import de.ffl.dto.RefreshRequest;
import de.ffl.dto.RegisterRequest;
import de.ffl.dto.UserDto;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.UserRepository;
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

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final ManagerRepository managerRepository;
    private final UserService userService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider tokenProvider,
                          ManagerRepository managerRepository,
                          UserService userService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.managerRepository = managerRepository;
        this.userService = userService;
    }

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

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByLogin(request.getLogin())) {
            return ResponseEntity.badRequest().body("Login bereits vergeben");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("E-Mail bereits registriert");
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

        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getLogin(), request.getPassword())
        );

        String jwt = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(request.getLogin(), UserRole.NORMAL.name());
        return ResponseEntity.ok(new AuthResponse(jwt, refreshToken, user.getLogin(), user.getRole().name()));
    }

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
            if (newEmail != null && !newEmail.equals(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                return ResponseEntity.badRequest().body("E-Mail bereits registriert");
            }
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