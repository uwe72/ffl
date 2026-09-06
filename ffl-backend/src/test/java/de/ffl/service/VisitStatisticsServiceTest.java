package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.dto.VisitStatUserDto;
import de.ffl.dto.VisitStatisticDto;
import de.ffl.repository.UserRepository;
import de.ffl.repository.VisitLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VisitStatisticsServiceTest {

    @Mock
    private VisitLogRepository visitLogRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private VisitStatisticsService visitStatisticsService;

    private Object[] row(int year, int month, String login, String firstName, String lastName, long count) {
        return new Object[]{year, month, login, firstName, lastName, count};
    }

    private User user(Long id, String login, Integer visitCount) {
        return User.builder().id(id).login(login).visitCount(visitCount).build();
    }

    @Test
    void recordVisit_newDay_insertsVisitAndIncrementsCounter() {
        User user = user(1L, "alice", 5);
        when(visitLogRepository.insertVisitIfAbsent(1L, LocalDate.now())).thenReturn(1);

        visitStatisticsService.recordVisit(user);

        verify(userRepository).save(user);
        assertThat(user.getVisitCount()).isEqualTo(6);
    }

    @Test
    void recordVisit_nullCounter_startsAtOne() {
        User user = user(1L, "alice", null);
        when(visitLogRepository.insertVisitIfAbsent(1L, LocalDate.now())).thenReturn(1);

        visitStatisticsService.recordVisit(user);

        verify(userRepository).save(user);
        assertThat(user.getVisitCount()).isEqualTo(1);
    }

    @Test
    void recordVisit_sameDayAgain_doesNotIncrement() {
        User user = user(1L, "alice", 5);
        when(visitLogRepository.insertVisitIfAbsent(1L, LocalDate.now())).thenReturn(0);

        visitStatisticsService.recordVisit(user);

        verify(userRepository, never()).save(any());
        assertThat(user.getVisitCount()).isEqualTo(5);
    }

    @Test
    void recordVisit_dbError_isSwallowed() {
        User user = user(1L, "alice", 5);
        when(visitLogRepository.insertVisitIfAbsent(1L, LocalDate.now()))
            .thenThrow(new RuntimeException("db down"));

        visitStatisticsService.recordVisit(user);

        verify(userRepository, never()).save(any());
        assertThat(user.getVisitCount()).isEqualTo(5);
    }

    @Test
    void getStatistics_aggregatesVisitsPerUserAndMonth() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 3, 1);
        when(visitLogRepository.countVisitsByUserAndMonth(from, to)).thenReturn(List.of(
            row(2026, 1, "alice", "Alice", "Muster", 12L),
            row(2026, 1, "bob", "Bob", "Beispiel", 4L),
            row(2026, 2, "alice", "Alice", "Muster", 8L)
        ));

        VisitStatisticDto result = visitStatisticsService.getStatistics(from, to);

        assertThat(result.getMonths()).hasSize(2);
        assertThat(result.getMonths().get(0).getTotalVisits()).isEqualTo(16);
        assertThat(result.getMonths().get(0).getUsers()).extracting(VisitStatUserDto::getLogin)
            .containsExactly("alice", "bob");
        assertThat(result.getMonths().get(0).getUsers().get(0).getVisits()).isEqualTo(12);
        assertThat(result.getMonths().get(1).getTotalVisits()).isEqualTo(8);
    }

    @Test
    void getStatistics_fillsGapsWithZeroAndAggregatesUsers() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 4, 1);
        when(visitLogRepository.countVisitsByUserAndMonth(from, to)).thenReturn(List.of(
            row(2026, 1, "alice", "Alice", "Muster", 3L),
            row(2026, 1, "bob", "Bob", "Beispiel", 5L),
            row(2026, 3, "alice", "Alice", "Muster", 2L)
        ));

        VisitStatisticDto result = visitStatisticsService.getStatistics(from, to);

        assertThat(result.getMonths()).hasSize(3);
        assertThat(result.getMonths().get(0).getYear()).isEqualTo(2026);
        assertThat(result.getMonths().get(0).getMonth()).isEqualTo(1);
        assertThat(result.getMonths().get(0).getTotalVisits()).isEqualTo(8);
        assertThat(result.getMonths().get(0).getUsers()).extracting(VisitStatUserDto::getLogin)
            .containsExactly("bob", "alice");
        assertThat(result.getMonths().get(0).getUsers()).extracting(VisitStatUserDto::getFirstName)
            .containsExactly("Bob", "Alice");
        assertThat(result.getMonths().get(0).getUsers()).extracting(VisitStatUserDto::getLastName)
            .containsExactly("Beispiel", "Muster");
        assertThat(result.getMonths().get(1).getTotalVisits()).isZero();
        assertThat(result.getMonths().get(1).getUsers()).isEmpty();
        assertThat(result.getMonths().get(2).getTotalVisits()).isEqualTo(2);
        assertThat(result.getMonths().get(2).getUsers()).extracting(VisitStatUserDto::getLogin)
            .containsExactly("alice");
    }

    @Test
    void getStatistics_spansYearBoundary() {
        LocalDate from = LocalDate.of(2025, 11, 1);
        LocalDate to = LocalDate.of(2026, 1, 1);
        when(visitLogRepository.countVisitsByUserAndMonth(from, to)).thenReturn(List.of(
            row(2025, 11, "alice", "Alice", "Muster", 4L),
            row(2025, 12, "bob", "Bob", "Beispiel", 1L)
        ));

        VisitStatisticDto result = visitStatisticsService.getStatistics(from, to);

        assertThat(result.getMonths()).hasSize(2);
        assertThat(result.getMonths().get(0).getYear()).isEqualTo(2025);
        assertThat(result.getMonths().get(0).getMonth()).isEqualTo(11);
        assertThat(result.getMonths().get(0).getTotalVisits()).isEqualTo(4);
        assertThat(result.getMonths().get(1).getYear()).isEqualTo(2025);
        assertThat(result.getMonths().get(1).getMonth()).isEqualTo(12);
        assertThat(result.getMonths().get(1).getTotalVisits()).isEqualTo(1);
    }

    @Test
    void getStatistics_emptyRange_returnsEmptyList() {
        when(visitLogRepository.countVisitsByUserAndMonth(any(), any())).thenReturn(List.of());

        VisitStatisticDto result = visitStatisticsService.getStatistics(
            LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1));

        assertThat(result.getMonths()).hasSize(1);
        assertThat(result.getMonths().get(0).getTotalVisits()).isZero();
    }
}
