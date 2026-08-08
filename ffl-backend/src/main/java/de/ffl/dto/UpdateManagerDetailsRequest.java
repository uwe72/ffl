package de.ffl.dto;

public class UpdateManagerDetailsRequest {
    private String firstName;
    private String lastName;
    private String paymentState;
    private String description;
    private String mailTheme;

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getPaymentState() { return paymentState; }
    public void setPaymentState(String paymentState) { this.paymentState = paymentState; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getMailTheme() { return mailTheme; }
    public void setMailTheme(String mailTheme) { this.mailTheme = mailTheme; }
}
