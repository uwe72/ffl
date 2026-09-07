package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.domain.VisitTimelineGranularity;
import de.ffl.dto.VisitStatMonthDto;
import de.ffl.dto.VisitStatUserDto;
import de.ffl.dto.VisitStatisticDto;
import de.ffl.dto.VisitTimelineBucketDto;
import de.ffl.dto.VisitTimelineDto;
import de.ffl.repository.UserRepository;
import de.ffl.repository.VisitLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class VisitStatisticsService {

    private static final Logger log = LoggerFactory.getLogger(VisitStatisticsService.class);

    private final VisitLogRepository visitLogRepository;
    private final UserRepository userRepository;

    public VisitStatisticsService(VisitLogRepository visitLogRepository, UserRepository userRepository) {
        this.visitLogRepository = visitLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordVisit(User user) {
        try {
            int inserted = visitLogRepository.insertVisitIfAbsent(user.getId(), LocalDate.now());
            if (inserted > 0) {
                user.setVisitCount(user.getVisitCount() != null ? user.getVisitCount() + 1 : 1);
                userRepository.save(user);
            }
        } catch (Exception e) {
            log.warn("Besuch konnte nicht protokolliert werden für user={}", user.getLogin(), e);
        }
    }

    public VisitStatisticDto getStatistics(LocalDate from, LocalDate to) {
        Map<YearMonth, Map<String, Long>> counts = new LinkedHashMap<>();
        Map<String, String[]> userNames = new LinkedHashMap<>();
        for (Object[] row : visitLogRepository.countVisitsByUserAndMonth(from, to)) {
            YearMonth key = YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
            String login = (String) row[2];
            userNames.putIfAbsent(login, new String[]{(String) row[3], (String) row[4]});
            counts.computeIfAbsent(key, k -> new LinkedHashMap<>())
                .merge(login, ((Number) row[5]).longValue(), Long::sum);
        }

        List<VisitStatMonthDto> months = new ArrayList<>();
        YearMonth current = YearMonth.from(from);
        YearMonth end = YearMonth.from(to.minusDays(1));
        while (!current.isAfter(end)) {
            Map<String, Long> userCounts = counts.getOrDefault(current, Map.of());
            List<VisitStatUserDto> users = userCounts.entrySet().stream()
                .map(e -> {
                    String[] names = userNames.get(e.getKey());
                    return VisitStatUserDto.builder()
                        .login(e.getKey())
                        .firstName(names != null ? names[0] : null)
                        .lastName(names != null ? names[1] : null)
                        .visits(e.getValue())
                        .build();
                })
                .sorted(Comparator.comparingLong(VisitStatUserDto::getVisits).reversed()
                    .thenComparing(VisitStatUserDto::getLogin))
                .toList();
            months.add(VisitStatMonthDto.builder()
                .year(current.getYear())
                .month(current.getMonthValue())
                .totalVisits(users.stream().mapToLong(VisitStatUserDto::getVisits).sum())
                .users(users)
                .build());
            current = current.plusMonths(1);
        }

        return VisitStatisticDto.builder().months(months).build();
    }

    public VisitTimelineDto getTimeline(VisitTimelineGranularity granularity) {
        LocalDate today = LocalDate.now();
        LocalDate currentStart = switch (granularity) {
            case DAY -> today;
            case WEEK -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> today.withDayOfMonth(1);
            case QUARTER -> today.withMonth(((today.getMonthValue() - 1) / 3) * 3 + 1).withDayOfMonth(1);
            case YEAR -> today.withDayOfYear(1);
        };
        LocalDate from = switch (granularity) {
            case DAY -> currentStart.minusDays(59);
            case WEEK -> currentStart.minusWeeks(25);
            case MONTH -> currentStart.minusMonths(23);
            case QUARTER -> currentStart.minusMonths(21);
            case YEAR -> currentStart.minusYears(4);
        };
        LocalDate to = switch (granularity) {
            case DAY -> currentStart.plusDays(1);
            case WEEK -> currentStart.plusWeeks(1);
            case MONTH -> currentStart.plusMonths(1);
            case QUARTER -> currentStart.plusMonths(3);
            case YEAR -> currentStart.plusYears(1);
        };

        Map<LocalDate, long[]> countsByPeriod = new HashMap<>();
        for (Object[] row : visitLogRepository.countVisitsByPeriod(granularity.name().toLowerCase(), from, to)) {
            countsByPeriod.put(toLocalDate(row[0]), new long[]{
                ((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }

        List<VisitTimelineBucketDto> buckets = new ArrayList<>();
        LocalDate cursor = from;
        while (cursor.isBefore(to)) {
            long[] counts = countsByPeriod.getOrDefault(cursor, new long[]{0L, 0L});
            buckets.add(VisitTimelineBucketDto.builder()
                .periodStart(cursor)
                .visits(counts[0])
                .distinctManagers(counts[1])
                .build());
            cursor = switch (granularity) {
                case DAY -> cursor.plusDays(1);
                case WEEK -> cursor.plusWeeks(1);
                case MONTH -> cursor.plusMonths(1);
                case QUARTER -> cursor.plusMonths(3);
                case YEAR -> cursor.plusYears(1);
            };
        }

        return VisitTimelineDto.builder()
            .granularity(granularity.name())
            .totalManagers(userRepository.countByRole(UserRole.NORMAL))
            .buckets(buckets)
            .build();
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof java.sql.Date date) return date.toLocalDate();
        if (value instanceof LocalDate localDate) return localDate;
        if (value instanceof java.sql.Timestamp timestamp) return timestamp.toLocalDateTime().toLocalDate();
        throw new IllegalStateException("Unerwarteter Typ für Periodenstart: " + value.getClass());
    }
}
