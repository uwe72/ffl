package de.ffl.service;

import de.ffl.domain.EmailAddress;
import de.ffl.dto.EmailAddressDto;
import de.ffl.repository.EmailAddressRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class EmailAddressService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    );

    private final EmailAddressRepository emailAddressRepository;

    public EmailAddressService(EmailAddressRepository emailAddressRepository) {
        this.emailAddressRepository = emailAddressRepository;
    }

    public List<EmailAddressDto> findAll() {
        return EmailAddressDto.fromEntities(emailAddressRepository.findAll());
    }

    public List<EmailAddressDto> search(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return findAll();
        }
        return EmailAddressDto.fromEntities(emailAddressRepository.findByEmailContainingIgnoreCase(keyword.trim()));
    }

    @Transactional
    public EmailAddressDto create(String email) {
        String trimmed = email.trim().toLowerCase();
        validateEmail(trimmed);
        if (emailAddressRepository.existsByEmail(trimmed)) {
            throw new IllegalArgumentException("E-Mail-Adresse existiert bereits: " + trimmed);
        }
        EmailAddress entity = EmailAddress.builder().email(trimmed).build();
        return EmailAddressDto.fromEntity(emailAddressRepository.save(entity));
    }

    @Transactional
    public List<EmailAddressDto> bulkCreate(List<String> emails) {
        List<EmailAddressDto> result = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (String raw : emails) {
            String trimmed = raw.trim().toLowerCase();
            if (trimmed.isEmpty()) continue;
            if (!isValidEmail(trimmed)) {
                errors.add("Ungültige E-Mail-Adresse: " + trimmed);
                continue;
            }
            if (emailAddressRepository.existsByEmail(trimmed)) {
                continue;
            }
            EmailAddress entity = EmailAddress.builder().email(trimmed).build();
            result.add(EmailAddressDto.fromEntity(emailAddressRepository.save(entity)));
        }

        if (result.isEmpty() && !errors.isEmpty()) {
            throw new IllegalArgumentException(String.join("; ", errors));
        }

        return result;
    }

    @Transactional
    public void delete(Long id) {
        if (!emailAddressRepository.existsById(id)) {
            throw new IllegalArgumentException("E-Mail-Adresse nicht gefunden");
        }
        emailAddressRepository.deleteById(id);
    }

    private void validateEmail(String email) {
        if (!isValidEmail(email)) {
            throw new IllegalArgumentException("Ungültige E-Mail-Adresse: " + email);
        }
    }

    private boolean isValidEmail(String email) {
        return EMAIL_PATTERN.matcher(email).matches();
    }
}