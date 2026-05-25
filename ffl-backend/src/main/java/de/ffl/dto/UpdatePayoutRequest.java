package de.ffl.dto;

import de.ffl.domain.PayoutStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePayoutRequest {
    private String comment;
    private PayoutStatus payoutStatus;
}
