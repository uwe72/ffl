package de.ffl.controller;

import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.GameDto;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.GameImportService;
import de.ffl.service.GameService;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GameControllerTest {

    @Mock
    private GameService gameService;

    @Mock
    private GameImportService gameImportService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SeasonService seasonService;

    @Mock
    private ManagerRepository managerRepository;

    private GameController gameController;

    @BeforeEach
    void setUp() {
        gameController = new GameController(
            gameService, gameImportService,
            new ViewerAccessService(userRepository, seasonService, managerRepository));
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

    private GameDto gameWithFormation() {
        GameDto dto = GameDto.builder()
            .id(1L)
            .name("Spieltag 1")
            .formation("1-4-3-3")
            .formationExtern("<extern>")
            .formationIntern("<intern>")
            .build();
        return dto;
    }

    @Test
    void getAllGames_nonAdmin_formationFieldsAreHidden() {
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(gameService.findAll()).thenReturn(List.of(gameWithFormation()));

        List<GameDto> result = gameController.getAllGames();

        assertThat(result.get(0).getFormation()).isNull();
        assertThat(result.get(0).getFormationExtern()).isNull();
        assertThat(result.get(0).getFormationIntern()).isNull();
    }

    @Test
    void getAllGames_admin_formationFieldsAreKept() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, UserRole.ADMIN)));
        when(gameService.findAll()).thenReturn(List.of(gameWithFormation()));

        List<GameDto> result = gameController.getAllGames();

        assertThat(result.get(0).getFormation()).isEqualTo("1-4-3-3");
        assertThat(result.get(0).getFormationExtern()).isEqualTo("<extern>");
        assertThat(result.get(0).getFormationIntern()).isEqualTo("<intern>");
    }

    @Test
    void getGamesBySeason_nonAdmin_formationFieldsAreHidden() {
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(gameService.findBySeasonId(1L)).thenReturn(List.of(gameWithFormation()));

        List<GameDto> result = gameController.getGamesBySeason(1L);

        assertThat(result.get(0).getFormation()).isNull();
        assertThat(result.get(0).getFormationExtern()).isNull();
        assertThat(result.get(0).getFormationIntern()).isNull();
    }

    @Test
    void getGamesByRound_nonAdmin_formationFieldsAreHidden() {
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(gameService.findByRoundId(1L)).thenReturn(List.of(gameWithFormation()));

        List<GameDto> result = gameController.getGamesByRound(1L);

        assertThat(result.get(0).getFormation()).isNull();
        assertThat(result.get(0).getFormationExtern()).isNull();
        assertThat(result.get(0).getFormationIntern()).isNull();
    }

    @Test
    void getGameById_nonAdmin_formationFieldsAreHidden() {
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, UserRole.NORMAL)));
        when(gameService.findById(1L)).thenReturn(gameWithFormation());

        ResponseEntity<GameDto> response = gameController.getGameById(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getFormation()).isNull();
        assertThat(response.getBody().getFormationExtern()).isNull();
        assertThat(response.getBody().getFormationIntern()).isNull();
    }

    @Test
    void getGameById_admin_formationFieldsAreKept() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, UserRole.ADMIN)));
        when(gameService.findById(1L)).thenReturn(gameWithFormation());

        ResponseEntity<GameDto> response = gameController.getGameById(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getFormation()).isEqualTo("1-4-3-3");
    }
}
