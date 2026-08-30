package de.ffl.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SurveyAnswerInput {
    @NotNull
    private Long questionId;

    private List<Long> optionIds;

    private String value;
}
