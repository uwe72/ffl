package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.dto.VisitStatMonthDto;
import de.ffl.dto.VisitStatUserDto;
import de.ffl.dto.VisitStatisticDto;
import de.ffl.repository.UserRepository;
import de.ffl.repository.VisitLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
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
}
