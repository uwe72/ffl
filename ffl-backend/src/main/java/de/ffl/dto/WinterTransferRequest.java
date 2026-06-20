package de.ffl.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class WinterTransferRequest {

    @NotNull
    @Size(max = 3)
    @Valid
    private List<Transfer> transfers;

    public List<Transfer> getTransfers() { return transfers; }
    public void setTransfers(List<Transfer> transfers) { this.transfers = transfers; }

    public static class Transfer {
        @NotNull
        private Long oldPlayerId;

        @NotNull
        private Long newPlayerId;

        public Long getOldPlayerId() { return oldPlayerId; }
        public void setOldPlayerId(Long oldPlayerId) { this.oldPlayerId = oldPlayerId; }
        public Long getNewPlayerId() { return newPlayerId; }
        public void setNewPlayerId(Long newPlayerId) { this.newPlayerId = newPlayerId; }
    }
}
