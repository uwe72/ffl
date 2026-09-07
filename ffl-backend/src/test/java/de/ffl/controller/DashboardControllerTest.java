package de.ffl.controller;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.AufstellungDto;
import de.ffl.dto.SpielerAufstellungDto;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.DashboardService;
import de.ffl.service.SeasonService;
import de.ffl.service.ViewerAccessService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @Mock
    private DashboardService dashboardService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SeasonService seasonService;

    @Mock
    private ManagerRepository managerRepository;

    private DashboardController dashboardController;

    @BeforeEach
    void setUp() {
        dashboardController = new DashboardController(
            dashboardService,
            new ViewerAccessService(userRepository, seasonService, managerRepository),
            seasonService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authAs(String role) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("user", "pw",
                List.of(new SimpleGrantedAuthority(role))));
    }

    private Season season(SeasonState state) {
        return Season.builder().id(1L).name("2026/27").seasonState(state).build();
    }

    private Season seasonWithRounds(SeasonState state, Integer currentMatchday, Integer startRoundRueckrunde) {
        return Season.builder().id(1L).name("2026/27").seasonState(state)
            .currentMatchday(currentMatchday)
            .startRoundRueckrunde(startRoundRueckrunde)
            .build();
    }

    private Manager managerEntity(Long id, Long userId) {
        return Manager.builder().id(id).user(User.builder().id(userId).login("mgr").build()).build();
    }

    private Manager managerWithTransferPair(Long id, Long userId) {
        Player oldPlayer = Player.builder().id(100L).build();
        Player newPlayer = Player.builder().id(101L).build();
        return Manager.builder()
            .id(id)
            .user(User.builder().id(userId).login("mgr").build())
            .playerExchangedOld1(oldPlayer)
            .playerExchangedNew1(newPlayer)
            .build();
    }

    private AufstellungDto aufstellung(Long... spielerIds) {
        List<SpielerAufstellungDto> spieler = new ArrayList<>();
        for (Long id : spielerIds) {
            spieler.add(SpielerAufstellungDto.builder().id(id).aktiv(true).build());
        }
        return AufstellungDto.builder().phase("SAISON").spieler(spieler).build();
    }

    @Test
    void getAufstellung_beforeSeason_foreignNonAdmin_returns403() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.empty());

        ResponseEntity<?> response = dashboardController.getAufstellung(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(dashboardService);
    }

    @Test
    void getAufstellung_beforeSeason_ownNonAdmin_returnsFullSpieler() {
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.of(managerEntity(7L, 7L)));
        when(dashboardService.getAufstellung(7L)).thenReturn(aufstellung(100L, 200L, 300L));

        ResponseEntity<?> response = dashboardController.getAufstellung(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        AufstellungDto body = (AufstellungDto) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getSpieler()).extracting(SpielerAufstellungDto::getId)
            .containsExactly(100L, 200L, 300L);
    }

    @Test
    void getAufstellung_beforeSeason_admin_returnsFullSpieler() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, UserRole.ADMIN)));
        when(dashboardService.getAufstellung(7L)).thenReturn(aufstellung(100L, 200L, 300L));

        ResponseEntity<?> response = dashboardController.getAufstellung(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        AufstellungDto body = (AufstellungDto) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getSpieler()).extracting(SpielerAufstellungDto::getId)
            .containsExactly(100L, 200L, 300L);
    }

    @Test
    void getAufstellung_hinrunde_hiddenWindow_foreignNonAdmin_removesWinterTransferPlayers() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.of(managerWithTransferPair(7L, 99L)));
        when(dashboardService.getAufstellung(7L)).thenReturn(aufstellung(100L, 101L, 200L, 300L));

        ResponseEntity<?> response = dashboardController.getAufstellung(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        AufstellungDto body = (AufstellungDto) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getSpieler()).extracting(SpielerAufstellungDto::getId)
            .containsExactly(200L, 300L);
    }

    @Test
    void getAufstellung_rueckrunde_foreignNonAdmin_keepsAllSpieler() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.of(managerWithTransferPair(7L, 99L)));
        when(dashboardService.getAufstellung(7L)).thenReturn(aufstellung(100L, 101L, 200L, 300L));

        ResponseEntity<?> response = dashboardController.getAufstellung(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        AufstellungDto body = (AufstellungDto) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getSpieler()).extracting(SpielerAufstellungDto::getId)
            .containsExactly(100L, 101L, 200L, 300L);
    }

    @Test
    void getAufstellung_hinrunde_transferRoundReached_foreignNonAdmin_keepsAllSpieler() {
        when(seasonService.findCurrentSeason())
            .thenReturn(Optional.of(seasonWithRounds(SeasonState.RUNNING_HINRUNDE, 16, 16)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.of(managerWithTransferPair(7L, 99L)));
        when(dashboardService.getAufstellung(7L)).thenReturn(aufstellung(100L, 101L, 200L, 300L));

        ResponseEntity<?> response = dashboardController.getAufstellung(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        AufstellungDto body = (AufstellungDto) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getSpieler()).extracting(SpielerAufstellungDto::getId)
            .containsExactly(100L, 101L, 200L, 300L);
    }

    private User user(Long id, UserRole role) {
        return User.builder().id(id).login("user").role(role).build();
    }
}
