package de.ffl.service;

import de.ffl.domain.Deposit;
import de.ffl.domain.DepositStatus;
import de.ffl.domain.SystemConfig;
import de.ffl.dto.PaymentReminderDto;
import de.ffl.repository.DepositRepository;
import de.ffl.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PaymentReminderServiceTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private PaymentReminderService paymentReminderService;

    @Autowired
    private DepositService depositService;

    @Autowired
    private DepositRepository depositRepository;

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    private void setPaymentChecks(LocalDate paypal, LocalDate ueberweisung) {
        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc()
            .orElseGet(() -> SystemConfig.builder().build());
        config.setLastPaypalCheck(paypal);
        config.setLastUeberweisungCheck(ueberweisung);
        systemConfigRepository.save(config);
    }

    @Test
    void openDeposit_returnsOpenReminderWithAmountAndPaymentInfo() {
        season.setPaypalLink("https://paypal.me/ffltest");
        season.setKontoinhaber("Uwe Clement");
        season.setIban("DE60120300001055430639");
        season.setBankName("Testbank");
        season.setSpieleinsatzEuro(new BigDecimal("10.00"));
        seasonRepository.save(season);

        depositService.syncDeposits(season.getId());
        setPaymentChecks(LocalDate.of(2026, 3, 15), LocalDate.of(2026, 3, 10));

        PaymentReminderDto reminder = paymentReminderService.buildReminder(
            season, managerUwe72.getId(), managerUwe72.getUser().getLogin());

        assertTrue(reminder.isOpen());
        assertEquals(new BigDecimal("10.00"), reminder.getAmount());        assertNotNull(reminder.getPaypalLink());
        assertTrue(reminder.getPaypalLink().contains("10"));
        assertEquals("Uwe Clement", reminder.getKontoinhaber());
        assertTrue(reminder.getHinweis().contains("15.03.2026"));
        assertTrue(reminder.getHinweis().contains("10.03.2026"));
        assertTrue(reminder.getHinweis().contains("bereits bezahlt"));
    }

    @Test
    void receivedDeposit_returnsClosedReminder() {
        depositService.syncDeposits(season.getId());
        depositService.updateDeposit(season.getId(), managerUwe72.getId(),
            de.ffl.dto.UpdateDepositRequest.builder()
                .depositStatus(DepositStatus.RECEIVED)
                .build());

        PaymentReminderDto reminder = paymentReminderService.buildReminder(
            season, managerUwe72.getId(), managerUwe72.getUser().getLogin());

        assertFalse(reminder.isOpen());
        assertTrue(reminder.isReceived());
    }

    @Test
    void noDeposit_treatedAsOpenReminder() {
        season.setPaypalLink("https://paypal.me/ffltest");
        season.setSpieleinsatzEuro(new BigDecimal("10.00"));
        seasonRepository.save(season);
        setPaymentChecks(LocalDate.of(2026, 3, 15), LocalDate.of(2026, 3, 10));

        PaymentReminderDto reminder = paymentReminderService.buildReminder(
            season, managerUwe72.getId(), managerUwe72.getUser().getLogin());

        assertTrue(reminder.isOpen());
        assertFalse(reminder.isReceived());
        assertEquals(new BigDecimal("10.00"), reminder.getAmount());
        assertNotNull(reminder.getPaypalLink());
    }

    @Test
    void missingPaypalCheck_omitsPaypalLineFromHinweis() {
        depositService.syncDeposits(season.getId());
        setPaymentChecks(null, LocalDate.of(2026, 3, 10));

        PaymentReminderDto reminder = paymentReminderService.buildReminder(
            season, managerUwe72.getId(), managerUwe72.getUser().getLogin());

        assertTrue(reminder.isOpen());
        assertNull(reminder.getLastPaypalCheckFormatted());
        assertFalse(reminder.getHinweis().contains("PayPal-Zahlungen sind bis zum"));
        assertTrue(reminder.getHinweis().contains("Überweisungen sind bis zum 10.03.2026"));
    }
}
