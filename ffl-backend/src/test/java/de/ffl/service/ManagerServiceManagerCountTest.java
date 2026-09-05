package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.Player;
import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.repository.ManagerRankRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.PlayerRankRepository;
import de.ffl.repository.PlayerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import de.ffl.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ManagerServiceManagerCountTest {

    @Mock
    private ManagerRepository managerRepository;

    @Mock
    private PlayerRepository playerRepository;

    @Mock
    private SeasonRepository seasonRepository;

    @Mock
    private PlayerRankRepository playerRankRepository;

    @Mock
    private ManagerRankRepository managerRankRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TeamChangeMailService teamChangeMailService;

    @Mock
    private SystemConfigRepository systemConfigRepository;

    @Mock
    private PaymentReminderService paymentReminderService;

    @Mock
    private FriendTeamService friendTeamService;

    @InjectMocks
    private ManagerService managerService;

    private Player player(Long id, String nameKicker) {
        return Player.builder()
            .id(id)
            .nameKicker(nameKicker)
            .prize(1_000_000)
            .build();
    }

    @Test
    void findById_setsManagerCountOnSquadPlayers() {
        Season season = Season.builder()
            .id(1L)
            .name("2026/27")
            .seasonState(SeasonState.RUNNING_HINRUNDE)
            .build();

        Player goalkeeper = player(1L, "Keeper");
        Player striker = player(2L, "Stürmer");
        Player freeChoice = player(3L, "Frei");

        Manager manager = Manager.builder()
            .id(7L)
            .season(season)
            .playerGoalkeeper(goalkeeper)
            .playerStriker1(striker)
            .playerFreeChoice(freeChoice)
            .build();

        when(managerRepository.findById(7L)).thenReturn(java.util.Optional.of(manager));
        when(playerRankRepository.findByPlayerIdIn(anyList())).thenReturn(List.of());
        when(managerRankRepository.findByManagerIdIn(anyList())).thenReturn(List.of());
        when(managerRepository.countManagersByPlayerIdIn(anyList())).thenReturn(List.of(
            new Object[]{1L, 3L},
            new Object[]{2L, 1L}
        ));

        de.ffl.dto.ManagerDto dto = managerService.findById(7L);

        assertThat(dto.getPlayerGoalkeeper().getManagerCount()).isEqualTo(3);
        assertThat(dto.getPlayerStriker1().getManagerCount()).isEqualTo(1);
        assertThat(dto.getPlayerFreeChoice().getManagerCount()).isZero();
    }
}
