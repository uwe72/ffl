package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.dto.PlayerDto;
import de.ffl.service.PlayerService;
import de.ffl.service.SeasonService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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

    @InjectMocks
    private PlayerController playerController;

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
}
