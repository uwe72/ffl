package de.ffl.dto;

import de.ffl.domain.PayoutStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrizePayoutDto {
    private Long managerId;
    private String managerName;
    private String managerFirstName;
    private String managerLastName;
    private String managerEmail;
    private Integer position;
    private Integer pointsTotal;
    private BigDecimal prizeAmount;
    private String comment;
    private PayoutStatus payoutStatus;
}
