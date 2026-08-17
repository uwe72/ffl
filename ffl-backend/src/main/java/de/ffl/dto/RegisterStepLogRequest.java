package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterStepLogRequest {
    private String event;
    private Integer step;
    private String firstName;
    private String lastName;
    private String login;
}
