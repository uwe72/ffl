package de.ffl.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class RegistrationMailServiceTest {

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
}
