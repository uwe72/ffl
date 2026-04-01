package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.repository.SeasonRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seasons")
public class SeasonController {

    private final SeasonRepository seasonRepository;

    public SeasonController(SeasonRepository seasonRepository) {
        this.seasonRepository = seasonRepository;
    }

    @GetMapping
    public List<Season> getAllSeasons() {
        return seasonRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Season> getSeasonById(@PathVariable Long id) {
        return seasonRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Season createSeason(@RequestBody Season season) {
        return seasonRepository.save(season);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Season> updateSeason(@PathVariable Long id, @RequestBody Season season) {
        return seasonRepository.findById(id)
            .map(existing -> {
                existing.setName(season.getName());
                existing.setBudget(season.getBudget());
                existing.setSeasonState(season.getSeasonState());
                existing.setFinalRegistrationDate(season.getFinalRegistrationDate());
                return ResponseEntity.ok(seasonRepository.save(existing));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSeason(@PathVariable Long id) {
        if (seasonRepository.existsById(id)) {
            seasonRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}