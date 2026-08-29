package de.ffl.controller;

import de.ffl.domain.SeasonHistory;
import de.ffl.repository.SeasonHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeasonHistoryControllerTest {

    @Mock
    private SeasonHistoryRepository seasonHistoryRepository;

    @InjectMocks
    private SeasonHistoryController seasonHistoryController;

    private SeasonHistory entry(Long id, String saison, String budget, int anzahlManager) {
        return SeasonHistory.builder()
            .id(id)
            .saison(saison)
            .budget(new BigDecimal(budget))
            .anzahlManager(anzahlManager)
            .build();
    }

    @Test
    void getAllSeasonHistory_returnsAllEntriesSorted() {
        when(seasonHistoryRepository.findAllByOrderBySaisonAsc())
            .thenReturn(List.of(entry(1L, "2011-2012", "28", 115), entry(2L, "2012-2013", "29", 184)));

        List<SeasonHistory> result = seasonHistoryController.getAllSeasonHistory();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSaison()).isEqualTo("2011-2012");
        assertThat(result.get(0).getBudget()).isEqualByComparingTo("28");
        assertThat(result.get(0).getAnzahlManager()).isEqualTo(115);
    }

    @Test
    void createSeasonHistory_savesAndReturnsEntry() {
        SeasonHistory toCreate = entry(null, "2026-2027", "30", 260);
        when(seasonHistoryRepository.save(any(SeasonHistory.class))).thenReturn(toCreate);

        SeasonHistory result = seasonHistoryController.createSeasonHistory(toCreate);

        assertThat(result).isSameAs(toCreate);
        verify(seasonHistoryRepository).save(toCreate);
    }

    @Test
    void updateSeasonHistory_existing_updatesFields() {
        SeasonHistory existing = entry(1L, "2011-2012", "28", 115);
        SeasonHistory update = entry(1L, "2011-2012", "28.5", 120);
        when(seasonHistoryRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(seasonHistoryRepository.save(any(SeasonHistory.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<SeasonHistory> response = seasonHistoryController.updateSeasonHistory(1L, update);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getBudget()).isEqualByComparingTo("28.5");
        assertThat(response.getBody().getAnzahlManager()).isEqualTo(120);
        verify(seasonHistoryRepository).save(existing);
    }

    @Test
    void updateSeasonHistory_missing_returnsNotFound() {
        when(seasonHistoryRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseEntity<SeasonHistory> response =
            seasonHistoryController.updateSeasonHistory(99L, entry(null, "x", "30", 1));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(seasonHistoryRepository, never()).save(any(SeasonHistory.class));
    }

    @Test
    void deleteSeasonHistory_existing_returnsOk() {
        when(seasonHistoryRepository.existsById(1L)).thenReturn(true);

        ResponseEntity<Void> response = seasonHistoryController.deleteSeasonHistory(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(seasonHistoryRepository).deleteById(1L);
    }

    @Test
    void deleteSeasonHistory_missing_returnsNotFound() {
        when(seasonHistoryRepository.existsById(99L)).thenReturn(false);

        ResponseEntity<Void> response = seasonHistoryController.deleteSeasonHistory(99L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(seasonHistoryRepository, never()).deleteById(eq(99L));
    }
}
