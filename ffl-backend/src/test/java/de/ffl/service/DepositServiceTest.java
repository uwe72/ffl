package de.ffl.service;

import de.ffl.domain.Deposit;
import de.ffl.domain.DepositStatus;
import de.ffl.domain.Manager;
import de.ffl.domain.PaymentMethod;
import de.ffl.domain.Season;
import de.ffl.domain.User;
import de.ffl.dto.DepositDto;
import de.ffl.dto.DepositSyncResult;
import de.ffl.dto.UpdateDepositRequest;
import de.ffl.repository.DepositRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DepositServiceTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private DepositService depositService;

    @Autowired
    private DepositRepository depositRepository;

    @Test
    void sync_createsDepositsForAllManagers() {
        int managerCount = managerRepository.findBySeasonId(season.getId()).size();

        DepositSyncResult result = depositService.syncDeposits(season.getId());

        assertEquals(managerCount, result.getCreated().size());
        assertEquals(0, result.getAlreadyPresent());
        assertTrue(result.getDeleted().isEmpty());

        List<Deposit> deposits = depositRepository.findBySeasonId(season.getId());
        assertEquals(managerCount, deposits.size());
        Deposit deposit = deposits.get(0);
        assertEquals(DepositStatus.OPEN, deposit.getDepositStatus());
        assertNull(deposit.getPaymentMethod());
        assertEquals(season.getSpieleinsatzEuro(), deposit.getAmount());
        assertNull(deposit.getReceivedAt());
    }

    @Test
    void sync_reportsAlreadyPresentAndCreatesOnlyMissing() {
        int managerCount = managerRepository.findBySeasonId(season.getId()).size();

        depositService.syncDeposits(season.getId());

        DepositSyncResult secondResult = depositService.syncDeposits(season.getId());

        assertEquals(0, secondResult.getCreated().size());
        assertEquals(managerCount, secondResult.getAlreadyPresent());
        List<Deposit> deposits = depositRepository.findBySeasonId(season.getId());
        assertEquals(managerCount, deposits.size());
    }

    @Test
    void sync_deletesOrphanedDepositsAndReportsNames() {
        Season otherSeason = Season.builder()
            .name("orphan-season")
            .budget(100)
            .build();
        otherSeason = seasonRepository.save(otherSeason);

        User orphanUser = User.builder()
            .login("orphan")
            .password("$2a$10$test")
            .email("orphan@test.de")
            .firstName("Orphan")
            .lastName("Manager")
            .build();
        orphanUser = userRepository.save(orphanUser);

        Manager orphanManager = Manager.builder()
            .user(orphanUser)
            .season(otherSeason)
            .budget(50)
            .build();
        orphanManager = managerRepository.save(orphanManager);

        Deposit orphanDeposit = Deposit.builder()
            .manager(orphanManager)
            .season(season)
            .amount(new BigDecimal("10.00"))
            .depositStatus(DepositStatus.OPEN)
            .paymentMethod(PaymentMethod.UEBERWEISUNG)
            .build();
        depositRepository.save(orphanDeposit);

        DepositSyncResult result = depositService.syncDeposits(season.getId());

        assertTrue(result.getDeleted().stream().anyMatch(name -> name != null && name.contains("Orphan")),
            "Gelöschte Namen sollen den Orphan-Manager enthalten: " + result.getDeleted());
        Optional<Deposit> stillThere = depositRepository.findById(orphanDeposit.getId());
        assertTrue(stillThere.isEmpty(), "Verwaistes Deposit soll gelöscht sein");
    }

    @Test
    void updateDeposit_setsReceivedAndReceivedAt() {
        depositService.syncDeposits(season.getId());
        Long managerId = managerUwe72.getId();

        UpdateDepositRequest request = UpdateDepositRequest.builder()
            .depositStatus(DepositStatus.RECEIVED)
            .build();

        DepositDto updated = depositService.updateDeposit(season.getId(), managerId, request);

        assertEquals(DepositStatus.RECEIVED, updated.getDepositStatus());
        assertNotNull(updated.getReceivedAt());
    }

    @Test
    void updateDeposit_setsOpenClearsReceivedAt() {
        depositService.syncDeposits(season.getId());
        Long managerId = managerUwe72.getId();

        depositService.updateDeposit(season.getId(), managerId,
            UpdateDepositRequest.builder().depositStatus(DepositStatus.RECEIVED).build());

        DepositDto updated = depositService.updateDeposit(season.getId(), managerId,
            UpdateDepositRequest.builder().depositStatus(DepositStatus.OPEN).build());

        assertEquals(DepositStatus.OPEN, updated.getDepositStatus());
        assertNull(updated.getReceivedAt());
    }

    @Test
    void updateDeposit_partialUpdateKeepsOtherFields() {
        depositService.syncDeposits(season.getId());
        Long managerId = managerUwe72.getId();

        depositService.updateDeposit(season.getId(), managerId,
            UpdateDepositRequest.builder()
                .depositStatus(DepositStatus.RECEIVED)
                .paymentMethod(PaymentMethod.PAYPAL.name())
                .comment("Erste Zahlung")
                .build());

        DepositDto updated = depositService.updateDeposit(season.getId(), managerId,
            UpdateDepositRequest.builder().comment("Zweite Notiz").build());

        assertEquals("Zweite Notiz", updated.getComment());
        assertEquals(DepositStatus.RECEIVED, updated.getDepositStatus());
        assertEquals(PaymentMethod.PAYPAL, updated.getPaymentMethod());
        assertNotNull(updated.getReceivedAt());
    }
}
