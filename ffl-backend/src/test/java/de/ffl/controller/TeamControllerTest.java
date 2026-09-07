package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.Team;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.PlayerDto;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.TeamRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.PlayerService;
import de.ffl.service.SeasonService;
import de.ffl.service.ViewerAccessService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamControllerTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private PlayerService playerService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SeasonService seasonService;

    @Mock
    private ManagerRepository managerRepository;

    private TeamController teamController;

    @BeforeEach
    void setUp() {
        teamController = new TeamController(
            teamRepository, playerService,
            new ViewerAccessService(userRepository, seasonService, managerRepository));
        existingTeam = Team.builder()
                .id(73L)
                .name("Bayer 04 Leverkusen")
                .shortName("B04")
                .logoXxlUrl("xxl")
                .logoSUrl("s")
                .build();
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

    private User user(Long id, UserRole role) {
        return User.builder().id(id).login("user").role(role).build();
    }

    private PlayerDto playerWithManagerCount(Integer managerCount) {
        PlayerDto dto = new PlayerDto();
        dto.setId(1L);
        dto.setManagerCount(managerCount);
        return dto;
    }

    private Team existingTeam;

    @Test
    void updateTeam_updatesShortNameSloganAndLogoSUrl() {
        when(teamRepository.findById(73L)).thenReturn(Optional.of(existingTeam));
        when(teamRepository.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));

        Team updateData = Team.builder()
                .name("Sollte ignoriert werden")
                .shortName("LEV")
                .slogan("Werkself")
                .logoXxlUrl("neu-xxl")
                .logoSUrl("neu-s")
                .build();

        ResponseEntity<Team> response = teamController.updateTeam(73L, updateData);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        ArgumentCaptor<Team> saved = ArgumentCaptor.forClass(Team.class);
        verify(teamRepository).save(saved.capture());

        Team persisted = saved.getValue();
        assertThat(persisted.getShortName()).isEqualTo("LEV");
        assertThat(persisted.getSlogan()).isEqualTo("Werkself");
        assertThat(persisted.getName()).isEqualTo("Bayer 04 Leverkusen");
        assertThat(persisted.getLogoSUrl()).isEqualTo("neu-s");
        assertThat(persisted.getLogoXxlUrl()).isEqualTo("xxl");
    }

    @Test
    void updateTeam_returnsNotFoundWhenMissing() {
        when(teamRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseEntity<Team> response = teamController.updateTeam(999L, Team.builder().shortName("X").build());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(teamRepository, never()).save(any());
    }

    @Test
    void getPlayersByTeam_beforeSeason_nonAdmin_managerCountIsHidden() {
        when(seasonService.findCurrentSeason())
            .thenReturn(Optional.of(Season.builder().id(1L).seasonState(SeasonState.BEFORE_SEASON).build()));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(teamRepository.existsById(73L)).thenReturn(true);
        when(playerService.findByTeamId(73L)).thenReturn(List.of(playerWithManagerCount(5)));

        ResponseEntity<List<PlayerDto>> response = teamController.getPlayersByTeam(73L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get(0).getManagerCount()).isNull();
    }

    @Test
    void getPlayersByTeam_beforeSeason_admin_managerCountIsKept() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, UserRole.ADMIN)));
        when(teamRepository.existsById(73L)).thenReturn(true);
        when(playerService.findByTeamId(73L)).thenReturn(List.of(playerWithManagerCount(5)));

        ResponseEntity<List<PlayerDto>> response = teamController.getPlayersByTeam(73L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get(0).getManagerCount()).isEqualTo(5);
    }

    @Test
    void getPlayersByTeam_runningSeason_nonAdmin_managerCountIsKept() {
        when(seasonService.findCurrentSeason())
            .thenReturn(Optional.of(Season.builder().id(1L).seasonState(SeasonState.RUNNING_HINRUNDE).build()));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(teamRepository.existsById(73L)).thenReturn(true);
        when(playerService.findByTeamId(73L)).thenReturn(List.of(playerWithManagerCount(5)));

        ResponseEntity<List<PlayerDto>> response = teamController.getPlayersByTeam(73L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get(0).getManagerCount()).isEqualTo(5);
    }
}
