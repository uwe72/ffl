package de.ffl.dto;

import de.ffl.domain.DepositStatus;
import de.ffl.domain.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepositDto {
    private Long managerId;
    private String managerName;
    private String managerFirstName;
    private String managerLastName;
    private String managerLogin;
    private String managerEmail;
    private BigDecimal amount;
    private String comment;
    private PaymentMethod paymentMethod;
    private DepositStatus depositStatus;
    private LocalDateTime receivedAt;
    private boolean spielleiter;
}
