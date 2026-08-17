package de.ffl.service;

import de.ffl.domain.SystemConfig;
import de.ffl.dto.SystemConfigDto;
import de.ffl.repository.SystemConfigRepository;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemConfigService {

    private final SystemConfigRepository configRepository;

    public SystemConfigService(SystemConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    public SystemConfigDto getConfig() {
        SystemConfig config = configRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> SystemConfig.builder()
                        .gmailSmtpServer("smtp.gmail.com")
                        .gmailSmtpPort(587)
                        .build());
        return SystemConfigDto.fromEntity(config);
    }

    @Transactional
    public SystemConfigDto updateConfig(SystemConfigDto updateData) {
        SystemConfig config = configRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> SystemConfig.builder()
                        .gmailSmtpServer("smtp.gmail.com")
                        .gmailSmtpPort(587)
                        .build());

        if (updateData.getGmailSenderEmail() != null) {
            config.setGmailSenderEmail(updateData.getGmailSenderEmail());
        }
        if (updateData.getGmailAppPassword() != null && !updateData.getGmailAppPassword().isBlank()) {
            config.setGmailAppPassword(updateData.getGmailAppPassword());
        }
        if (updateData.getGmailSmtpServer() != null) {
            config.setGmailSmtpServer(updateData.getGmailSmtpServer());
        }
        if (updateData.getGmailSmtpPort() != null) {
            config.setGmailSmtpPort(updateData.getGmailSmtpPort());
        }
        if (updateData.getLlmApiKey() != null && !updateData.getLlmApiKey().isBlank()) {
            config.setLlmApiKey(updateData.getLlmApiKey());
        }
        if (updateData.getLlmModel() != null) {
            config.setLlmModel(updateData.getLlmModel());
        }
        if (updateData.getLlmBaseUrl() != null) {
            config.setLlmBaseUrl(updateData.getLlmBaseUrl().isBlank() ? null : updateData.getLlmBaseUrl().trim());
        }
        if (updateData.getMatchdayMailPrompt() != null) {
            config.setMatchdayMailPrompt(updateData.getMatchdayMailPrompt());
        }
        if (updateData.getWebUrl() != null) {
            config.setWebUrl(updateData.getWebUrl().isBlank() ? null : updateData.getWebUrl().trim());
        }
        if (updateData.getAutoUpdateEnabled() != null) {
            config.setAutoUpdateEnabled(updateData.getAutoUpdateEnabled());
        }
        if (updateData.getAutoUpdateCron() != null) {
            String cron = updateData.getAutoUpdateCron().isBlank() ? null : updateData.getAutoUpdateCron().trim();
            if (cron != null) {
                try {
                    CronExpression.parse(cron);
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Ungültiger Cron-Ausdruck: " + e.getMessage());
                }
            }
            config.setAutoUpdateCron(cron);
        }
        if (updateData.getAutoUpdateSourceUrl() != null) {
            config.setAutoUpdateSourceUrl(updateData.getAutoUpdateSourceUrl().isBlank() ? null : updateData.getAutoUpdateSourceUrl().trim());
        }

        config = configRepository.save(config);
        return SystemConfigDto.fromEntity(config);
    }

    @Transactional
    public SystemConfigDto updatePaymentChecks(java.time.LocalDate lastPaypalCheck,
                                               java.time.LocalDate lastUeberweisungCheck) {
        SystemConfig config = configRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> SystemConfig.builder()
                        .gmailSmtpServer("smtp.gmail.com")
                        .gmailSmtpPort(587)
                        .build());
        config.setLastPaypalCheck(lastPaypalCheck);
        config.setLastUeberweisungCheck(lastUeberweisungCheck);
        config = configRepository.save(config);
        return SystemConfigDto.fromEntity(config);
    }
}
