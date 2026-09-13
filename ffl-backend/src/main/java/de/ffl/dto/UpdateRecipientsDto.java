package de.ffl.dto;

import java.util.List;

public class UpdateRecipientsDto {

    private List<Long> recipientIds;

    public List<Long> getRecipientIds() {
        return recipientIds;
    }

    public void setRecipientIds(List<Long> recipientIds) {
        this.recipientIds = recipientIds;
    }
}
