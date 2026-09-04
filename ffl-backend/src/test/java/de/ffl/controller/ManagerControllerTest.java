package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.ManagerDto;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.PointsRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.ManagerGroupService;
import de.ffl.service.ManagerRoundService;
import de.ffl.service.ManagerService;
import de.ffl.service.SeasonService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ManagerControllerTest {

    @Mock
    private ManagerService managerService;

    @Mock
    private ManagerRankRepository managerRankRepository;

    @Mock
    private ManagerRoundService managerRoundService;

    @Mock
    private PointsRepository pointsRepository;

    @Mock
    private ManagerGroupService managerGroupService;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SeasonService seasonService;

    @InjectMocks
    private ManagerController managerController;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authAs(String role) {
        if (role == null) {
            SecurityContextHolder.getContext().setAuthentication(null);
            return;
        }
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("user", "pw",
                List.of(new SimpleGrantedAuthority(role))));
    }

    private Season season(SeasonState state) {
        return Season.builder().id(1L).name("2026/27").seasonState(state).build();
    }

    private Season seasonWithFallback(SeasonState state) {
        return Season.builder().id(1L).name("2026/27").seasonState(state).adminFallbackUser("uwe72").build();
    }

    private User user(Long id, String login, UserRole role) {
        return User.builder().id(id).login(login).role(role).build();
    }

    @Test
    void getManagerById_beforeSeason_nonAdmin_returnsNotFound() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        verifyNoInteractions(managerService);
    }

    @Test
    void getManagerById_beforeSeason_admin_returnsOk() {
        authAs("ROLE_ADMIN");
        ManagerDto dto = new ManagerDto();
        dto.setId(7L);
        when(managerService.findById(7L)).thenReturn(dto);

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(7L);
    }

    @Test
    void getManagerById_runningSeason_nonAdmin_returnsOk() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        ManagerDto dto = new ManagerDto();
        dto.setId(7L);
        when(managerService.findById(7L)).thenReturn(dto);

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getId()).isEqualTo(7L);
    }

    @Test
    void getCurrentManager_normalUser_usesOwnUserId() {
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        ManagerDto dto = new ManagerDto();
        dto.setId(7L);
        when(managerService.findByUserId(7L)).thenReturn(dto);

        ResponseEntity<?> response = managerController.getCurrentManager();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(((ManagerDto) response.getBody()).getId()).isEqualTo(7L);
    }

    @Test
    void getCurrentManager_admin_withFallback_returnsFallbackManager() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(seasonWithFallback(SeasonState.RUNNING_HINRUNDE)));
        when(userRepository.findByLogin("uwe72")).thenReturn(Optional.of(user(99L, "uwe72", UserRole.NORMAL)));
        ManagerDto dto = new ManagerDto();
        dto.setId(42L);
        when(managerService.findByUserId(99L)).thenReturn(dto);

        ResponseEntity<?> response = managerController.getCurrentManager();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(((ManagerDto) response.getBody()).getId()).isEqualTo(42L);
    }

    @Test
    void getCurrentManager_admin_withoutFallback_returnsNotFound() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));

        ResponseEntity<?> response = managerController.getCurrentManager();

        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void getCurrentManager_admin_fallbackUserUnknown_returnsNotFound() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(seasonWithFallback(SeasonState.RUNNING_HINRUNDE)));
        when(userRepository.findByLogin("uwe72")).thenReturn(Optional.empty());

        ResponseEntity<?> response = managerController.getCurrentManager();

        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }
}
