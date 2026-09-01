package de.ffl.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @Column(name = "matchday_mail_prompt", columnDefinition = "TEXT")
    private String matchdayMailPrompt;

    @Column(name = "web_url")
    private String webUrl;

    @Column(name = "auto_update_enabled")
    @Builder.Default
    private Boolean autoUpdateEnabled = false;

    @Column(name = "auto_update_cron")
    private String autoUpdateCron;

    @Column(name = "auto_update_source_url")
    private String autoUpdateSourceUrl;

    @Column(name = "auto_update_last_run")
    private LocalDateTime autoUpdateLastRun;

    @Column(name = "last_paypal_check")
    private LocalDate lastPaypalCheck;

    @Column(name = "last_ueberweisung_check")
    private LocalDate lastUeberweisungCheck;
}
