package de.ffl.dto;

import de.ffl.domain.QuestionType;
import de.ffl.domain.SurveyStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveyPublicDto {
    private Long id;
    private String title;
    private String description;
    private SurveyStatus status;
    private LocalDateTime deadline;
    private List<SurveyQuestionPublicDto> questions;
}
