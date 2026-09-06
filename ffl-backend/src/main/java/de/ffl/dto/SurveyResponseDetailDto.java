package de.ffl.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SurveyResponseDetailDto {
    private Long id;
    private LocalDateTime submittedAt;
    private List<AnswerDetailDto> answers;
}
