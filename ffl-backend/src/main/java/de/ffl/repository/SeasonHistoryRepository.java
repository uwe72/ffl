package de.ffl.repository;

import de.ffl.domain.SeasonHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeasonHistoryRepository extends JpaRepository<SeasonHistory, Long> {
    List<SeasonHistory> findAllByOrderBySaisonAsc();
}
