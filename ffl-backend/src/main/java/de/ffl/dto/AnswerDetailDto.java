package de.ffl.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnswerDetailDto {
    private Long questionId;
    private String questionText;
    private String answerText;
}
