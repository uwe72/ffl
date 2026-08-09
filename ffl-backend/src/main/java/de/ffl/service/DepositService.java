package de.ffl.service;

import de.ffl.domain.Deposit;
import de.ffl.domain.DepositStatus;
import de.ffl.domain.Manager;
import de.ffl.domain.Season;
import de.ffl.domain.User;
import de.ffl.dto.DepositDto;
import de.ffl.dto.DepositSyncResult;
import de.ffl.dto.UpdateDepositRequest;
import de.ffl.repository.DepositRepository;
import de.ffl.repository.ManagerRepository;
import de.ffl.repository.SeasonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DepositService {

    private final SeasonRepository seasonRepository;
    private final ManagerRepository managerRepository;
    private final DepositRepository depositRepository;

    public DepositService(SeasonRepository seasonRepository,
                          ManagerRepository managerRepository,
                          DepositRepository depositRepository) {
        this.seasonRepository = seasonRepository;
        this.managerRepository = managerRepository;
        this.depositRepository = depositRepository;
    }

    @Transactional(readOnly = true)
    public List<DepositDto> getDeposits(Long seasonId) {
        List<Deposit> deposits = depositRepository.findBySeasonId(seasonId);
        return deposits.stream()
            .sorted(Comparator.comparing(d -> d.getManager().getName(), Comparator.nullsLast(String::compareToIgnoreCase)))
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    @Transactional
    public DepositDto updateDeposit(Long seasonId, Long managerId, UpdateDepositRequest request) {
        Deposit deposit = depositRepository.findBySeasonIdAndManagerId(seasonId, managerId)
            .orElseThrow(() -> new IllegalArgumentException("Deposit nicht gefunden für Saison " + seasonId + " und Manager " + managerId));

        if (request.getComment() != null) {
            deposit.setComment(request.getComment());
        }
        if (request.getPaymentMethod() != null) {
            deposit.setPaymentMethod(request.getPaymentMethod());
        }
        if (request.getDepositStatus() != null) {
            DepositStatus newStatus = request.getDepositStatus();
            DepositStatus oldStatus = deposit.getDepositStatus();
            deposit.setDepositStatus(newStatus);
            if (newStatus == DepositStatus.RECEIVED && oldStatus != DepositStatus.RECEIVED) {
                deposit.setReceivedAt(LocalDateTime.now());
            } else if (newStatus == DepositStatus.OPEN) {
                deposit.setReceivedAt(null);
            }
        }

        Deposit saved = depositRepository.save(deposit);
        return convertToDto(saved);
    }

    @Transactional
    public DepositSyncResult syncDeposits(Long seasonId) {
        Season season = seasonRepository.findById(seasonId)
            .orElseThrow(() -> new IllegalArgumentException("Saison nicht gefunden: " + seasonId));

        List<Manager> managers = managerRepository.findBySeasonId(seasonId);
        List<Deposit> existingDeposits = depositRepository.findBySeasonId(seasonId);

        Map<Long, Deposit> depositByManagerId = existingDeposits.stream()
            .collect(Collectors.toMap(d -> d.getManager().getId(), d -> d));

        Set<Long> currentManagerIds = managers.stream()
            .map(Manager::getId)
            .collect(Collectors.toSet());

        List<String> created = new ArrayList<>();
        List<String> deleted = new ArrayList<>();
        int alreadyPresent = 0;

        for (Manager manager : managers) {
            if (depositByManagerId.containsKey(manager.getId())) {
                alreadyPresent++;
            } else {
                Deposit newDeposit = Deposit.builder()
                    .manager(manager)
                    .season(season)
                    .amount(resolveSpieleinsatz(season))
                    .depositStatus(DepositStatus.OPEN)
                    .build();
                depositRepository.save(newDeposit);
                created.add(manager.getName());
            }
        }

        for (Deposit deposit : existingDeposits) {
            if (!currentManagerIds.contains(deposit.getManager().getId())) {
                String name = deposit.getManager().getName();
                depositRepository.delete(deposit);
                deleted.add(name);
            }
        }

        return DepositSyncResult.builder()
            .created(created)
            .deleted(deleted)
            .alreadyPresent(alreadyPresent)
            .build();
    }

    private BigDecimal resolveSpieleinsatz(Season season) {
        return season.getSpieleinsatzEuro() != null ? season.getSpieleinsatzEuro() : new BigDecimal("10.00");
    }

    private DepositDto convertToDto(Deposit deposit) {
        Manager manager = deposit.getManager();
        User user = manager.getUser();

        return DepositDto.builder()
            .managerId(manager.getId())
            .managerName(manager.getName())
            .managerFirstName(user != null ? user.getFirstName() : null)
            .managerLastName(user != null ? user.getLastName() : null)
            .managerLogin(manager.getShortName())
            .managerEmail(user != null ? user.getEmail() : null)
            .amount(deposit.getAmount())
            .comment(deposit.getComment())
            .paymentMethod(deposit.getPaymentMethod())
            .depositStatus(deposit.getDepositStatus())
            .receivedAt(deposit.getReceivedAt())
            .build();
    }
}
