package de.ffl.dto;

import de.ffl.domain.QuestionType;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveyQuestionAdminDto {
    private Long id;
    private QuestionType type;
    private String text;
    private Integer orderIndex;
    private Boolean required;
    private List<QuestionOptionDto> options;
}
