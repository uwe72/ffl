package de.ffl.dto;

import de.ffl.domain.DepositStatus;
import de.ffl.domain.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDepositRequest {
    private String comment;
    private DepositStatus depositStatus;
    private PaymentMethod paymentMethod;
}
