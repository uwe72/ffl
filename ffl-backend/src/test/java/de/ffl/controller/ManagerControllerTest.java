package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
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
}
