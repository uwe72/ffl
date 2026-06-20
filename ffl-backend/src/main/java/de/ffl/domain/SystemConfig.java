package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ffl_system_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gmail_sender_email")
    private String gmailSenderEmail;

    @Column(name = "gmail_app_password")
    private String gmailAppPassword;

    @Column(name = "gmail_smtp_server")
    @Builder.Default
    private String gmailSmtpServer = "smtp.gmail.com";

    @Column(name = "gmail_smtp_port")
    @Builder.Default
    private Integer gmailSmtpPort = 587;

    @Column(name = "openrouter_api_key")
    private String llmApiKey;

    @Column(name = "openrouter_model")
    @Builder.Default
    private String llmModel = "openai/gpt-4o-mini";

    @Column(name = "llm_base_url")
    private String llmBaseUrl;

    @Column(name = "matchday_mail_prompt", length = 4000)
    private String matchdayMailPrompt;

    @Column(name = "web_url")
    private String webUrl;
}
