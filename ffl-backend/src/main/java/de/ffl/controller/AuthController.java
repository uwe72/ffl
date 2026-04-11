package de.ffl.controller;

import de.ffl.config.JwtTokenProvider;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.AuthResponse;
import de.ffl.dto.LoginRequest;
import de.ffl.dto.RefreshRequest;
import de.ffl.dto.RegisterRequest;
import de.ffl.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
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