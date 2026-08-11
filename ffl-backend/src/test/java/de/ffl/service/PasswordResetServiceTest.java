package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.repository.PasswordResetTokenRepository;
import de.ffl.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordResetTokenRepository tokenRepository;
    @Mock
    private PasswordResetMailService mailService;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PasswordResetService passwordResetService;

    private User user(String login, String email) {
        return User.builder()
            .login(login)
            .password("$2a$10$hash")
            .email(email)
            .build();
    }

    @Test
    void getLoginsForEmail_returnsAllLoginsForEmail() {
        when(userRepository.findAllByEmail("dup@test.de"))
            .thenReturn(List.of(user("alpha", "dup@test.de"), user("beta", "dup@test.de")));

        List<String> logins = passwordResetService.getLoginsForEmail("dup@test.de");

        assertThat(logins).containsExactly("alpha", "beta");
    }

    @Test
    void requestLoginReminder_unknownEmail_returnsFalseAndSendsNoMail() {
        when(userRepository.findAllByEmail("none@test.de")).thenReturn(List.of());

        boolean result = passwordResetService.requestLoginReminder("none@test.de");

        assertThat(result).isFalse();
        verify(mailService, never()).sendLoginReminderMail(any(), any());
    }

    @Test
    void requestLoginReminder_singleAccount_sendsMailWithThatLogin() {
        User u = user("uwe72", "uwe@test.de");
        when(userRepository.findAllByEmail("uwe@test.de")).thenReturn(List.of(u));

        boolean result = passwordResetService.requestLoginReminder("uwe@test.de");

        assertThat(result).isTrue();
        verify(mailService).sendLoginReminderMail(eq(u), eq(List.of("uwe72")));
    }

    @Test
    void requestLoginReminder_multipleAccounts_sendsMailWithAllLogins() {
        User u1 = user("alpha", "dup@test.de");
        User u2 = user("beta", "dup@test.de");
        when(userRepository.findAllByEmail("dup@test.de")).thenReturn(List.of(u1, u2));

        boolean result = passwordResetService.requestLoginReminder("dup@test.de");

        assertThat(result).isTrue();
        verify(mailService).sendLoginReminderMail(eq(u1), eq(List.of("alpha", "beta")));
    }
}
