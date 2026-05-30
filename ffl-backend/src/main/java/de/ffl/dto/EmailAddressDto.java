package de.ffl.dto;

import de.ffl.domain.EmailAddress;

import java.util.List;
import java.util.stream.Collectors;

public class EmailAddressDto {
    private Long id;
    private String email;

    public static EmailAddressDto fromEntity(EmailAddress entity) {
        EmailAddressDto dto = new EmailAddressDto();
        dto.setId(entity.getId());
        dto.setEmail(entity.getEmail());
        return dto;
    }

    public static List<EmailAddressDto> fromEntities(List<EmailAddress> entities) {
        return entities.stream()
            .map(EmailAddressDto::fromEntity)
            .collect(Collectors.toList());
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}