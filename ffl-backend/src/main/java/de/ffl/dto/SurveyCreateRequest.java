package de.ffl.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SurveyCreateRequest {
    @NotBlank
    private String title;

    private String description;

    @Valid
    private List<SurveyQuestionRequest> questions;
}
