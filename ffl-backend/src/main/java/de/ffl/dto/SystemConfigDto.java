package de.ffl.dto;

import de.ffl.domain.SystemConfig;

import java.time.LocalDateTime;

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
    private Boolean autoUpdateEnabled;
    private String autoUpdateCron;
    private String autoUpdateSourceUrl;
    private LocalDateTime autoUpdateLastRun;

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
        dto.setAutoUpdateEnabled(config.getAutoUpdateEnabled());
        dto.setAutoUpdateCron(config.getAutoUpdateCron());
        dto.setAutoUpdateSourceUrl(config.getAutoUpdateSourceUrl());
        dto.setAutoUpdateLastRun(config.getAutoUpdateLastRun());
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
    public Boolean getAutoUpdateEnabled() { return autoUpdateEnabled; }
    public void setAutoUpdateEnabled(Boolean autoUpdateEnabled) { this.autoUpdateEnabled = autoUpdateEnabled; }
    public String getAutoUpdateCron() { return autoUpdateCron; }
    public void setAutoUpdateCron(String autoUpdateCron) { this.autoUpdateCron = autoUpdateCron; }
    public String getAutoUpdateSourceUrl() { return autoUpdateSourceUrl; }
    public void setAutoUpdateSourceUrl(String autoUpdateSourceUrl) { this.autoUpdateSourceUrl = autoUpdateSourceUrl; }
    public LocalDateTime getAutoUpdateLastRun() { return autoUpdateLastRun; }
    public void setAutoUpdateLastRun(LocalDateTime autoUpdateLastRun) { this.autoUpdateLastRun = autoUpdateLastRun; }
}
