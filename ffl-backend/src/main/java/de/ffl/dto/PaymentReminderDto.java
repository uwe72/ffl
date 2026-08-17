package de.ffl.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PaymentReminderDto {

    private boolean open;
    private BigDecimal amount;
    private int amountRounded;
    private String amountFormatted;
    private String paypalLink;
    private String verwendungszweck;
    private String kontoinhaber;
    private String iban;
    private String bic;
    private String bankName;
    private LocalDate lastPaypalCheck;
    private LocalDate lastUeberweisungCheck;
    private String lastPaypalCheckFormatted;
    private String lastUeberweisungCheckFormatted;
    private String hinweis;

    public PaymentReminderDto() {}

    public static PaymentReminderDto closed() {
        PaymentReminderDto dto = new PaymentReminderDto();
        dto.open = false;
        return dto;
    }

    public boolean isOpen() { return open; }
    public void setOpen(boolean open) { this.open = open; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public int getAmountRounded() { return amountRounded; }
    public void setAmountRounded(int amountRounded) { this.amountRounded = amountRounded; }
    public String getAmountFormatted() { return amountFormatted; }
    public void setAmountFormatted(String amountFormatted) { this.amountFormatted = amountFormatted; }
    public String getPaypalLink() { return paypalLink; }
    public void setPaypalLink(String paypalLink) { this.paypalLink = paypalLink; }
    public String getVerwendungszweck() { return verwendungszweck; }
    public void setVerwendungszweck(String verwendungszweck) { this.verwendungszweck = verwendungszweck; }
    public String getKontoinhaber() { return kontoinhaber; }
    public void setKontoinhaber(String kontoinhaber) { this.kontoinhaber = kontoinhaber; }
    public String getIban() { return iban; }
    public void setIban(String iban) { this.iban = iban; }
    public String getBic() { return bic; }
    public void setBic(String bic) { this.bic = bic; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public LocalDate getLastPaypalCheck() { return lastPaypalCheck; }
    public void setLastPaypalCheck(LocalDate lastPaypalCheck) { this.lastPaypalCheck = lastPaypalCheck; }
    public LocalDate getLastUeberweisungCheck() { return lastUeberweisungCheck; }
    public void setLastUeberweisungCheck(LocalDate lastUeberweisungCheck) { this.lastUeberweisungCheck = lastUeberweisungCheck; }
    public String getLastPaypalCheckFormatted() { return lastPaypalCheckFormatted; }
    public void setLastPaypalCheckFormatted(String lastPaypalCheckFormatted) { this.lastPaypalCheckFormatted = lastPaypalCheckFormatted; }
    public String getLastUeberweisungCheckFormatted() { return lastUeberweisungCheckFormatted; }
    public void setLastUeberweisungCheckFormatted(String lastUeberweisungCheckFormatted) { this.lastUeberweisungCheckFormatted = lastUeberweisungCheckFormatted; }
    public String getHinweis() { return hinweis; }
    public void setHinweis(String hinweis) { this.hinweis = hinweis; }
}
