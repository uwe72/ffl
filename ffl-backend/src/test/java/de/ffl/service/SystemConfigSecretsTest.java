package de.ffl.service;

import de.ffl.domain.SystemConfig;
import de.ffl.dto.SystemConfigDto;
import de.ffl.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class SystemConfigSecretsTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private SystemConfigService systemConfigService;
    @Autowired
    private SystemConfigRepository systemConfigRepository;

    private SystemConfig createConfig(String password, String apiKey) {
        SystemConfig config = SystemConfig.builder()
            .gmailAppPassword(password)
            .llmApiKey(apiKey)
            .build();
        return systemConfigRepository.save(config);
    }

    @Test
    void getConfig_masksSecretsAndExposesSetFlags() {
        createConfig("app-pass", "llm-key");

        SystemConfigDto dto = systemConfigService.getConfig();

        assertThat(dto.getGmailAppPassword()).isNull();
        assertThat(dto.getLlmApiKey()).isNull();
        assertThat(dto.getGmailAppPasswordSet()).isTrue();
        assertThat(dto.getLlmApiKeySet()).isTrue();
    }

    @Test
    void getConfig_setFlagsFalseWhenNotConfigured() {
        createConfig(null, null);

        SystemConfigDto dto = systemConfigService.getConfig();

        assertThat(dto.getGmailAppPasswordSet()).isFalse();
        assertThat(dto.getLlmApiKeySet()).isFalse();
    }

    @Test
    void updateConfig_withoutSecrets_keepsStoredValues() {
        createConfig("app-pass", "llm-key");

        SystemConfigDto update = new SystemConfigDto();
        update.setWebUrl("https://ffl.example.com");

        SystemConfigDto result = systemConfigService.updateConfig(update);

        assertThat(result.getWebUrl()).isEqualTo("https://ffl.example.com");
        assertThat(result.getGmailAppPassword()).isNull();
        assertThat(result.getGmailAppPasswordSet()).isTrue();
        assertThat(result.getLlmApiKeySet()).isTrue();

        SystemConfig stored = systemConfigRepository.findFirstByOrderByIdAsc().orElseThrow();
        assertThat(stored.getGmailAppPassword()).isEqualTo("app-pass");
        assertThat(stored.getLlmApiKey()).isEqualTo("llm-key");
    }

    @Test
    void updateConfig_withBlankSecrets_keepsStoredValues() {
        createConfig("app-pass", "llm-key");

        SystemConfigDto update = new SystemConfigDto();
        update.setGmailAppPassword("   ");
        update.setLlmApiKey("");

        systemConfigService.updateConfig(update);

        SystemConfig stored = systemConfigRepository.findFirstByOrderByIdAsc().orElseThrow();
        assertThat(stored.getGmailAppPassword()).isEqualTo("app-pass");
        assertThat(stored.getLlmApiKey()).isEqualTo("llm-key");
    }

    @Test
    void updateConfig_withNewSecrets_replacesValues() {
        createConfig("old-pass", "old-key");

        SystemConfigDto update = new SystemConfigDto();
        update.setGmailAppPassword("new-pass");
        update.setLlmApiKey("new-key");

        SystemConfigDto result = systemConfigService.updateConfig(update);

        assertThat(result.getGmailAppPassword()).isNull();
        assertThat(result.getLlmApiKey()).isNull();
        assertThat(result.getGmailAppPasswordSet()).isTrue();
        assertThat(result.getLlmApiKeySet()).isTrue();

        SystemConfig stored = systemConfigRepository.findFirstByOrderByIdAsc().orElseThrow();
        assertThat(stored.getGmailAppPassword()).isEqualTo("new-pass");
        assertThat(stored.getLlmApiKey()).isEqualTo("new-key");
    }
}
