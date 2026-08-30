package de.ffl.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SurveyAnswerRequest {
    @Valid
    @NotNull
    private List<SurveyAnswerInput> answers;
}
