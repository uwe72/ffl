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
public class InstallStatMonthDto {
    private int year;
    private int month;
    private long totalClicks;
    private List<InstallStatUserDto> users;
}
