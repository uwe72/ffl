package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.dto.InstallStatMonthDto;
import de.ffl.dto.InstallStatUserDto;
import de.ffl.dto.InstallStatisticDto;
import de.ffl.repository.PwaInstallClickRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InstallStatisticsServiceTest {

    @Mock
    private PwaInstallClickRepository pwaInstallClickRepository;

    @InjectMocks
    private InstallStatisticsService installStatisticsService;

    private Object[] row(int year, int month, String login, String firstName, String lastName, long count) {
        return new Object[]{year, month, login, firstName, lastName, count};
    }

    @Test
    void recordClick_savesClickForUser() {
        User user = User.builder().login("alice").build();

        installStatisticsService.recordClick(user);

        verify(pwaInstallClickRepository).save(any());
    }

    @Test
    void getStatistics_fillsGapsWithZeroAndAggregatesUsers() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 4, 1);
        when(pwaInstallClickRepository.countClicksByUserAndMonth(any(), any())).thenReturn(List.of(
            row(2026, 1, "alice", "Alice", "Muster", 3L),
            row(2026, 1, "bob", "Bob", "Beispiel", 5L),
            row(2026, 3, "alice", "Alice", "Muster", 2L)
        ));

        InstallStatisticDto result = installStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay());

        assertThat(result.getMonths()).hasSize(3);
        assertThat(result.getMonths().get(0).getYear()).isEqualTo(2026);
        assertThat(result.getMonths().get(0).getMonth()).isEqualTo(1);
        assertThat(result.getMonths().get(0).getTotalClicks()).isEqualTo(8);
        assertThat(result.getMonths().get(0).getUsers()).extracting(InstallStatUserDto::getLogin)
            .containsExactly("bob", "alice");
        assertThat(result.getMonths().get(0).getUsers()).extracting(InstallStatUserDto::getFirstName)
            .containsExactly("Bob", "Alice");
        assertThat(result.getMonths().get(0).getUsers()).extracting(InstallStatUserDto::getLastName)
            .containsExactly("Beispiel", "Muster");
        assertThat(result.getMonths().get(1).getTotalClicks()).isZero();
        assertThat(result.getMonths().get(1).getUsers()).isEmpty();
        assertThat(result.getMonths().get(2).getTotalClicks()).isEqualTo(2);
        assertThat(result.getMonths().get(2).getUsers()).extracting(InstallStatUserDto::getLogin)
            .containsExactly("alice");
    }

    @Test
    void getStatistics_spansYearBoundary() {
        LocalDate from = LocalDate.of(2025, 11, 1);
        LocalDate to = LocalDate.of(2026, 1, 1);
        when(pwaInstallClickRepository.countClicksByUserAndMonth(any(), any())).thenReturn(List.of(
            row(2025, 11, "alice", "Alice", "Muster", 4L),
            row(2025, 12, "bob", "Bob", "Beispiel", 1L)
        ));

        InstallStatisticDto result = installStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay());

        assertThat(result.getMonths()).hasSize(2);
        assertThat(result.getMonths().get(0).getYear()).isEqualTo(2025);
        assertThat(result.getMonths().get(0).getMonth()).isEqualTo(11);
        assertThat(result.getMonths().get(0).getTotalClicks()).isEqualTo(4);
        assertThat(result.getMonths().get(1).getYear()).isEqualTo(2025);
        assertThat(result.getMonths().get(1).getMonth()).isEqualTo(12);
        assertThat(result.getMonths().get(1).getTotalClicks()).isEqualTo(1);
    }

    @Test
    void getStatistics_emptyRange_returnsEmptyList() {
        when(pwaInstallClickRepository.countClicksByUserAndMonth(any(), any())).thenReturn(List.of());

        InstallStatisticDto result = installStatisticsService.getStatistics(
            LocalDate.of(2026, 1, 1).atStartOfDay(), LocalDate.of(2026, 2, 1).atStartOfDay());

        assertThat(result.getMonths()).hasSize(1);
        assertThat(result.getMonths().get(0).getTotalClicks()).isZero();
    }
}
