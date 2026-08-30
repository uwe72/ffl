package de.ffl.controller;

import de.ffl.config.JwtTokenProvider;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.AuthResponse;
import de.ffl.dto.LoginRequest;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerLoginTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider tokenProvider;
    @Mock
    private ManagerRepository managerRepository;
    @Mock
    private UserService userService;
    @Mock
    private SeasonRepository seasonRepository;
    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private ManagerService managerService;
    @Mock
    private RegistrationMailService registrationMailService;
    @Mock
    private PasswordResetService passwordResetService;
    @Mock
    private EmailAddressService emailAddressService;
    @Mock
    private FriendTeamService friendTeamService;
    @Mock
    private LoginStatisticsService loginStatisticsService;

    @InjectMocks
    private AuthController authController;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private User user(UserRole role) {
        return User.builder()
            .login("uwe72")
            .firstName("Uwe")
            .lastName("Muster")
            .role(role)
            .build();
    }

    private void stubSuccessfulLogin(User user) {
        Authentication authentication = mock(Authentication.class);
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(tokenProvider.generateToken(authentication)).thenReturn("jwt");
        when(tokenProvider.generateRefreshToken(anyString(), anyString())).thenReturn("refresh");
        when(userRepository.findByLogin("uwe72")).thenReturn(Optional.of(user));
        when(userRepository.findByLoginIgnoreCase("uwe72")).thenReturn(Optional.of(user));
    }

    private LoginRequest request() {
        LoginRequest request = new LoginRequest();
        request.setLogin("uwe72");
        request.setPassword("password123");
        return request;
    }

    @Test
    void login_normalUser_recordsLoginAndReturnsOk() {
        User user = user(UserRole.NORMAL);
        stubSuccessfulLogin(user);

        ResponseEntity<?> response = authController.login(request());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(AuthResponse.class);
        assertThat(((AuthResponse) response.getBody()).getLogin()).isEqualTo("uwe72");
        verify(loginStatisticsService).recordLogin(user);
    }

    @Test
    void login_recordLoginFails_loginStillSucceeds() {
        User user = user(UserRole.NORMAL);
        stubSuccessfulLogin(user);
        doThrow(new RuntimeException("db down")).when(loginStatisticsService).recordLogin(user);

        ResponseEntity<?> response = authController.login(request());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(AuthResponse.class);
    }

    @Test
    void login_adminUser_doesNotRecordLogin() {
        User user = user(UserRole.ADMIN);
        stubSuccessfulLogin(user);

        ResponseEntity<?> response = authController.login(request());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(loginStatisticsService, never()).recordLogin(any());
    }
}
