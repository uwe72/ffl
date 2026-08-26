package de.ffl.service;

import de.ffl.domain.EmailAddress;
import de.ffl.dto.EmailAddressDto;
import de.ffl.repository.EmailAddressRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailAddressServiceTest {

    @Mock
    private EmailAddressRepository emailAddressRepository;

    private EmailAddressService service() {
        return new EmailAddressService(emailAddressRepository);
    }

    @Test
    void addIfNotExists_newEmail_persistsLowercasedAndReturnsTrue() {
        when(emailAddressRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);

        boolean result = service().addIfNotExists("  NEW@Example.com  ");

        assertThat(result).isTrue();
        ArgumentCaptor<EmailAddress> captor = ArgumentCaptor.forClass(EmailAddress.class);
        verify(emailAddressRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("new@example.com");
    }

    @Test
    void addIfNotExists_existingEmail_doesNothingAndReturnsFalse() {
        when(emailAddressRepository.existsByEmailIgnoreCase("dup@example.com")).thenReturn(true);

        boolean result = service().addIfNotExists("dup@example.com");

        assertThat(result).isFalse();
        verify(emailAddressRepository, never()).save(any());
    }

    @Test
    void addIfNotExists_existingEmailWithDifferentCase_returnsFalse() {
        when(emailAddressRepository.existsByEmailIgnoreCase("dup@example.com")).thenReturn(true);

        boolean result = service().addIfNotExists("  DUP@Example.COM  ");

        assertThat(result).isFalse();
        verify(emailAddressRepository, never()).save(any());
    }

    @Test
    void addIfNotExists_blankEmail_doesNothingAndReturnsFalse() {
        boolean result = service().addIfNotExists("   ");

        assertThat(result).isFalse();
        verify(emailAddressRepository, never()).save(any());
    }

    @Test
    void addIfNotExists_nullEmail_doesNothingAndReturnsFalse() {
        boolean result = service().addIfNotExists(null);

        assertThat(result).isFalse();
        verify(emailAddressRepository, never()).save(any());
    }

    @Test
    void addIfNotExists_invalidEmail_doesNothingAndReturnsFalse() {
        boolean result = service().addIfNotExists("not-an-email");

        assertThat(result).isFalse();
        verify(emailAddressRepository, never()).save(any());
    }

    @Test
    void bulkCreate_skipsDuplicatesAndPersistsNew() {
        when(emailAddressRepository.existsByEmailIgnoreCase("a@example.com")).thenReturn(true);
        when(emailAddressRepository.existsByEmailIgnoreCase("b@example.com")).thenReturn(false);
        when(emailAddressRepository.save(any(EmailAddress.class)))
            .thenAnswer(inv -> inv.getArgument(0, EmailAddress.class));

        List<EmailAddressDto> result = service().bulkCreate(List.of("a@example.com", "b@example.com"));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("b@example.com");
    }
}
