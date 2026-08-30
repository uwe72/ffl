package de.ffl.service;

import de.ffl.domain.LoginLog;
import de.ffl.domain.User;
import de.ffl.dto.LoginStatMonthDto;
import de.ffl.dto.LoginStatUserDto;
import de.ffl.dto.LoginStatisticDto;
import de.ffl.repository.LoginLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LoginStatisticsService {

    private static final Logger log = LoggerFactory.getLogger(LoginStatisticsService.class);

    private final LoginLogRepository loginLogRepository;

    public LoginStatisticsService(LoginLogRepository loginLogRepository) {
        this.loginLogRepository = loginLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLogin(User user) {
        try {
            loginLogRepository.save(LoginLog.builder()
                .user(user)
                .loginAt(LocalDateTime.now())
                .build());
        } catch (Exception e) {
            log.warn("Login konnte nicht protokolliert werden für user={}", user.getLogin(), e);
        }
    }

    public LoginStatisticDto getStatistics(LocalDateTime from, LocalDateTime to) {
        Map<YearMonth, Map<String, Long>> counts = new LinkedHashMap<>();
        for (Object[] row : loginLogRepository.countLoginsByUserAndMonth(from, to)) {
            YearMonth key = YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
            counts.computeIfAbsent(key, k -> new LinkedHashMap<>())
                .merge((String) row[2], ((Number) row[3]).longValue(), Long::sum);
        }

        List<LoginStatMonthDto> months = new ArrayList<>();
        YearMonth current = YearMonth.from(from);
        YearMonth end = YearMonth.from(to.minusNanos(1));
        while (!current.isAfter(end)) {
            Map<String, Long> userCounts = counts.getOrDefault(current, Map.of());
            List<LoginStatUserDto> users = userCounts.entrySet().stream()
                .map(e -> LoginStatUserDto.builder().login(e.getKey()).logins(e.getValue()).build())
                .sorted(Comparator.comparingLong(LoginStatUserDto::getLogins).reversed()
                    .thenComparing(LoginStatUserDto::getLogin))
                .toList();
            months.add(LoginStatMonthDto.builder()
                .year(current.getYear())
                .month(current.getMonthValue())
                .totalLogins(users.stream().mapToLong(LoginStatUserDto::getLogins).sum())
                .users(users)
                .build());
            current = current.plusMonths(1);
        }

        return LoginStatisticDto.builder().months(months).build();
    }
}
