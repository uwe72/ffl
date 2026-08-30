package de.ffl.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptionCount {
    private Long optionId;
    private String optionText;
    private long count;
}
