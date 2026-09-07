package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.domain.VisitTimelineGranularity;
import de.ffl.dto.VisitStatUserDto;
import de.ffl.dto.VisitStatisticDto;
import de.ffl.dto.VisitTimelineDto;
import de.ffl.repository.UserRepository;
import de.ffl.repository.VisitLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Date;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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

    private Object[] timelineRow(LocalDate periodStart, long visits, long managers) {
        return new Object[]{Date.valueOf(periodStart), visits, managers};
    }

    @Test
    void getTimeline_day_fillsSixtyBucketsIncludingTodayAndZeroGaps() {
        LocalDate today = LocalDate.now();
        when(visitLogRepository.countVisitsByPeriod(eq("day"), any(), any())).thenReturn(java.util.Collections.singletonList(
            timelineRow(today, 7L, 3L)
        ));
        when(userRepository.countByRole(UserRole.NORMAL)).thenReturn(12L);

        VisitTimelineDto result = visitStatisticsService.getTimeline(VisitTimelineGranularity.DAY);

        assertThat(result.getGranularity()).isEqualTo("DAY");
        assertThat(result.getTotalManagers()).isEqualTo(12L);
        assertThat(result.getBuckets()).hasSize(60);
        assertThat(result.getBuckets().get(0).getPeriodStart()).isEqualTo(today.minusDays(59));
        assertThat(result.getBuckets().get(59).getPeriodStart()).isEqualTo(today);
        assertThat(result.getBuckets().get(59).getVisits()).isEqualTo(7L);
        assertThat(result.getBuckets().get(59).getDistinctManagers()).isEqualTo(3L);
        assertThat(result.getBuckets().get(58).getVisits()).isZero();
        assertThat(result.getBuckets().get(58).getDistinctManagers()).isZero();
        verify(visitLogRepository).countVisitsByPeriod("day", today.minusDays(59), today.plusDays(1));
    }

    @Test
    void getTimeline_week_aggregatesAcrossDaysOnMondayAlignedBuckets() {
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        when(visitLogRepository.countVisitsByPeriod(eq("week"), any(), any())).thenReturn(java.util.Arrays.asList(
            timelineRow(monday, 30L, 11L),
            timelineRow(monday.minusWeeks(1), 4L, 2L)
        ));
        when(userRepository.countByRole(UserRole.NORMAL)).thenReturn(15L);

        VisitTimelineDto result = visitStatisticsService.getTimeline(VisitTimelineGranularity.WEEK);

        assertThat(result.getBuckets()).hasSize(26);
        assertThat(result.getBuckets().get(0).getPeriodStart()).isEqualTo(monday.minusWeeks(25));
        assertThat(result.getBuckets().get(24).getPeriodStart()).isEqualTo(monday.minusWeeks(1));
        assertThat(result.getBuckets().get(24).getVisits()).isEqualTo(4L);
        assertThat(result.getBuckets().get(24).getDistinctManagers()).isEqualTo(2L);
        assertThat(result.getBuckets().get(25).getPeriodStart()).isEqualTo(monday);
        assertThat(result.getBuckets().get(25).getVisits()).isEqualTo(30L);
        assertThat(result.getBuckets().get(25).getDistinctManagers()).isEqualTo(11L);
        assertThat(result.getBuckets().get(23).getVisits()).isZero();
    }

    @Test
    void getTimeline_month_fillsTwentyFourBucketsWithGap() {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        when(visitLogRepository.countVisitsByPeriod(eq("month"), any(), any())).thenReturn(java.util.Collections.singletonList(
            timelineRow(monthStart.minusMonths(5), 9L, 4L)
        ));
        when(userRepository.countByRole(UserRole.NORMAL)).thenReturn(8L);

        VisitTimelineDto result = visitStatisticsService.getTimeline(VisitTimelineGranularity.MONTH);

        assertThat(result.getBuckets()).hasSize(24);
        assertThat(result.getBuckets().get(0).getPeriodStart()).isEqualTo(monthStart.minusMonths(23));
        assertThat(result.getBuckets().get(18).getPeriodStart()).isEqualTo(monthStart.minusMonths(5));
        assertThat(result.getBuckets().get(18).getVisits()).isEqualTo(9L);
        assertThat(result.getBuckets().get(18).getDistinctManagers()).isEqualTo(4L);
        assertThat(result.getBuckets().get(17).getVisits()).isZero();
        assertThat(result.getBuckets().get(23).getPeriodStart()).isEqualTo(monthStart);
        assertThat(result.getBuckets().get(23).getVisits()).isZero();
    }

    @Test
    void getTimeline_quarter_fillsEightBuckets() {
        LocalDate quarterStart = LocalDate.now()
            .withMonth(((LocalDate.now().getMonthValue() - 1) / 3) * 3 + 1)
            .withDayOfMonth(1);
        when(visitLogRepository.countVisitsByPeriod(eq("quarter"), any(), any())).thenReturn(java.util.Collections.singletonList(
            timelineRow(quarterStart.minusMonths(3), 20L, 6L)
        ));
        when(userRepository.countByRole(UserRole.NORMAL)).thenReturn(9L);

        VisitTimelineDto result = visitStatisticsService.getTimeline(VisitTimelineGranularity.QUARTER);

        assertThat(result.getBuckets()).hasSize(8);
        assertThat(result.getBuckets().get(0).getPeriodStart()).isEqualTo(quarterStart.minusMonths(21));
        assertThat(result.getBuckets().get(6).getPeriodStart()).isEqualTo(quarterStart.minusMonths(3));
        assertThat(result.getBuckets().get(6).getVisits()).isEqualTo(20L);
        assertThat(result.getBuckets().get(6).getDistinctManagers()).isEqualTo(6L);
        assertThat(result.getBuckets().get(7).getPeriodStart()).isEqualTo(quarterStart);
        assertThat(result.getBuckets().get(5).getVisits()).isZero();
    }

    @Test
    void getTimeline_year_fillsFiveBucketsAcrossYearBoundary() {
        LocalDate yearStart = LocalDate.now().withDayOfYear(1);
        when(visitLogRepository.countVisitsByPeriod(eq("year"), any(), any())).thenReturn(java.util.Collections.singletonList(
            timelineRow(yearStart.minusYears(1), 99L, 40L)
        ));
        when(userRepository.countByRole(UserRole.NORMAL)).thenReturn(50L);

        VisitTimelineDto result = visitStatisticsService.getTimeline(VisitTimelineGranularity.YEAR);

        assertThat(result.getBuckets()).hasSize(5);
        assertThat(result.getBuckets().get(0).getPeriodStart()).isEqualTo(yearStart.minusYears(4));
        assertThat(result.getBuckets().get(3).getPeriodStart()).isEqualTo(yearStart.minusYears(1));
        assertThat(result.getBuckets().get(3).getVisits()).isEqualTo(99L);
        assertThat(result.getBuckets().get(3).getDistinctManagers()).isEqualTo(40L);
        assertThat(result.getBuckets().get(4).getPeriodStart()).isEqualTo(yearStart);
        assertThat(result.getBuckets().get(2).getVisits()).isZero();
    }
}
