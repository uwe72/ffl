package de.ffl.service;

import de.ffl.domain.SystemConfig;
import de.ffl.dto.SystemConfigDto;
import de.ffl.repository.SystemConfigRepository;
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

        config = configRepository.save(config);
        return SystemConfigDto.fromEntity(config);
    }
}
