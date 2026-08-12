package de.ffl.dto;

import java.math.BigDecimal;

public class RegisterResponseDto {
    private String message;
    private PaymentInfo paymentInfo;

    public RegisterResponseDto(String message, PaymentInfo paymentInfo) {
        this.message = message;
        this.paymentInfo = paymentInfo;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public PaymentInfo getPaymentInfo() { return paymentInfo; }
    public void setPaymentInfo(PaymentInfo paymentInfo) { this.paymentInfo = paymentInfo; }

    public static class PaymentInfo {
        private BigDecimal spieleinsatzEuro;
        private String paypalLink;
        private String iban;
        private String bic;
        private String bankName;
        private String kontoinhaber;
        private String seasonName;

        public BigDecimal getSpieleinsatzEuro() { return spieleinsatzEuro; }
        public void setSpieleinsatzEuro(BigDecimal spieleinsatzEuro) { this.spieleinsatzEuro = spieleinsatzEuro; }
        public String getPaypalLink() { return paypalLink; }
        public void setPaypalLink(String paypalLink) { this.paypalLink = paypalLink; }
        public String getIban() { return iban; }
        public void setIban(String iban) { this.iban = iban; }
        public String getBic() { return bic; }
        public void setBic(String bic) { this.bic = bic; }
        public String getBankName() { return bankName; }
        public void setBankName(String bankName) { this.bankName = bankName; }
        public String getKontoinhaber() { return kontoinhaber; }
        public void setKontoinhaber(String kontoinhaber) { this.kontoinhaber = kontoinhaber; }
        public String getSeasonName() { return seasonName; }
        public void setSeasonName(String seasonName) { this.seasonName = seasonName; }
    }
}
