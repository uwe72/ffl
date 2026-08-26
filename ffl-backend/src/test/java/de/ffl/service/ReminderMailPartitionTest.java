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

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

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

    @Test
    void classify_dankeMode_alwaysBucketsAsDanke_evenForNonRegistered() {
        Set<String> registered = Set.of("manager@example.com");

        assertThat(service().classify(email("manager@example.com"), registered, "danke"))
            .isEqualTo(ReminderMailService.RecipientBucket.DANKE);
        assertThat(service().classify(email("stranger@example.com"), registered, "danke"))
            .isEqualTo(ReminderMailService.RecipientBucket.DANKE);
    }

    @Test
    void classify_erinnerungMode_skipsRegistered_sendsToNonRegistered() {
        Set<String> registered = Set.of("manager@example.com");

        assertThat(service().classify(email("manager@example.com"), registered, "erinnerung"))
            .isEqualTo(ReminderMailService.RecipientBucket.SKIP);
        assertThat(service().classify(email("stranger@example.com"), registered, "erinnerung"))
            .isEqualTo(ReminderMailService.RecipientBucket.ERINNERUNG);
    }

    @Test
    void classify_erinnerungMode_skipsRegistered_caseInsensitive() {
        Set<String> registered = Set.of("manager@example.com");

        assertThat(service().classify(email("MANAGER@example.com"), registered, "erinnerung"))
            .isEqualTo(ReminderMailService.RecipientBucket.SKIP);
    }

    @Test
    void classify_withoutSendMode_fallsBackToRegistrationStatus() {
        Set<String> registered = Set.of("manager@example.com");

        assertThat(service().classify(email("manager@example.com"), registered, null))
            .isEqualTo(ReminderMailService.RecipientBucket.DANKE);
        assertThat(service().classify(email("stranger@example.com"), registered, null))
            .isEqualTo(ReminderMailService.RecipientBucket.ERINNERUNG);
    }

    @Test
    void getRegisteredEmails_returnsSeasonManagerEmails() {
        when(managerRepository.findDistinctUserEmailsBySeasonId(7L))
            .thenReturn(List.of("a@example.com", "b@example.com"));

        assertThat(service().getRegisteredEmails(7L))
            .containsExactlyInAnyOrder("a@example.com", "b@example.com");
    }

    private EmailAddress email(String value) {
        return EmailAddress.builder().id(1L).email(value).build();
    }
}
