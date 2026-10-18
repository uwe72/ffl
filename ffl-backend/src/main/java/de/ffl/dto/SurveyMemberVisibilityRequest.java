package de.ffl.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SurveyMemberVisibilityRequest {
    @NotNull
    private List<Long> hiddenQuestionIds;
}
