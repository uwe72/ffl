package de.ffl.dto;

import de.ffl.domain.SurveyStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveyResultDto {
    private Long id;
    private String title;
    private String description;
    private SurveyStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long responseCount;
    private List<QuestionResult> questions;
    private List<SurveyResponseDetailDto> responses;
}
