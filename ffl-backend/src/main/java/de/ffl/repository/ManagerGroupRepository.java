package de.ffl.repository;

import de.ffl.domain.ManagerGroup;
import de.ffl.domain.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ManagerGroupRepository extends JpaRepository<ManagerGroup, Long> {
    List<ManagerGroup> findBySeason(Season season);
    List<ManagerGroup> findBySeasonId(Long seasonId);
}