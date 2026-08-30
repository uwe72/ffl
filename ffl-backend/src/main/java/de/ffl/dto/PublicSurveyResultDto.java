package de.ffl.dto;

import de.ffl.domain.SurveyStatus;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicSurveyResultDto {
    private Long id;
    private String title;
    private String description;
    private SurveyStatus status;
    private long responseCount;
    private List<QuestionResult> questions;
}
