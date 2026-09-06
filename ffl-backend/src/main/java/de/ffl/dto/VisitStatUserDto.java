package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitStatUserDto {
    private String login;
    private String firstName;
    private String lastName;
    private long visits;
}
