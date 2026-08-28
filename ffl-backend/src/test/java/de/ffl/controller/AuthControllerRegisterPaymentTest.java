package de.ffl.controller;

import de.ffl.domain.Player;
import de.ffl.domain.Position;
import de.ffl.domain.Season;
import de.ffl.dto.RegisterRequest;
import de.ffl.dto.RegisterResponseDto;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.EmailAddressService;
import de.ffl.service.ManagerService;
import de.ffl.service.PasswordResetService;
import de.ffl.service.RegistrationMailService;
import de.ffl.service.UserService;
import de.ffl.config.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerRegisterPaymentTest {

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

    @InjectMocks
    private AuthController authController;

    private RegisterRequest validRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setLogin("neuerManager");
        request.setPassword("passwort123");
        request.setEmail("neuer@test.de");
        request.setFirstName("Vor");
        request.setLastName("Nach");
        request.setPlayerGoalkeeperId(1L);
        request.setPlayerDefender1Id(2L);
        request.setPlayerDefender2Id(3L);
        request.setPlayerDefender3Id(4L);
        request.setPlayerMidfield1Id(5L);
        request.setPlayerMidfield2Id(6L);
        request.setPlayerMidfield3Id(7L);
        request.setPlayerStriker1Id(8L);
        request.setPlayerStriker2Id(9L);
        request.setPlayerStriker3Id(10L);
        request.setPlayerFreeChoiceId(11L);
        return request;
    }

    private List<Player> elevenPlayers() {
        List<Player> players = new ArrayList<>();
        for (long id = 1L; id <= 11L; id++) {
            players.add(Player.builder()
                .id(id)
                .nameKicker("Spieler " + id)
                .position(Position.GOALKEEPER)
                .prize(1_000_000)
                .build());
        }
        return players;
    }

    @Test
    void register_appendsSpieleinsatzToPaypalLinkInResponse() {
        Season season = Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(30_000_000)
            .spieleinsatzEuro(new BigDecimal("10.00"))
            .paypalLink("https://www.paypal.com/paypalme/UweClement")
            .build();
        when(seasonRepository.findAll()).thenReturn(List.of(season));
        when(userRepository.existsByLoginIgnoreCase("neuerManager")).thenReturn(false);
        when(playerRepository.findByIdsWithTeams(any())).thenReturn(elevenPlayers());
        when(passwordEncoder.encode("passwort123")).thenReturn("encoded");
        when(managerRepository.count()).thenReturn(1L);

        ResponseEntity<?> response = authController.register(validRequest(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isInstanceOf(RegisterResponseDto.class);
        RegisterResponseDto dto = (RegisterResponseDto) response.getBody();
        assertThat(dto.getPaymentInfo()).isNotNull();
        assertThat(dto.getPaymentInfo().getPaypalLink())
            .isEqualTo("https://www.paypal.com/paypalme/UweClement/10");
    }

    @Test
    void register_keepsPaypalLinkWhenAmountAlreadyAppended() {
        Season season = Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(30_000_000)
            .spieleinsatzEuro(new BigDecimal("10.00"))
            .paypalLink("https://www.paypal.com/paypalme/UweClement/10")
            .build();
        when(seasonRepository.findAll()).thenReturn(List.of(season));
        when(userRepository.existsByLoginIgnoreCase("neuerManager")).thenReturn(false);
        when(playerRepository.findByIdsWithTeams(any())).thenReturn(elevenPlayers());
        when(passwordEncoder.encode("passwort123")).thenReturn("encoded");
        when(managerRepository.count()).thenReturn(1L);

        ResponseEntity<?> response = authController.register(validRequest(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        RegisterResponseDto dto = (RegisterResponseDto) response.getBody();
        assertThat(dto.getPaymentInfo().getPaypalLink())
            .isEqualTo("https://www.paypal.com/paypalme/UweClement/10");
    }

    @Test
    void register_returnsNullPaypalLinkWhenSeasonHasNone() {
        Season season = Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(30_000_000)
            .spieleinsatzEuro(new BigDecimal("10.00"))
            .build();
        when(seasonRepository.findAll()).thenReturn(List.of(season));
        when(userRepository.existsByLoginIgnoreCase("neuerManager")).thenReturn(false);
        when(playerRepository.findByIdsWithTeams(any())).thenReturn(elevenPlayers());
        when(passwordEncoder.encode("passwort123")).thenReturn("encoded");
        when(managerRepository.count()).thenReturn(1L);

        ResponseEntity<?> response = authController.register(validRequest(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        RegisterResponseDto dto = (RegisterResponseDto) response.getBody();
        assertThat(dto.getPaymentInfo().getPaypalLink()).isNull();
    }

    @Test
    void register_appendsDecimalAmountToPaypalLink() {
        Season season = Season.builder()
            .id(1L)
            .name("2026/27")
            .budget(30_000_000)
            .spieleinsatzEuro(new BigDecimal("10.50"))
            .paypalLink("https://paypal.me/ffl")
            .build();
        when(seasonRepository.findAll()).thenReturn(List.of(season));
        when(userRepository.existsByLoginIgnoreCase("neuerManager")).thenReturn(false);
        when(playerRepository.findByIdsWithTeams(any())).thenReturn(elevenPlayers());
        when(passwordEncoder.encode("passwort123")).thenReturn("encoded");
        when(managerRepository.count()).thenReturn(1L);

        ResponseEntity<?> response = authController.register(validRequest(), null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        RegisterResponseDto dto = (RegisterResponseDto) response.getBody();
        assertThat(dto.getPaymentInfo().getPaypalLink()).isEqualTo("https://paypal.me/ffl/10.50");
    }
}
