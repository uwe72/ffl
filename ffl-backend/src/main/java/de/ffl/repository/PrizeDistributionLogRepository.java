package de.ffl.repository;

import de.ffl.domain.PrizeDistributionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PrizeDistributionLogRepository extends JpaRepository<PrizeDistributionLog, Long> {
    
    Optional<PrizeDistributionLog> findBySeasonId(Long seasonId);
    
    @Modifying
    @Query("DELETE FROM PrizeDistributionLog p WHERE p.season.id = :seasonId")
    void deleteBySeasonId(@Param("seasonId") Long seasonId);
}
