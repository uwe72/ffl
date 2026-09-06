package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitStatMonthDto {
    private int year;
    private int month;
    private long totalVisits;
    private List<VisitStatUserDto> users;
}
