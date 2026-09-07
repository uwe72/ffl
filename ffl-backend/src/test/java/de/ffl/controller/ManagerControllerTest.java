package de.ffl.controller;

import de.ffl.domain.Manager;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.ManagerDto;
import de.ffl.dto.PlayerDto;
import de.ffl.dto.PositionStatsDto;
import de.ffl.dto.RoundDetailDto;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PointsRepository;
import de.ffl.repository.UserRepository;
import de.ffl.service.ManagerGroupService;
import de.ffl.service.ManagerRoundService;
import de.ffl.service.ManagerService;
import de.ffl.service.SeasonService;
import de.ffl.service.ViewerAccessService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

    @Mock
    private ManagerRepository managerRepository;

    private ManagerController managerController;

    @BeforeEach
    void setUp() {
        managerController = new ManagerController(
            managerService, managerRankRepository, managerRoundService, pointsRepository,
            managerGroupService, jdbcTemplate, userRepository, seasonService,
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

    private Season seasonWithFallback(SeasonState state) {
        return Season.builder().id(1L).name("2026/27").seasonState(state).adminFallbackUser("uwe72").build();
    }

    private Season seasonWithRounds(SeasonState state, Integer currentMatchday, Integer startRoundRueckrunde) {
        return Season.builder().id(1L).name("2026/27").seasonState(state)
            .currentMatchday(currentMatchday)
            .startRoundRueckrunde(startRoundRueckrunde)
            .build();
    }

    private User user(Long id, String login, UserRole role) {
        return User.builder().id(id).login(login).role(role).build();
    }

    private Manager managerEntity(Long id, Long userId) {
        return Manager.builder().id(id).user(User.builder().id(userId).login("mgr").build()).build();
    }

    private ManagerDto managerWithTransfers(Long id, Long userId) {
        ManagerDto dto = new ManagerDto();
        dto.setId(id);
        dto.setUserId(userId);
        PlayerDto oldPlayer = new PlayerDto();
        oldPlayer.setId(100L);
        PlayerDto newPlayer = new PlayerDto();
        newPlayer.setId(200L);
        dto.setPlayerExchangedOld1(oldPlayer);
        dto.setPlayerExchangedNew1(newPlayer);
        return dto;
    }

    private RoundDetailDto roundDetailWithManagerCount(Integer managerCount) {
        RoundDetailDto dto = new RoundDetailDto();
        RoundDetailDto.PlayerPointDto pp = new RoundDetailDto.PlayerPointDto();
        pp.setPlayerId(1L);
        pp.setManagerCount(managerCount);
        dto.setPlayerPoints(List.of(pp));
        return dto;
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
    void getManagerById_hinrunde_otherManager_clearsWinterTransfers() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerService.findById(7L)).thenReturn(managerWithTransfers(7L, 99L));

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getPlayerExchangedOld1()).isNull();
        assertThat(response.getBody().getPlayerExchangedNew1()).isNull();
        assertThat(response.getBody().getUserId()).isEqualTo(99L);
    }

    @Test
    void getManagerById_hinrunde_ownManager_keepsWinterTransfers() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.of(managerEntity(7L, 7L)));
        when(managerService.findById(7L)).thenReturn(managerWithTransfers(7L, 7L));

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getPlayerExchangedOld1()).isNotNull();
        assertThat(response.getBody().getPlayerExchangedNew1()).isNotNull();
    }

    @Test
    void getManagerById_hinrunde_admin_withoutFallback_clearsWinterTransfers() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(managerService.findById(7L)).thenReturn(managerWithTransfers(7L, 99L));

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getPlayerExchangedOld1()).isNull();
        assertThat(response.getBody().getPlayerExchangedNew1()).isNull();
    }

    @Test
    void getManagerById_hinrunde_admin_fallbackManager_keepsWinterTransfers() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(seasonWithFallback(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(userRepository.findByLogin("uwe72")).thenReturn(Optional.of(user(99L, "uwe72", UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.of(managerEntity(7L, 99L)));
        when(managerService.findById(7L)).thenReturn(managerWithTransfers(7L, 99L));

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getPlayerExchangedOld1()).isNotNull();
        assertThat(response.getBody().getPlayerExchangedNew1()).isNotNull();
    }

    @Test
    void getManagerById_rueckrunde_otherManager_keepsWinterTransfers() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_USER");
        when(managerService.findById(7L)).thenReturn(managerWithTransfers(7L, 99L));

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getPlayerExchangedOld1()).isNotNull();
        assertThat(response.getBody().getPlayerExchangedNew1()).isNotNull();
    }

    @Test
    void getManagerById_hinrunde_transferRoundReached_otherManager_keepsWinterTransfers() {
        when(seasonService.findCurrentSeason())
            .thenReturn(Optional.of(seasonWithRounds(SeasonState.RUNNING_HINRUNDE, 16, 16)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerService.findById(7L)).thenReturn(managerWithTransfers(7L, 99L));

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getPlayerExchangedOld1()).isNotNull();
        assertThat(response.getBody().getPlayerExchangedNew1()).isNotNull();
    }

    @Test
    void getAllManagers_hinrunde_clearsWinterTransfersForOtherManagers() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerRepository.findById(1L)).thenReturn(Optional.of(managerEntity(1L, 7L)));
        when(managerRepository.findById(2L)).thenReturn(Optional.of(managerEntity(2L, 99L)));
        when(managerService.findAll()).thenReturn(List.of(
            managerWithTransfers(1L, 7L),
            managerWithTransfers(2L, 99L)
        ));

        List<ManagerDto> result = managerController.getAllManagers();

        assertThat(result.get(0).getPlayerExchangedOld1()).isNotNull();
        assertThat(result.get(0).getPlayerExchangedNew1()).isNotNull();
        assertThat(result.get(1).getPlayerExchangedOld1()).isNull();
        assertThat(result.get(1).getPlayerExchangedNew1()).isNull();
    }

    @Test
    void clearWinterTransfers_returnsUpdatedManager() {
        authAs("ROLE_ADMIN");
        ManagerDto dto = new ManagerDto();
        dto.setId(7L);
        when(managerService.clearWinterTransfers(7L)).thenReturn(dto);

        ResponseEntity<?> response = managerController.clearWinterTransfers(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(((ManagerDto) response.getBody()).getId()).isEqualTo(7L);
    }

    @Test
    void clearWinterTransfers_unknownManager_returnsBadRequest() {
        authAs("ROLE_ADMIN");
        when(managerService.clearWinterTransfers(99L)).thenThrow(new IllegalArgumentException("Manager nicht gefunden"));

        ResponseEntity<?> response = managerController.clearWinterTransfers(99L);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
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

    @Test
    void getAllManagers_nonAdmin_visitCountIsCleared() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        ManagerDto dto = new ManagerDto();
        dto.setId(1L);
        dto.setVisitCount(5);
        when(managerService.findAll()).thenReturn(List.of(dto));

        List<ManagerDto> result = managerController.getAllManagers();

        assertThat(result.get(0).getVisitCount()).isNull();
    }

    @Test
    void getAllManagers_admin_visitCountIsKept() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        ManagerDto dto = new ManagerDto();
        dto.setId(1L);
        dto.setVisitCount(5);
        when(managerService.findAll()).thenReturn(List.of(dto));

        List<ManagerDto> result = managerController.getAllManagers();

        assertThat(result.get(0).getVisitCount()).isEqualTo(5);
    }

    @Test
    void getManagerById_nonAdmin_visitCountIsCleared() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        ManagerDto dto = new ManagerDto();
        dto.setId(7L);
        dto.setVisitCount(5);
        when(managerService.findById(7L)).thenReturn(dto);

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getVisitCount()).isNull();
    }

    @Test
    void getCurrentManager_normalUser_visitCountIsCleared() {
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        ManagerDto dto = new ManagerDto();
        dto.setId(7L);
        dto.setVisitCount(5);
        when(managerService.findByUserId(7L)).thenReturn(dto);

        ResponseEntity<?> response = managerController.getCurrentManager();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(((ManagerDto) response.getBody()).getVisitCount()).isNull();
    }

    @Test
    void getAllManagers_nonAdmin_otherManagerEmailIsCleared() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        ManagerDto dto = new ManagerDto();
        dto.setId(1L);
        dto.setUserId(99L);
        dto.setEmail("other@example.com");
        when(managerService.findAll()).thenReturn(List.of(dto));

        List<ManagerDto> result = managerController.getAllManagers();

        assertThat(result.get(0).getEmail()).isNull();
    }

    @Test
    void getAllManagers_nonAdmin_ownManagerEmailIsKept() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        ManagerDto dto = new ManagerDto();
        dto.setId(1L);
        dto.setUserId(7L);
        dto.setEmail("own@example.com");
        when(managerService.findAll()).thenReturn(List.of(dto));

        List<ManagerDto> result = managerController.getAllManagers();

        assertThat(result.get(0).getEmail()).isEqualTo("own@example.com");
    }

    @Test
    void getAllManagers_admin_emailIsKept() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        ManagerDto dto = new ManagerDto();
        dto.setId(1L);
        dto.setUserId(99L);
        dto.setEmail("other@example.com");
        when(managerService.findAll()).thenReturn(List.of(dto));

        List<ManagerDto> result = managerController.getAllManagers();

        assertThat(result.get(0).getEmail()).isEqualTo("other@example.com");
    }

    @Test
    void getManagerById_nonAdmin_otherManagerEmailIsCleared() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        ManagerDto dto = new ManagerDto();
        dto.setId(7L);
        dto.setUserId(99L);
        dto.setEmail("other@example.com");
        when(managerService.findById(7L)).thenReturn(dto);

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getEmail()).isNull();
    }

    @Test
    void getManagerById_nonAdmin_ownManagerEmailIsKept() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_RUECKRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        ManagerDto dto = new ManagerDto();
        dto.setId(7L);
        dto.setUserId(7L);
        dto.setEmail("own@example.com");
        when(managerService.findById(7L)).thenReturn(dto);

        ResponseEntity<ManagerDto> response = managerController.getManagerById(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getEmail()).isEqualTo("own@example.com");
    }

    @Test
    void getManagerRoundDetails_beforeSeason_foreignNonAdmin_returns403() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.empty());

        ResponseEntity<?> response = managerController.getManagerRoundDetails(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(managerRoundService);
    }

    @Test
    void getManagerRoundDetails_beforeSeason_ownNonAdmin_returnsDetailsWithHiddenManagerCount() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.of(managerEntity(7L, 7L)));
        when(managerRoundService.getRoundDetailsForManager(7L)).thenReturn(List.of(roundDetailWithManagerCount(3)));

        ResponseEntity<?> response = managerController.getManagerRoundDetails(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        @SuppressWarnings("unchecked")
        List<RoundDetailDto> details = (List<RoundDetailDto>) response.getBody();
        assertThat(details).isNotNull();
        assertThat(details.get(0).getPlayerPoints().get(0).getManagerCount()).isNull();
    }

    @Test
    void getManagerRoundDetails_beforeSeason_admin_returnsDetailsWithManagerCount() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(managerRoundService.getRoundDetailsForManager(7L)).thenReturn(List.of(roundDetailWithManagerCount(3)));

        ResponseEntity<?> response = managerController.getManagerRoundDetails(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        @SuppressWarnings("unchecked")
        List<RoundDetailDto> details = (List<RoundDetailDto>) response.getBody();
        assertThat(details).isNotNull();
        assertThat(details.get(0).getPlayerPoints().get(0).getManagerCount()).isEqualTo(3);
    }

    @Test
    void getManagerRoundDetails_runningSeason_nonAdmin_returnsManagerCount() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerRoundService.getRoundDetailsForManager(7L)).thenReturn(List.of(roundDetailWithManagerCount(3)));

        ResponseEntity<?> response = managerController.getManagerRoundDetails(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        @SuppressWarnings("unchecked")
        List<RoundDetailDto> details = (List<RoundDetailDto>) response.getBody();
        assertThat(details).isNotNull();
        assertThat(details.get(0).getPlayerPoints().get(0).getManagerCount()).isEqualTo(3);
    }

    @Test
    void getCurrentPlayers_beforeSeason_foreignNonAdmin_returns403() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.empty());

        ResponseEntity<?> response = managerController.getCurrentPlayers(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(managerRoundService);
    }

    @Test
    void getCurrentPlayers_beforeSeason_ownNonAdmin_hidesManagerCount() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.of(managerEntity(7L, 7L)));
        when(managerRoundService.getCurrentPlayersForManager(7L)).thenReturn(List.of(playerPointWithManagerCount(3)));

        ResponseEntity<?> response = managerController.getCurrentPlayers(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        @SuppressWarnings("unchecked")
        List<RoundDetailDto.PlayerPointDto> players = (List<RoundDetailDto.PlayerPointDto>) response.getBody();
        assertThat(players).isNotNull();
        assertThat(players.get(0).getManagerCount()).isNull();
    }

    @Test
    void getCurrentPlayers_beforeSeason_admin_keepsManagerCount() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(managerRoundService.getCurrentPlayersForManager(7L)).thenReturn(List.of(playerPointWithManagerCount(3)));

        ResponseEntity<?> response = managerController.getCurrentPlayers(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        @SuppressWarnings("unchecked")
        List<RoundDetailDto.PlayerPointDto> players = (List<RoundDetailDto.PlayerPointDto>) response.getBody();
        assertThat(players).isNotNull();
        assertThat(players.get(0).getManagerCount()).isEqualTo(3);
    }

    private RoundDetailDto.PlayerPointDto playerPointWithManagerCount(Integer managerCount) {
        RoundDetailDto.PlayerPointDto pp = new RoundDetailDto.PlayerPointDto();
        pp.setPlayerId(1L);
        pp.setManagerCount(managerCount);
        return pp;
    }

    private ManagerDto managerWithSquad(Long id, Long userId) {
        ManagerDto dto = new ManagerDto();
        dto.setId(id);
        dto.setUserId(userId);
        dto.setName("Manager " + id);
        dto.setPlayerGoalkeeper(new PlayerDto());
        dto.setPlayerDefender1(new PlayerDto());
        dto.setPlayerDefender2(new PlayerDto());
        dto.setPlayerDefender3(new PlayerDto());
        dto.setPlayerMidfield1(new PlayerDto());
        dto.setPlayerMidfield2(new PlayerDto());
        dto.setPlayerMidfield3(new PlayerDto());
        dto.setPlayerStriker1(new PlayerDto());
        dto.setPlayerStriker2(new PlayerDto());
        dto.setPlayerStriker3(new PlayerDto());
        dto.setPlayerFreeChoice(new PlayerDto());
        dto.setTeamValue(1000);
        return dto;
    }

    private void assertSquadHidden(ManagerDto manager) {
        assertThat(manager.getPlayerGoalkeeper()).isNull();
        assertThat(manager.getPlayerDefender1()).isNull();
        assertThat(manager.getPlayerDefender2()).isNull();
        assertThat(manager.getPlayerDefender3()).isNull();
        assertThat(manager.getPlayerMidfield1()).isNull();
        assertThat(manager.getPlayerMidfield2()).isNull();
        assertThat(manager.getPlayerMidfield3()).isNull();
        assertThat(manager.getPlayerStriker1()).isNull();
        assertThat(manager.getPlayerStriker2()).isNull();
        assertThat(manager.getPlayerStriker3()).isNull();
        assertThat(manager.getPlayerFreeChoice()).isNull();
        assertThat(manager.getTeamValue()).isNull();
    }

    private void assertSquadVisible(ManagerDto manager) {
        assertThat(manager.getPlayerGoalkeeper()).isNotNull();
        assertThat(manager.getPlayerDefender1()).isNotNull();
        assertThat(manager.getPlayerStriker3()).isNotNull();
        assertThat(manager.getPlayerFreeChoice()).isNotNull();
        assertThat(manager.getTeamValue()).isEqualTo(1000);
    }

    @Test
    void getAllManagers_beforeSeason_nonAdmin_hidesSquads() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerService.findAll()).thenReturn(List.of(managerWithSquad(1L, 7L), managerWithSquad(2L, 8L)));

        List<ManagerDto> managers = managerController.getAllManagers();

        assertThat(managers).hasSize(2);
        for (ManagerDto manager : managers) {
            assertSquadHidden(manager);
            assertThat(manager.getName()).isNotNull();
        }
    }

    @Test
    void getAllManagers_beforeSeason_admin_keepsSquads() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(managerService.findAll()).thenReturn(List.of(managerWithSquad(1L, 7L)));

        List<ManagerDto> managers = managerController.getAllManagers();

        assertThat(managers).hasSize(1);
        assertSquadVisible(managers.get(0));
    }

    @Test
    void getAllManagers_runningSeason_nonAdmin_keepsSquads() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerService.findAll()).thenReturn(List.of(managerWithSquad(1L, 7L)));

        List<ManagerDto> managers = managerController.getAllManagers();

        assertThat(managers).hasSize(1);
        assertSquadVisible(managers.get(0));
    }

    @Test
    void getManagersBySeason_beforeSeason_nonAdmin_hidesSquads() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerService.findBySeasonId(1L)).thenReturn(List.of(managerWithSquad(1L, 7L)));

        List<ManagerDto> managers = managerController.getManagersBySeason(1L);

        assertThat(managers).hasSize(1);
        assertSquadHidden(managers.get(0));
        assertThat(managers.get(0).getName()).isNotNull();
    }

    @Test
    void getManagersBySeason_beforeSeason_admin_keepsSquads() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(managerService.findBySeasonId(1L)).thenReturn(List.of(managerWithSquad(1L, 7L)));

        List<ManagerDto> managers = managerController.getManagersBySeason(1L);

        assertThat(managers).hasSize(1);
        assertSquadVisible(managers.get(0));
    }

    @Test
    void getManagerPositionStats_beforeSeason_foreignNonAdmin_returns403() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.BEFORE_SEASON)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.empty());

        ResponseEntity<?> response = managerController.getManagerPositionStats(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(managerService);
    }

    @Test
    void getManagerPositionStats_beforeSeason_ownNonAdmin_returnsStats() {
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerRepository.findById(7L)).thenReturn(Optional.of(managerEntity(7L, 7L)));
        when(managerService.getPositionStatsForManager(7L)).thenReturn(new PositionStatsDto());

        ResponseEntity<?> response = managerController.getManagerPositionStats(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isInstanceOf(PositionStatsDto.class);
    }

    @Test
    void getManagerPositionStats_beforeSeason_admin_returnsStats() {
        authAs("ROLE_ADMIN");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(1L, "user", UserRole.ADMIN)));
        when(managerService.getPositionStatsForManager(7L)).thenReturn(new PositionStatsDto());

        ResponseEntity<?> response = managerController.getManagerPositionStats(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isInstanceOf(PositionStatsDto.class);
    }

    @Test
    void getManagerPositionStats_runningSeason_nonAdmin_returnsStats() {
        when(seasonService.findCurrentSeason()).thenReturn(Optional.of(season(SeasonState.RUNNING_HINRUNDE)));
        authAs("ROLE_USER");
        when(userRepository.findByLogin("user")).thenReturn(Optional.of(user(7L, "user", UserRole.NORMAL)));
        when(managerService.getPositionStatsForManager(7L)).thenReturn(new PositionStatsDto());

        ResponseEntity<?> response = managerController.getManagerPositionStats(7L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isInstanceOf(PositionStatsDto.class);
    }

    @Test
    void createManager_returnsManagerDto() {
        authAs("ROLE_ADMIN");
        when(managerService.createManager(org.mockito.ArgumentMatchers.any(Manager.class)))
            .thenReturn(managerEntity(7L, 42L));

        ResponseEntity<?> response = managerController.createManager(new Manager());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isInstanceOf(ManagerDto.class);
        ManagerDto dto = (ManagerDto) response.getBody();
        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(7L);
        assertThat(dto.getUserId()).isEqualTo(42L);
        assertThat(dto.getLogin()).isEqualTo("mgr");
    }

    @Test
    void updateManager_returnsManagerDto() {
        authAs("ROLE_ADMIN");
        when(managerService.updateManager(org.mockito.ArgumentMatchers.any(Manager.class)))
            .thenReturn(managerEntity(7L, 42L));

        ResponseEntity<?> response = managerController.updateManager(7L, new Manager());

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isInstanceOf(ManagerDto.class);
        ManagerDto dto = (ManagerDto) response.getBody();
        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(7L);
        assertThat(dto.getUserId()).isEqualTo(42L);
        assertThat(dto.getLogin()).isEqualTo("mgr");
    }
}
