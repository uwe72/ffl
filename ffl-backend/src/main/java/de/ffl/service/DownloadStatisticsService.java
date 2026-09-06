package de.ffl.service;

import de.ffl.domain.DownloadLog;
import de.ffl.domain.User;
import de.ffl.dto.DownloadStatDocumentDto;
import de.ffl.dto.DownloadStatMonthDto;
import de.ffl.dto.DownloadStatUserDto;
import de.ffl.dto.DownloadStatisticDto;
import de.ffl.repository.DownloadLogRepository;
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
public class DownloadStatisticsService {

    private static final Logger log = LoggerFactory.getLogger(DownloadStatisticsService.class);

    public static final String ANONYMOUS_LOGIN = "Anonym";

    private final DownloadLogRepository downloadLogRepository;

    public DownloadStatisticsService(DownloadLogRepository downloadLogRepository) {
        this.downloadLogRepository = downloadLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordDownload(User user, String documentName) {
        try {
            downloadLogRepository.save(DownloadLog.builder()
                .user(user)
                .documentName(documentName)
                .accessedAt(LocalDateTime.now())
                .build());
        } catch (Exception e) {
            log.warn("Download konnte nicht protokolliert werden für dokument={} user={}",
                documentName, user != null ? user.getLogin() : null, e);
        }
    }

    public DownloadStatisticDto getStatistics(LocalDateTime from, LocalDateTime to) {
        Map<YearMonth, Map<String, Long>> userCounts = new LinkedHashMap<>();
        Map<String, String[]> userNames = new LinkedHashMap<>();
        for (Object[] row : downloadLogRepository.countDownloadsByUserAndMonth(from, to)) {
            YearMonth key = YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
            String login = row[2] != null ? (String) row[2] : ANONYMOUS_LOGIN;
            userNames.putIfAbsent(login, new String[]{(String) row[3], (String) row[4]});
            userCounts.computeIfAbsent(key, k -> new LinkedHashMap<>())
                .merge(login, ((Number) row[5]).longValue(), Long::sum);
        }

        Map<YearMonth, Map<String, Long>> documentCounts = new LinkedHashMap<>();
        for (Object[] row : downloadLogRepository.countDownloadsByDocumentAndMonth(from, to)) {
            YearMonth key = YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
            String documentName = (String) row[2];
            documentCounts.computeIfAbsent(key, k -> new LinkedHashMap<>())
                .merge(documentName, ((Number) row[3]).longValue(), Long::sum);
        }

        List<DownloadStatMonthDto> months = new ArrayList<>();
        YearMonth current = YearMonth.from(from);
        YearMonth end = YearMonth.from(to.minusNanos(1));
        while (!current.isAfter(end)) {
            Map<String, Long> monthUserCounts = userCounts.getOrDefault(current, Map.of());
            List<DownloadStatUserDto> users = monthUserCounts.entrySet().stream()
                .map(e -> {
                    String[] names = userNames.get(e.getKey());
                    return DownloadStatUserDto.builder()
                        .login(e.getKey())
                        .firstName(names != null ? names[0] : null)
                        .lastName(names != null ? names[1] : null)
                        .downloads(e.getValue())
                        .build();
                })
                .sorted(Comparator.comparingLong(DownloadStatUserDto::getDownloads).reversed()
                    .thenComparing(DownloadStatUserDto::getLogin))
                .toList();
            List<DownloadStatDocumentDto> documents = documentCounts.getOrDefault(current, Map.of()).entrySet().stream()
                .map(e -> DownloadStatDocumentDto.builder()
                    .documentName(e.getKey())
                    .downloads(e.getValue())
                    .build())
                .sorted(Comparator.comparingLong(DownloadStatDocumentDto::getDownloads).reversed()
                    .thenComparing(DownloadStatDocumentDto::getDocumentName))
                .toList();
            months.add(DownloadStatMonthDto.builder()
                .year(current.getYear())
                .month(current.getMonthValue())
                .totalDownloads(users.stream().mapToLong(DownloadStatUserDto::getDownloads).sum())
                .users(users)
                .documents(documents)
                .build());
            current = current.plusMonths(1);
        }

        return DownloadStatisticDto.builder().months(months).build();
    }
}
