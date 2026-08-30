package de.ffl.repository;

import de.ffl.domain.Survey;
import de.ffl.domain.SurveyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SurveyRepository extends JpaRepository<Survey, Long> {
    List<Survey> findAllByOrderByCreatedAtDesc();

    Optional<Survey> findFirstByStatus(SurveyStatus status);

    boolean existsByStatus(SurveyStatus status);

    @Query("SELECT DISTINCT s FROM Survey s LEFT JOIN FETCH s.questions WHERE s.id = :id")
    Optional<Survey> findByIdWithQuestions(@Param("id") Long id);
}
