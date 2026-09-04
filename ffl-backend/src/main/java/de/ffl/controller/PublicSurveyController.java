package de.ffl.controller;

import de.ffl.dto.SurveyAnswerRequest;
import de.ffl.dto.SurveyPublicDto;
import de.ffl.service.SurveyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/public/survey")
public class PublicSurveyController {

    private final SurveyService surveyService;

    public PublicSurveyController(SurveyService surveyService) {
        this.surveyService = surveyService;
    }

    @GetMapping("/active")
    public ResponseEntity<SurveyPublicDto> active() {
        SurveyPublicDto active = surveyService.getActiveSurvey();
        return active == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(active);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SurveyPublicDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(surveyService.getPublicSurvey(id));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<?> submit(@PathVariable Long id, @Valid @RequestBody SurveyAnswerRequest request) {
        surveyService.submitResponse(id, request);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
