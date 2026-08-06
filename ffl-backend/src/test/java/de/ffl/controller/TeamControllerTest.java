package de.ffl.controller;

import de.ffl.domain.Team;
import de.ffl.repository.TeamRepository;
import de.ffl.service.PlayerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

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

    @InjectMocks
    private TeamController teamController;

    private Team existingTeam;

    @BeforeEach
    void setUp() {
        existingTeam = Team.builder()
                .id(73L)
                .name("Bayer 04 Leverkusen")
                .shortName("B04")
                .logoXxlUrl("xxl")
                .logoSUrl("s")
                .build();
    }

    @Test
    void updateTeam_updatesOnlyShortName() {
        when(teamRepository.findById(73L)).thenReturn(Optional.of(existingTeam));
        when(teamRepository.save(any(Team.class))).thenAnswer(inv -> inv.getArgument(0));

        Team updateData = Team.builder()
                .name("Sollte ignoriert werden")
                .shortName("LEV")
                .logoXxlUrl("neu-xxl")
                .logoSUrl("neu-s")
                .build();

        ResponseEntity<Team> response = teamController.updateTeam(73L, updateData);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        ArgumentCaptor<Team> saved = ArgumentCaptor.forClass(Team.class);
        verify(teamRepository).save(saved.capture());

        Team persisted = saved.getValue();
        assertThat(persisted.getShortName()).isEqualTo("LEV");
        assertThat(persisted.getName()).isEqualTo("Bayer 04 Leverkusen");
        assertThat(persisted.getLogoXxlUrl()).isEqualTo("xxl");
        assertThat(persisted.getLogoSUrl()).isEqualTo("s");
    }

    @Test
    void updateTeam_returnsNotFoundWhenMissing() {
        when(teamRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseEntity<Team> response = teamController.updateTeam(999L, Team.builder().shortName("X").build());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(teamRepository, never()).save(any());
    }
}
