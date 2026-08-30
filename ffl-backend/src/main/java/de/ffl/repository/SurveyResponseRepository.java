package de.ffl.repository;

import de.ffl.domain.SurveyResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SurveyResponseRepository extends JpaRepository<SurveyResponse, Long> {
    long countBySurveyId(Long surveyId);

    @Query("SELECT DISTINCT sr FROM SurveyResponse sr LEFT JOIN FETCH sr.answers WHERE sr.survey.id = :surveyId ORDER BY sr.submittedAt ASC")
    List<SurveyResponse> findBySurveyIdWithAnswers(@Param("surveyId") Long surveyId);
}
