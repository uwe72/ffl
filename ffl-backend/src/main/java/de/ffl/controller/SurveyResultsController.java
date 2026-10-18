package de.ffl.controller;

import de.ffl.dto.SurveyEndedDto;
import de.ffl.dto.SurveyResultDto;
import de.ffl.service.SurveyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/survey-results")
public class SurveyResultsController {

    private final SurveyService surveyService;

    public SurveyResultsController(SurveyService surveyService) {
        this.surveyService = surveyService;
    }

    @GetMapping
    public List<SurveyEndedDto> ended() {
        return surveyService.getEndedSurveys();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SurveyResultDto> result(@PathVariable Long id) {
        SurveyResultDto result = surveyService.getMemberResult(id);
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
    }
}
