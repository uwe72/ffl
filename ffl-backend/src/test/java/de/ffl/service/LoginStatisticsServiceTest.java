package de.ffl.service;

import de.ffl.dto.LoginStatMonthDto;
import de.ffl.dto.LoginStatUserDto;
import de.ffl.dto.LoginStatisticDto;
import de.ffl.repository.LoginLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoginStatisticsServiceTest {

    @Mock
    private LoginLogRepository loginLogRepository;

    @InjectMocks
    private LoginStatisticsService loginStatisticsService;

    private Object[] row(int year, int month, String login, String firstName, String lastName, long count) {
        return new Object[]{year, month, login, firstName, lastName, count};
    }

    @Test
    void getStatistics_fillsGapsWithZeroAndAggregatesUsers() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 4, 1);
        when(loginLogRepository.countLoginsByUserAndMonth(any(), any())).thenReturn(List.of(
            row(2026, 1, "alice", "Alice", "Muster", 3L),
            row(2026, 1, "bob", "Bob", "Beispiel", 5L),
            row(2026, 3, "alice", "Alice", "Muster", 2L)
        ));

        LoginStatisticDto result = loginStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay());

        assertThat(result.getMonths()).hasSize(3);
        assertThat(result.getMonths().get(0).getYear()).isEqualTo(2026);
        assertThat(result.getMonths().get(0).getMonth()).isEqualTo(1);
        assertThat(result.getMonths().get(0).getTotalLogins()).isEqualTo(8);
        assertThat(result.getMonths().get(0).getUsers()).extracting(LoginStatUserDto::getLogin)
            .containsExactly("bob", "alice");
        assertThat(result.getMonths().get(0).getUsers()).extracting(LoginStatUserDto::getFirstName)
            .containsExactly("Bob", "Alice");
        assertThat(result.getMonths().get(0).getUsers()).extracting(LoginStatUserDto::getLastName)
            .containsExactly("Beispiel", "Muster");
        assertThat(result.getMonths().get(1).getTotalLogins()).isZero();
        assertThat(result.getMonths().get(1).getUsers()).isEmpty();
        assertThat(result.getMonths().get(2).getTotalLogins()).isEqualTo(2);
        assertThat(result.getMonths().get(2).getUsers()).extracting(LoginStatUserDto::getLogin)
            .containsExactly("alice");
    }

    @Test
    void getStatistics_spansYearBoundary() {
        LocalDate from = LocalDate.of(2025, 11, 1);
        LocalDate to = LocalDate.of(2026, 1, 1);
        when(loginLogRepository.countLoginsByUserAndMonth(any(), any())).thenReturn(List.of(
            row(2025, 11, "alice", "Alice", "Muster", 4L),
            row(2025, 12, "bob", "Bob", "Beispiel", 1L)
        ));

        LoginStatisticDto result = loginStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay());

        assertThat(result.getMonths()).hasSize(2);
        assertThat(result.getMonths().get(0).getYear()).isEqualTo(2025);
        assertThat(result.getMonths().get(0).getMonth()).isEqualTo(11);
        assertThat(result.getMonths().get(0).getTotalLogins()).isEqualTo(4);
        assertThat(result.getMonths().get(1).getYear()).isEqualTo(2025);
        assertThat(result.getMonths().get(1).getMonth()).isEqualTo(12);
        assertThat(result.getMonths().get(1).getTotalLogins()).isEqualTo(1);
    }

    @Test
    void getStatistics_emptyRange_returnsEmptyList() {
        when(loginLogRepository.countLoginsByUserAndMonth(any(), any())).thenReturn(List.of());

        LoginStatisticDto result = loginStatisticsService.getStatistics(
            LocalDate.of(2026, 1, 1).atStartOfDay(), LocalDate.of(2026, 2, 1).atStartOfDay());

        assertThat(result.getMonths()).hasSize(1);
        assertThat(result.getMonths().get(0).getTotalLogins()).isZero();
    }
}
