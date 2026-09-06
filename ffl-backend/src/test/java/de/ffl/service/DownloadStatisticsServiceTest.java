package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.dto.DownloadStatDocumentDto;
import de.ffl.dto.DownloadStatMonthDto;
import de.ffl.dto.DownloadStatUserDto;
import de.ffl.dto.DownloadStatisticDto;
import de.ffl.repository.DownloadLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DownloadStatisticsServiceTest {

    @Mock
    private DownloadLogRepository downloadLogRepository;

    @InjectMocks
    private DownloadStatisticsService downloadStatisticsService;

    private Object[] userRow(int year, int month, String login, String firstName, String lastName, long count) {
        return new Object[]{year, month, login, firstName, lastName, count};
    }

    private Object[] documentRow(int year, int month, String documentName, long count) {
        return new Object[]{year, month, documentName, count};
    }

    @Test
    void getStatistics_fillsGapsWithZeroAndAggregatesUsersAndDocuments() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 3, 1);
        when(downloadLogRepository.countDownloadsByUserAndMonth(any(), any())).thenReturn(List.of(
            userRow(2026, 1, "alice", "Alice", "Muster", 3L),
            userRow(2026, 1, DownloadStatisticsService.ANONYMOUS_LOGIN, null, null, 1L)
        ));
        when(downloadLogRepository.countDownloadsByDocumentAndMonth(any(), any())).thenReturn(List.of(
            documentRow(2026, 1, "regeln.pdf", 2L),
            documentRow(2026, 1, "spielplan.pdf", 2L)
        ));

        DownloadStatisticDto result = downloadStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay());

        assertThat(result.getMonths()).hasSize(2);
        DownloadStatMonthDto first = result.getMonths().get(0);
        assertThat(first.getYear()).isEqualTo(2026);
        assertThat(first.getMonth()).isEqualTo(1);
        assertThat(first.getTotalDownloads()).isEqualTo(4);
        assertThat(first.getUsers()).extracting(DownloadStatUserDto::getLogin)
            .containsExactly("alice", "Anonym");
        assertThat(first.getUsers()).extracting(DownloadStatUserDto::getDownloads)
            .containsExactly(3L, 1L);
        assertThat(first.getDocuments()).extracting(DownloadStatDocumentDto::getDocumentName)
            .containsExactly("regeln.pdf", "spielplan.pdf");
        assertThat(first.getDocuments()).extracting(DownloadStatDocumentDto::getDownloads)
            .containsExactly(2L, 2L);
        assertThat(result.getMonths().get(1).getTotalDownloads()).isZero();
        assertThat(result.getMonths().get(1).getUsers()).isEmpty();
        assertThat(result.getMonths().get(1).getDocuments()).isEmpty();
    }

    @Test
    void getStatistics_sortsUsersAndDocumentsByCountDesc() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 2, 1);
        when(downloadLogRepository.countDownloadsByUserAndMonth(any(), any())).thenReturn(List.of(
            userRow(2026, 1, "alice", "Alice", "Muster", 2L),
            userRow(2026, 1, "bob", "Bob", "Beispiel", 5L)
        ));
        when(downloadLogRepository.countDownloadsByDocumentAndMonth(any(), any())).thenReturn(List.of(
            documentRow(2026, 1, "a.pdf", 1L),
            documentRow(2026, 1, "b.pdf", 9L)
        ));

        DownloadStatisticDto result = downloadStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay());

        assertThat(result.getMonths().get(0).getUsers()).extracting(DownloadStatUserDto::getLogin)
            .containsExactly("bob", "alice");
        assertThat(result.getMonths().get(0).getDocuments()).extracting(DownloadStatDocumentDto::getDocumentName)
            .containsExactly("b.pdf", "a.pdf");
    }

    @Test
    void getStatistics_spansYearBoundary() {
        LocalDate from = LocalDate.of(2025, 11, 1);
        LocalDate to = LocalDate.of(2026, 1, 1);
        when(downloadLogRepository.countDownloadsByUserAndMonth(any(), any())).thenReturn(List.<Object[]>of(
            userRow(2025, 11, "alice", "Alice", "Muster", 4L)
        ));
        when(downloadLogRepository.countDownloadsByDocumentAndMonth(any(), any())).thenReturn(java.util.Collections.emptyList());

        DownloadStatisticDto result = downloadStatisticsService.getStatistics(from.atStartOfDay(), to.atStartOfDay());

        assertThat(result.getMonths()).hasSize(2);
        assertThat(result.getMonths().get(0).getYear()).isEqualTo(2025);
        assertThat(result.getMonths().get(0).getMonth()).isEqualTo(11);
        assertThat(result.getMonths().get(0).getTotalDownloads()).isEqualTo(4);
        assertThat(result.getMonths().get(1).getYear()).isEqualTo(2025);
        assertThat(result.getMonths().get(1).getMonth()).isEqualTo(12);
        assertThat(result.getMonths().get(1).getTotalDownloads()).isZero();
    }

    @Test
    void getStatistics_emptyRange_returnsSingleZeroMonth() {
        when(downloadLogRepository.countDownloadsByUserAndMonth(any(), any())).thenReturn(java.util.Collections.emptyList());
        when(downloadLogRepository.countDownloadsByDocumentAndMonth(any(), any())).thenReturn(java.util.Collections.emptyList());

        DownloadStatisticDto result = downloadStatisticsService.getStatistics(
            LocalDate.of(2026, 1, 1).atStartOfDay(), LocalDate.of(2026, 2, 1).atStartOfDay());

        assertThat(result.getMonths()).hasSize(1);
        assertThat(result.getMonths().get(0).getTotalDownloads()).isZero();
        assertThat(result.getMonths().get(0).getUsers()).isEmpty();
        assertThat(result.getMonths().get(0).getDocuments()).isEmpty();
    }

    @Test
    void recordDownload_savesLogWithUserAndDocumentName() {
        User user = User.builder().id(1L).login("alice").build();

        downloadStatisticsService.recordDownload(user, "regeln.pdf");

        org.mockito.Mockito.verify(downloadLogRepository).save(ArgumentMatchers.argThat(log ->
            log.getUser() == user && "regeln.pdf".equals(log.getDocumentName()) && log.getAccessedAt() != null));
    }

    @Test
    void recordDownload_withNullUser_savesAnonymousLog() {
        downloadStatisticsService.recordDownload(null, "regeln.pdf");

        verify(downloadLogRepository).save(ArgumentMatchers.argThat(log ->
            log.getUser() == null && "regeln.pdf".equals(log.getDocumentName())));
    }

    @Test
    void recordDownload_onRepositoryFailure_doesNotThrow() {
        when(downloadLogRepository.save(any())).thenThrow(new RuntimeException("db down"));

        assertThatCode(() ->
            downloadStatisticsService.recordDownload(null, "regeln.pdf")
        ).doesNotThrowAnyException();
    }
}
