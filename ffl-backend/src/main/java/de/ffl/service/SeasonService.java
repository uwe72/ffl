package de.ffl.service;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.repository.SeasonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.util.List;
import java.util.Optional;

@Service
public class SeasonService {

    private final SeasonRepository seasonRepository;
    private final SeasonCalculationService seasonCalculationService;

    public SeasonService(SeasonRepository seasonRepository, SeasonCalculationService seasonCalculationService) {
        this.seasonRepository = seasonRepository;
        this.seasonCalculationService = seasonCalculationService;
    }

    public List<Season> findAll() {
        return seasonRepository.findAll();
    }

    public Optional<Season> findById(Long id) {
        return seasonRepository.findById(id);
    }

    public Optional<Season> findCurrentSeason() {
        return seasonRepository.findAll().stream()
            .filter(s -> s.getSeasonState() != SeasonState.BEFORE_SEASON)
            .findFirst();
    }

    @Transactional
    public Season createSeason(Season season) {
        return seasonRepository.save(season);
    }

    @Transactional
    public Season updateSeason(Season season) {
        return seasonRepository.save(season);
    }

    public void deleteSeason(Long id) {
        seasonRepository.deleteById(id);
    }

    @Transactional
    public void startSeason(Long seasonId) {
        seasonRepository.findById(seasonId).ifPresent(season -> {
            season.setSeasonState(SeasonState.RUNNING_HINRUNDE);
            seasonRepository.save(season);
        });
    }

    @Transactional
    public void calculateSeason(Long seasonId) {
        seasonCalculationService.calculateSeason(seasonId);
    }

    public CalculationResult calculateSeasonWithLogs(Long seasonId) {
        CalculationResult result = new CalculationResult();
        StringBuilder logBuilder = new StringBuilder();
        
        try {
            seasonCalculationService.calculateSeason(seasonId);
            logBuilder.append("Berechnung erfolgreich abgeschlossen.");
            result.setSuccess(true);
            result.setLog(logBuilder.toString());
        } catch (Exception e) {
            logBuilder.append("FEHLER: ").append(e.getClass().getSimpleName()).append(": ").append(e.getMessage()).append("\n");
            
            Throwable cause = e.getCause();
            while (cause != null) {
                logBuilder.append("Ursache: ").append(cause.getClass().getSimpleName()).append(": ").append(cause.getMessage()).append("\n");
                cause = cause.getCause();
            }
            
            for (StackTraceElement ste : e.getStackTrace()) {
                logBuilder.append("    at ").append(ste.toString()).append("\n");
                if (logBuilder.length() > 5000) {
                    logBuilder.append("    ... (gekürzt)\n");
                    break;
                }
            }
            
            result.setSuccess(false);
            result.setError(e.getMessage());
            result.setLog(logBuilder.toString());
        }
        
        return result;
    }

    public static class CalculationResult {
        private boolean success;
        private String log;
        private String error;

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public String getLog() { return log; }
        public void setLog(String log) { this.log = log; }
        public String getError() { return error; }
        public void setError(String error) { this.error = error; }
    }
}