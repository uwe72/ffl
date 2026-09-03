package de.ffl.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class SurveyCreateRequest {
    @NotBlank
    private String title;

    private String description;

    @NotNull
    private LocalDateTime deadline;

    @Valid
    private List<SurveyQuestionRequest> questions;
}
