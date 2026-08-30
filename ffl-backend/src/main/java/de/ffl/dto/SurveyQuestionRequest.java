package de.ffl.dto;

import de.ffl.domain.QuestionType;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveyQuestionRequest {
    private QuestionType type;
    private String text;
    private Integer orderIndex;
    private Boolean required;
    private Integer maxLength;
    private List<String> options;
}
