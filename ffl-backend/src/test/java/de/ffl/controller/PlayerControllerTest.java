package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.PlayerDto;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.PlayerService;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlayerControllerTest {

    @Mock
    private PlayerService playerService;

    @Mock
    private SeasonService seasonService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ManagerRepository managerRepository;

    private PlayerController playerController;

    @BeforeEach
    void setUp() {
        playerController = new PlayerController(
            playerService, seasonService,
            new ViewerAccessService(userRepository, seasonService, managerRepository));
    }

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

    private PlayerDto playerWithManagerCount(Integer managerCount) {
        PlayerDto dto = new PlayerDto();
        dto.setId(866L);
        dto.setManagerCount(managerCount);
        return dto;
    }

    @Test
    void getPlayerById_beforeSeason_nonAdmin_returnsNotFound() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");

        ResponseEntity<PlayerDto> response = playerController.getPlayerById(866L);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        verifyNoInteractions(playerService);
    }

    @Test
    void getPlayerById_beforeSeason_admin_returnsOk() {
        authAs("ROLE_ADMIN");
        PlayerDto dto = new PlayerDto();
        dto.setId(866L);
        when(playerService.findByIdWithManagers(866L)).thenReturn(dto);

        ResponseEntity<PlayerDto> response = playerController.getPlayerById(866L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(866L);
    }

    @Test
    void getPlayerById_runningSeason_nonAdmin_returnsOk() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        PlayerDto dto = new PlayerDto();
        dto.setId(866L);
        when(playerService.findByIdWithManagers(866L)).thenReturn(dto);

        ResponseEntity<PlayerDto> response = playerController.getPlayerById(866L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getId()).isEqualTo(866L);
    }

    @Test
    void getAllPlayers_beforeSeason_nonAdmin_managerCountIsHidden() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(playerService.findAll()).thenReturn(List.of(playerWithManagerCount(5)));

        List<PlayerDto> result = playerController.getAllPlayers();

        assertThat(result.get(0).getManagerCount()).isNull();
    }

    @Test
    void getAllPlayers_beforeSeason_admin_managerCountIsKept() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, UserRole.ADMIN)));
        when(playerService.findAll()).thenReturn(List.of(playerWithManagerCount(5)));

        List<PlayerDto> result = playerController.getAllPlayers();

        assertThat(result.get(0).getManagerCount()).isEqualTo(5);
    }

    @Test
    void getAllPlayers_runningSeason_nonAdmin_managerCountIsKept() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(playerService.findAll()).thenReturn(List.of(playerWithManagerCount(5)));

        List<PlayerDto> result = playerController.getAllPlayers();

        assertThat(result.get(0).getManagerCount()).isEqualTo(5);
    }

    @Test
    void getPlayersBySeason_beforeSeason_nonAdmin_managerCountIsHidden() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(playerService.findBySeasonId(1L)).thenReturn(List.of(playerWithManagerCount(5)));

        List<PlayerDto> result = playerController.getPlayersBySeason(1L);

        assertThat(result.get(0).getManagerCount()).isNull();
    }

    private User user(Long id, UserRole role) {
        return User.builder().id(id).login("user").role(role).build();
    }
}
