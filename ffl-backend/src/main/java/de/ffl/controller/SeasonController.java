package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.repository.SeasonRepository;
import de.ffl.service.SeasonService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seasons")
public class SeasonController {

    private final SeasonRepository seasonRepository;
    private final SeasonService seasonService;

    public SeasonController(SeasonRepository seasonRepository, SeasonService seasonService) {
        this.seasonRepository = seasonRepository;
        this.seasonService = seasonService;
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

    @GetMapping("/current")
    public ResponseEntity<Season> getCurrentSeason() {
        return seasonRepository.findAll().stream()
            .filter(s -> s.getSeasonState() != SeasonState.BEFORE_SEASON)
            .findFirst()
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
                existing.setStartRoundRueckrunde(season.getStartRoundRueckrunde());
                return ResponseEntity.ok(seasonRepository.save(existing));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/state")
    public ResponseEntity<Season> updateSeasonState(@PathVariable Long id, @RequestBody SeasonStateUpdate request) {
        return seasonRepository.findById(id)
            .map(existing -> {
                existing.setName(request.getName());
                existing.setSeasonState(request.getSeasonState());
                return ResponseEntity.ok(seasonRepository.save(existing));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/calculate")
    public ResponseEntity<SeasonService.CalculationResult> calculateSeason(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        SeasonService.CalculationResult result = seasonService.calculateSeasonWithLogs(id);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSeason(@PathVariable Long id) {
        if (seasonRepository.existsById(id)) {
            seasonRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    public static class SeasonStateUpdate {
        private String name;
        private SeasonState seasonState;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public SeasonState getSeasonState() { return seasonState; }
        public void setSeasonState(SeasonState seasonState) { this.seasonState = seasonState; }
    }
}