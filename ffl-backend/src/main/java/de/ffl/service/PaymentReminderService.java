package de.ffl.service;

import de.ffl.domain.Deposit;
import de.ffl.domain.DepositStatus;
import de.ffl.domain.Season;
import de.ffl.domain.SystemConfig;
import de.ffl.dto.PaymentReminderDto;
import de.ffl.repository.DepositRepository;
import de.ffl.repository.SystemConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class PaymentReminderService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final DepositRepository depositRepository;
    private final SystemConfigRepository systemConfigRepository;

    public PaymentReminderService(DepositRepository depositRepository,
                                  SystemConfigRepository systemConfigRepository) {
        this.depositRepository = depositRepository;
        this.systemConfigRepository = systemConfigRepository;
    }

    /**
     * Baut den Zahlungserinnerungs-Baustein fuer einen Manager. Ist das Startgeld
     * bereits eingegangen (kein Deposit mit Status OPEN), wird ein geschlossenes DTO
     * zurueckgegeben (open == false).
     */
    @Transactional(readOnly = true)
    public PaymentReminderDto buildReminder(Season season, Long managerId, String userLogin) {
        if (season == null || managerId == null) {
            return PaymentReminderDto.closed();
        }

        Deposit deposit = depositRepository.findBySeasonIdAndManagerId(season.getId(), managerId).orElse(null);
        if (deposit == null) {
            return PaymentReminderDto.closed();
        }
        if (deposit.getDepositStatus() != DepositStatus.OPEN) {
            PaymentReminderDto received = new PaymentReminderDto();
            received.setReceived(true);
            return received;
        }

        SystemConfig config = systemConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        LocalDate lastPaypalCheck = config != null ? config.getLastPaypalCheck() : null;
        LocalDate lastUeberweisungCheck = config != null ? config.getLastUeberweisungCheck() : null;

        BigDecimal amount = resolveSpieleinsatz(season);
        int amountRounded = amount.setScale(0, java.math.RoundingMode.HALF_UP).intValue();

        String seasonName = season.getName() != null ? season.getName() : "";
        String login = userLogin != null ? userLogin : "";
        String verwendungszweck = ("FFL " + seasonName + " " + login).trim();

        PaymentReminderDto dto = new PaymentReminderDto();
        dto.setOpen(true);
        dto.setAmount(amount);
        dto.setAmountRounded(amountRounded);
        dto.setAmountFormatted(formatEuro(amount));
        dto.setPaypalLink(RegistrationMailService.buildPaypalLinkWithAmount(season.getPaypalLink(), amount));
        dto.setVerwendungszweck(verwendungszweck);
        dto.setKontoinhaber(season.getKontoinhaber());
        dto.setIban(season.getIban());
        dto.setBic(season.getBic());
        dto.setBankName(season.getBankName());
        dto.setLastPaypalCheck(lastPaypalCheck);
        dto.setLastUeberweisungCheck(lastUeberweisungCheck);
        dto.setLastPaypalCheckFormatted(lastPaypalCheck != null ? lastPaypalCheck.format(DATE_FORMAT) : null);
        dto.setLastUeberweisungCheckFormatted(lastUeberweisungCheck != null ? lastUeberweisungCheck.format(DATE_FORMAT) : null);
        dto.setHinweis(buildHinweis(lastPaypalCheck, lastUeberweisungCheck));
        return dto;
    }

    private String buildHinweis(LocalDate lastPaypalCheck, LocalDate lastUeberweisungCheck) {
        StringBuilder sb = new StringBuilder();
        boolean hasPaypal = lastPaypalCheck != null;
        boolean hasUeberweisung = lastUeberweisungCheck != null;

        if (hasPaypal && hasUeberweisung) {
            sb.append("PayPal-Zahlungen sind bis zum ").append(lastPaypalCheck.format(DATE_FORMAT))
              .append(" berücksichtigt, Überweisungen bis zum ").append(lastUeberweisungCheck.format(DATE_FORMAT))
              .append(". ");
        } else if (hasPaypal) {
            sb.append("PayPal-Zahlungen sind bis zum ").append(lastPaypalCheck.format(DATE_FORMAT))
              .append(" berücksichtigt. ");
        } else if (hasUeberweisung) {
            sb.append("Überweisungen sind bis zum ").append(lastUeberweisungCheck.format(DATE_FORMAT))
              .append(" berücksichtigt. ");
        }

        sb.append("Falls du bereits bezahlt hast, kannst du diese Erinnerung ignorieren.");
        return sb.toString();
    }

    private BigDecimal resolveSpieleinsatz(Season season) {
        return season.getSpieleinsatzEuro() != null ? season.getSpieleinsatzEuro() : new BigDecimal("10.00");
    }

    private String formatEuro(BigDecimal amount) {
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.GERMAN);
        nf.setMinimumFractionDigits(2);
        nf.setMaximumFractionDigits(2);
        return nf.format(amount) + " €";
    }
}
