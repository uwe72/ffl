package de.ffl.repository;

import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeasonRepository extends JpaRepository<Season, Long> {
    List<Season> findBySeasonState(de.ffl.domain.SeasonState seasonState);

    @Modifying
    @Query(value = "DELETE FROM season_2_team", nativeQuery = true)
    void deleteAllTeamRelations();

    @Modifying
    @Query(value = "INSERT INTO season_2_team (season_id, team_id) VALUES (:seasonId, :teamId)", nativeQuery = true)
    void addTeamRelation(Long seasonId, Long teamId);

    @Modifying
    @Query(value = "SELECT setval('ffl_season_seq', (SELECT COALESCE(MAX(id), 0) FROM ffl_season), true)", nativeQuery = true)
    void resetSequence();
}