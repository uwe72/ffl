package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitTimelineBucketDto {
    private LocalDate periodStart;
    private Long visits;
    private Long distinctManagers;
}
