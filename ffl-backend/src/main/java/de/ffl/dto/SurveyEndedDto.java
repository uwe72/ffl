package de.ffl.dto;

import de.ffl.domain.SurveyStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveyEndedDto {
    private Long id;
    private String title;
    private String description;
    private SurveyStatus status;
    private LocalDateTime deadline;
    private long responseCount;
}
