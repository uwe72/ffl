package de.ffl.dto;

import de.ffl.domain.SystemConfig;

public class SystemConfigDto {
    private String gmailSenderEmail;
    private String gmailAppPassword;
    private String gmailSmtpServer;
    private Integer gmailSmtpPort;

    public SystemConfigDto() {}

    public static SystemConfigDto fromEntity(SystemConfig config) {
        SystemConfigDto dto = new SystemConfigDto();
        dto.setGmailSenderEmail(config.getGmailSenderEmail());
        // Passwort wird NICHT zurueckgegeben (Sicherheit)
        dto.setGmailSmtpServer(config.getGmailSmtpServer());
        dto.setGmailSmtpPort(config.getGmailSmtpPort());
        return dto;
    }

    public String getGmailSenderEmail() { return gmailSenderEmail; }
    public void setGmailSenderEmail(String gmailSenderEmail) { this.gmailSenderEmail = gmailSenderEmail; }
    public String getGmailAppPassword() { return gmailAppPassword; }
    public void setGmailAppPassword(String gmailAppPassword) { this.gmailAppPassword = gmailAppPassword; }
    public String getGmailSmtpServer() { return gmailSmtpServer; }
    public void setGmailSmtpServer(String gmailSmtpServer) { this.gmailSmtpServer = gmailSmtpServer; }
    public Integer getGmailSmtpPort() { return gmailSmtpPort; }
    public void setGmailSmtpPort(Integer gmailSmtpPort) { this.gmailSmtpPort = gmailSmtpPort; }
}
