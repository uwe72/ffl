package de.ffl.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchdayMailRequestDto {
    private Long seasonId;
    private Integer roundNumber;
    private List<Long> managerIds;
    private String comment;
    private String commentHeading;
    private boolean testMode;
}
