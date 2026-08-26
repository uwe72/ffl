package de.ffl.service;

import de.ffl.repository.EmailAddressRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.SeasonRepository;
import de.ffl.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.spring6.SpringTemplateEngine;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class ReminderMailUnsubscribeFooterTest {

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
    private SpringTemplateEngine templateEngine;

    private ReminderMailService service() {
        return new ReminderMailService(systemConfigRepository, seasonRepository,
            emailAddressRepository, managerRepository, unsubscribeService, templateEngine);
    }

    @Test
    void footer_escapesAmpersandInUnsubscribeUrl() {
        String html = service().insertUnsubscribeFooter(
            "<html><body><h1>Erinnerung</h1></body></html>",
            "https://ffl.example.com/api/public/unsubscribe?id=5&token=abc.def");

        assertThat(html).contains("href=\"https://ffl.example.com/api/public/unsubscribe?id=5&amp;token=abc.def\"");
        assertThat(html).doesNotContain("id=5&token=abc.def\"");
        assertThat(html).contains("hier austragen");
        assertThat(html).contains("</body>");
    }

    @Test
    void footer_placeholderUrl_isInsertedAsIs() {
        String html = service().insertUnsubscribeFooter(
            "<html><body><h1>Erinnerung</h1></body></html>",
            "{ABMELDE-LINK}");

        assertThat(html).contains("href=\"{ABMELDE-LINK}\"");
        assertThat(html).contains("hier austragen");
    }

    @Test
    void footer_isInsertedForBothVariants() {
        String html = service().insertUnsubscribeFooter(
            "<html><body><h1>Danke für Deine Anmeldung</h1></body></html>",
            "https://ffl.example.com/api/public/unsubscribe?id=1&token=xyz");

        assertThat(html).contains("hier austragen");
        assertThat(html).contains("&amp;token=xyz");
    }
}
