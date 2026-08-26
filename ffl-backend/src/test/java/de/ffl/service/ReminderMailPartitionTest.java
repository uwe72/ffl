package de.ffl.service;

import de.ffl.domain.EmailAddress;
import de.ffl.repository.EmailAddressRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class ReminderMailPartitionTest {

    @Mock
    private SystemConfigRepository systemConfigRepository;
    @Mock
    private SeasonRepository seasonRepository;
    @Mock
    private EmailAddressRepository emailAddressRepository;
    @Mock
    private ManagerRepository managerRepository;
    @Mock
    private UnsubscribeService unsubscribeService;
    @Mock
    private InvitationMailService invitationMailService;
    @Mock
    private SpringTemplateEngine templateEngine;

    private ReminderMailService service() {
        return new ReminderMailService(systemConfigRepository, seasonRepository,
            emailAddressRepository, managerRepository, unsubscribeService, invitationMailService, templateEngine);
    }

    @Test
    void registeredAddress_isClassifiedAsRegistered_caseInsensitive() {
        Set<String> registered = Set.of("manager@example.com");

        assertThat(service().isRegistered(email("manager@example.com"), registered)).isTrue();
        assertThat(service().isRegistered(email("MANAGER@example.com"), registered)).isTrue();
    }

    @Test
    void nonRegisteredAddress_isClassifiedAsNotRegistered() {
        Set<String> registered = Set.of("manager@example.com");

        assertThat(service().isRegistered(email("other@example.com"), registered)).isFalse();
    }

    @Test
    void nullAddress_isNotRegistered() {
        assertThat(service().isRegistered(null, Set.of("a@b.c"))).isFalse();
        assertThat(service().isRegistered(email(null), Set.of("a@b.c"))).isFalse();
    }

    private EmailAddress email(String value) {
        return EmailAddress.builder().id(1L).email(value).build();
    }
}
