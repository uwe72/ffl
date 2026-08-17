package de.ffl.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;

public class PaymentCheckRequest {

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate lastPaypalCheck;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate lastUeberweisungCheck;

    public LocalDate getLastPaypalCheck() { return lastPaypalCheck; }
    public void setLastPaypalCheck(LocalDate lastPaypalCheck) { this.lastPaypalCheck = lastPaypalCheck; }
    public LocalDate getLastUeberweisungCheck() { return lastUeberweisungCheck; }
    public void setLastUeberweisungCheck(LocalDate lastUeberweisungCheck) { this.lastUeberweisungCheck = lastUeberweisungCheck; }
}
