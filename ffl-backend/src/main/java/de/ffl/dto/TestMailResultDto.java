package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestMailResultDto {
    private boolean success;
    private String message;
    private String usedEmail;
    private String usedPassword;
    private String usedSmtpServer;
    private Integer usedSmtpPort;
}
