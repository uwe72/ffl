package de.ffl.repository;

import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeasonRepository extends JpaRepository<Season, Long> {
    List<Season> findBySeasonState(de.ffl.domain.SeasonState seasonState);
}