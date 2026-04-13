package de.ffl.controller;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.repository.SeasonRepository;
import de.ffl.service.SeasonService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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
    @PreAuthorize("hasRole('ADMIN')")
    public List<Season> getAllSeasons() {
        return seasonRepository.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Season> getSeasonById(@PathVariable Long id) {
        return seasonRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/current")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Season> getCurrentSeason() {
        return seasonRepository.findAll().stream()
            .filter(s -> s.getSeasonState() != SeasonState.BEFORE_SEASON)
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Season createSeason(@RequestBody Season season) {
        return seasonRepository.save(season);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeasonService.CalculationResult> calculateSeason(@PathVariable Long id) {
        if (!seasonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        SeasonService.CalculationResult result = seasonService.calculateSeasonWithLogs(id);
        return ResponseEntity.ok(result);
    }

    @GetMapping(value = "/{id}/calculate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter calculateSeasonStream(@PathVariable Long id) {
        return seasonService.calculateSeasonStream(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
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