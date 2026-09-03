package de.ffl.service;

import de.ffl.domain.PwaInstallClick;
import de.ffl.domain.User;
import de.ffl.dto.InstallStatMonthDto;
import de.ffl.dto.InstallStatUserDto;
import de.ffl.dto.InstallStatisticDto;
import de.ffl.repository.PwaInstallClickRepository;
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
public class InstallStatisticsService {

    private static final Logger log = LoggerFactory.getLogger(InstallStatisticsService.class);

    private final PwaInstallClickRepository pwaInstallClickRepository;

    public InstallStatisticsService(PwaInstallClickRepository pwaInstallClickRepository) {
        this.pwaInstallClickRepository = pwaInstallClickRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordClick(User user) {
        try {
            pwaInstallClickRepository.save(PwaInstallClick.builder()
                .user(user)
                .clickAt(LocalDateTime.now())
                .build());
        } catch (Exception e) {
            log.warn("Install-Klick konnte nicht protokolliert werden für user={}", user.getLogin(), e);
        }
    }

    public InstallStatisticDto getStatistics(LocalDateTime from, LocalDateTime to) {
        Map<YearMonth, Map<String, Long>> counts = new LinkedHashMap<>();
        Map<String, String[]> userNames = new LinkedHashMap<>();
        for (Object[] row : pwaInstallClickRepository.countClicksByUserAndMonth(from, to)) {
            YearMonth key = YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
            String login = (String) row[2];
            userNames.putIfAbsent(login, new String[]{(String) row[3], (String) row[4]});
            counts.computeIfAbsent(key, k -> new LinkedHashMap<>())
                .merge(login, ((Number) row[5]).longValue(), Long::sum);
        }

        List<InstallStatMonthDto> months = new ArrayList<>();
        YearMonth current = YearMonth.from(from);
        YearMonth end = YearMonth.from(to.minusNanos(1));
        while (!current.isAfter(end)) {
            Map<String, Long> userCounts = counts.getOrDefault(current, Map.of());
            List<InstallStatUserDto> users = userCounts.entrySet().stream()
                .map(e -> {
                    String[] names = userNames.get(e.getKey());
                    return InstallStatUserDto.builder()
                        .login(e.getKey())
                        .firstName(names != null ? names[0] : null)
                        .lastName(names != null ? names[1] : null)
                        .clicks(e.getValue())
                        .build();
                })
                .sorted(Comparator.comparingLong(InstallStatUserDto::getClicks).reversed()
                    .thenComparing(InstallStatUserDto::getLogin))
                .toList();
            months.add(InstallStatMonthDto.builder()
                .year(current.getYear())
                .month(current.getMonthValue())
                .totalClicks(users.stream().mapToLong(InstallStatUserDto::getClicks).sum())
                .users(users)
                .build());
            current = current.plusMonths(1);
        }

        return InstallStatisticDto.builder().months(months).build();
    }
}
