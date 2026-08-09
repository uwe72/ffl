package de.ffl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepositSyncResult {
    @Builder.Default
    private List<String> created = new ArrayList<>();
    @Builder.Default
    private List<String> deleted = new ArrayList<>();
    private int alreadyPresent;
}
