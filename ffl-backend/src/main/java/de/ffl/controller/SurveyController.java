package de.ffl.controller;

import de.ffl.dto.SurveyAdminDto;
import de.ffl.dto.SurveyCreateRequest;
import de.ffl.dto.SurveyResultDto;
import de.ffl.service.SurveyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/surveys")
@PreAuthorize("hasRole('ADMIN')")
public class SurveyController {

    private final SurveyService surveyService;

    public SurveyController(SurveyService surveyService) {
        this.surveyService = surveyService;
    }

    @GetMapping
    public List<SurveyAdminDto> list() {
        return surveyService.listSurveys();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SurveyAdminDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(surveyService.getAdminSurvey(id));
    }

    @PostMapping
    public SurveyAdminDto create(@Valid @RequestBody SurveyCreateRequest request) {
        return surveyService.createSurvey(request);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SurveyAdminDto> update(@PathVariable Long id, @Valid @RequestBody SurveyCreateRequest request) {
        return ResponseEntity.ok(surveyService.updateSurvey(id, request));
    }

    @PostMapping("/{id}/copy")
    public ResponseEntity<SurveyAdminDto> copy(@PathVariable Long id) {
        return ResponseEntity.ok(surveyService.copySurvey(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        surveyService.deleteSurvey(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<SurveyAdminDto> start(@PathVariable Long id) {
        return ResponseEntity.ok(surveyService.startSurvey(id));
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<SurveyAdminDto> end(@PathVariable Long id) {
        return ResponseEntity.ok(surveyService.endSurvey(id));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<SurveyAdminDto> publish(@PathVariable Long id) {
        return ResponseEntity.ok(surveyService.publishSurvey(id));
    }

    @GetMapping("/{id}/result")
    public ResponseEntity<SurveyResultDto> result(@PathVariable Long id) {
        return ResponseEntity.ok(surveyService.getResult(id));
    }
}
