package de.ffl.dto;

import de.ffl.domain.QuestionType;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResult {
    private Long questionId;
    private String text;
    private QuestionType type;
    private Integer orderIndex;
    private Boolean required;
    private Integer answerCount;
    private Double mean;
    private List<Integer> ratingDistribution;
    private List<OptionCount> counts;
    private List<String> freeTexts;
}
