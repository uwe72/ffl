package de.ffl.service;

import de.ffl.domain.Manager;
import de.ffl.domain.User;
import de.ffl.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegistrationMailServiceTest {

    @Mock
    private SystemConfigRepository systemConfigRepository;
    @Mock
    private SpringTemplateEngine templateEngine;

    private RegistrationMailService service() {
        return new RegistrationMailService(systemConfigRepository, templateEngine);
    }

    private User user() {
        return User.builder()
            .login("maxmustermann")
            .email("max@test.de")
            .firstName("Max")
            .lastName("Mustermann")
            .build();
    }

    private String renderHtml(boolean isNewUser) {
        when(templateEngine.process(eq("mail/registration-confirmation"), any(Context.class)))
            .thenAnswer(invocation -> {
                Context ctx = invocation.getArgument(1);
                return "newUserLabel=" + ctx.getVariable("newUserLabel")
                    + "|greeting=" + ctx.getVariable("greeting");
            });
        return service().buildRegistrationHtml(user(), Manager.builder().build(), "https://ffl.app", isNewUser);
    }

    @Test
    void appendsIntegerAmountToPlainLink() {
        String result = RegistrationMailService.buildPaypalLinkWithAmount(
            "https://www.paypal.com/paypalme/UweClement", new BigDecimal("10.00"));
        assertThat(result).isEqualTo("https://www.paypal.com/paypalme/UweClement/10");
    }

    @Test
    void appendsDecimalAmountWhenNotInteger() {
        String result = RegistrationMailService.buildPaypalLinkWithAmount(
            "https://paypal.me/ffl", new BigDecimal("10.50"));
        assertThat(result).isEqualTo("https://paypal.me/ffl/10.50");
    }

    @Test
    void stripsTrailingSlashBeforeAppendingAmount() {
        String result = RegistrationMailService.buildPaypalLinkWithAmount(
            "https://paypal.me/UweClement/", new BigDecimal("10"));
        assertThat(result).isEqualTo("https://paypal.me/UweClement/10");
    }

    @Test
    void doesNotAppendWhenAmountAlreadyPresent() {
        String link = "https://www.paypal.com/paypalme/UweClement/10";
        String result = RegistrationMailService.buildPaypalLinkWithAmount(link, new BigDecimal("10"));
        assertThat(result).isEqualTo(link);
    }

    @Test
    void doesNotAppendWhenDecimalAmountAlreadyPresent() {
        String link = "https://paypal.me/UweClement/10.50";
        String result = RegistrationMailService.buildPaypalLinkWithAmount(link, new BigDecimal("10"));
        assertThat(result).isEqualTo(link);
    }

    @Test
    void returnsNullWhenLinkIsNull() {
        assertThat(RegistrationMailService.buildPaypalLinkWithAmount(null, new BigDecimal("10"))).isNull();
    }

    @Test
    void returnsBlankWhenLinkIsBlank() {
        assertThat(RegistrationMailService.buildPaypalLinkWithAmount("   ", new BigDecimal("10"))).isEqualTo("   ");
    }

    @Test
    void defaultsToTenWhenSpieleinsatzIsNull() {
        String result = RegistrationMailService.buildPaypalLinkWithAmount(
            "https://paypal.me/UweClement", null);
        assertThat(result).isEqualTo("https://paypal.me/UweClement/10");
    }

    @Test
    void newUser_setsErstesMalDabeiLabel() {
        assertThat(renderHtml(true)).contains("newUserLabel=Erstes Mal dabei");
    }

    @Test
    void existingUser_setsBereitsMitgespieltLabel() {
        assertThat(renderHtml(false)).contains("newUserLabel=Bereits mitgespielt");
    }
}
