package de.ffl.controller;

import de.ffl.dto.InstallStatMonthDto;
import de.ffl.dto.InstallStatisticDto;
import de.ffl.dto.LoginStatMonthDto;
import de.ffl.dto.LoginStatisticDto;
import de.ffl.service.InstallStatisticsService;
import de.ffl.service.LoginStatisticsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatisticsControllerTest {

    @Mock
    private LoginStatisticsService loginStatisticsService;

    @Mock
    private InstallStatisticsService installStatisticsService;

    @InjectMocks
    private StatisticsController statisticsController;

    @Test
    void getLoginStatistics_validRange_returnsStatistics() {
        LoginStatisticDto dto = LoginStatisticDto.builder()
            .months(java.util.List.of(LoginStatMonthDto.builder().year(2026).month(1).totalLogins(5L).build()))
            .build();
        when(loginStatisticsService.getStatistics(any(), any())).thenReturn(dto);

        ResponseEntity<LoginStatisticDto> response = statisticsController.getLoginStatistics(
            LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(dto);
    }

    @Test
    void getLoginStatistics_emptyRange_returnsBadRequest() {
        ResponseEntity<LoginStatisticDto> response = statisticsController.getLoginStatistics(
            LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 1));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(loginStatisticsService, never()).getStatistics(any(), any());
    }

    @Test
    void getLoginStatistics_invertedRange_returnsBadRequest() {
        ResponseEntity<LoginStatisticDto> response = statisticsController.getLoginStatistics(
            LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(loginStatisticsService, never()).getStatistics(any(), any());
    }

    @Test
    void getInstallClickStatistics_validRange_returnsStatistics() {
        InstallStatisticDto dto = InstallStatisticDto.builder()
            .months(java.util.List.of(InstallStatMonthDto.builder().year(2026).month(1).totalClicks(5L).build()))
            .build();
        when(installStatisticsService.getStatistics(any(), any())).thenReturn(dto);

        ResponseEntity<InstallStatisticDto> response = statisticsController.getInstallClickStatistics(
            LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isSameAs(dto);
    }

    @Test
    void getInstallClickStatistics_emptyRange_returnsBadRequest() {
        ResponseEntity<InstallStatisticDto> response = statisticsController.getInstallClickStatistics(
            LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 1));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(installStatisticsService, never()).getStatistics(any(), any());
    }

    @Test
    void getInstallClickStatistics_invertedRange_returnsBadRequest() {
        ResponseEntity<InstallStatisticDto> response = statisticsController.getInstallClickStatistics(
            LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(installStatisticsService, never()).getStatistics(any(), any());
    }
}
