package de.ffl.dto;

import de.ffl.domain.SystemConfig;

public class SystemConfigDto {
    private String gmailSenderEmail;
    private String gmailAppPassword;
    private String gmailSmtpServer;
    private Integer gmailSmtpPort;
    private String llmApiKey;
    private String llmModel;
    private String llmBaseUrl;
    private String matchdayMailPrompt;
    private String webUrl;

    public SystemConfigDto() {}

    public static SystemConfigDto fromEntity(SystemConfig config) {
        SystemConfigDto dto = new SystemConfigDto();
        dto.setGmailSenderEmail(config.getGmailSenderEmail());
        dto.setGmailAppPassword(config.getGmailAppPassword());
        dto.setGmailSmtpServer(config.getGmailSmtpServer());
        dto.setGmailSmtpPort(config.getGmailSmtpPort());
        dto.setLlmApiKey(config.getLlmApiKey());
        dto.setLlmModel(config.getLlmModel());
        dto.setLlmBaseUrl(config.getLlmBaseUrl());
        dto.setMatchdayMailPrompt(config.getMatchdayMailPrompt());
        dto.setWebUrl(config.getWebUrl());
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
    public String getLlmApiKey() { return llmApiKey; }
    public void setLlmApiKey(String llmApiKey) { this.llmApiKey = llmApiKey; }
    public String getLlmModel() { return llmModel; }
    public void setLlmModel(String llmModel) { this.llmModel = llmModel; }
    public String getLlmBaseUrl() { return llmBaseUrl; }
    public void setLlmBaseUrl(String llmBaseUrl) { this.llmBaseUrl = llmBaseUrl; }
    public String getMatchdayMailPrompt() { return matchdayMailPrompt; }
    public void setMatchdayMailPrompt(String matchdayMailPrompt) { this.matchdayMailPrompt = matchdayMailPrompt; }
    public String getWebUrl() { return webUrl; }
    public void setWebUrl(String webUrl) { this.webUrl = webUrl; }
}
