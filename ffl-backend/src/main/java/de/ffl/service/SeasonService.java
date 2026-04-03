package de.ffl.service;

import de.ffl.domain.Season;
import de.ffl.domain.SeasonState;
import de.ffl.repository.SeasonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class SeasonService {

    private final SeasonRepository seasonRepository;

    public SeasonService(SeasonRepository seasonRepository) {
        this.seasonRepository = seasonRepository;
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
}