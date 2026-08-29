package de.ffl.controller;

import de.ffl.domain.SeasonHistory;
import de.ffl.repository.SeasonHistoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class SeasonHistoryController {

    private final SeasonHistoryRepository seasonHistoryRepository;

    public SeasonHistoryController(SeasonHistoryRepository seasonHistoryRepository) {
        this.seasonHistoryRepository = seasonHistoryRepository;
    }

    @GetMapping
    public List<SeasonHistory> getAllSeasonHistory() {
        return seasonHistoryRepository.findAllByOrderBySaisonAsc();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public SeasonHistory createSeasonHistory(@RequestBody SeasonHistory seasonHistory) {
        return seasonHistoryRepository.save(seasonHistory);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeasonHistory> updateSeasonHistory(@PathVariable Long id, @RequestBody SeasonHistory seasonHistory) {
        return seasonHistoryRepository.findById(id)
            .map(existing -> {
                existing.setSaison(seasonHistory.getSaison());
                existing.setBudget(seasonHistory.getBudget());
                existing.setAnzahlManager(seasonHistory.getAnzahlManager());
                return ResponseEntity.ok(seasonHistoryRepository.save(existing));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteSeasonHistory(@PathVariable Long id) {
        if (seasonHistoryRepository.existsById(id)) {
            seasonHistoryRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
