package de.ffl.service;

import de.ffl.domain.PasswordResetToken;
import de.ffl.domain.User;
import de.ffl.repository.PasswordResetTokenRepository;
import de.ffl.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int TOKEN_EXPIRY_MINUTES = 30;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordResetMailService mailService;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                PasswordResetMailService mailService,
                                PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.mailService = mailService;
        this.passwordEncoder = passwordEncoder;
    }

    public enum ResetRequestResult {
        SENT,
        MULTIPLE_ACCOUNTS,
        NO_ACCOUNT
    }

    @Transactional
    public ResetRequestResult requestPasswordReset(String email, String login) {
        if (login != null && !login.isBlank()) {
            User user = userRepository.findByLogin(login).orElse(null);
            if (user == null || !user.getEmail().equalsIgnoreCase(email)) {
                log.info("Passwort-Reset: Login '{}' nicht gefunden oder E-Mail stimmt nicht überein", login);
                return ResetRequestResult.NO_ACCOUNT;
            }
            createTokenAndSendMail(user);
            return ResetRequestResult.SENT;
        }

        List<User> users = userRepository.findAllByEmail(email);

        if (users.isEmpty()) {
            log.info("Passwort-Reset angefordert für unbekannte E-Mail: {}", email);
            return ResetRequestResult.NO_ACCOUNT;
        }

        if (users.size() == 1) {
            createTokenAndSendMail(users.get(0));
            return ResetRequestResult.SENT;
        }

        return ResetRequestResult.MULTIPLE_ACCOUNTS;
    }

    public List<String> getLoginsForEmail(String email) {
        return userRepository.findAllByEmail(email).stream()
            .map(User::getLogin)
            .toList();
    }

    private void createTokenAndSendMail(User user) {
        tokenRepository.deleteByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
            .token(token)
            .user(user)
            .expiryDate(LocalDateTime.now().plusMinutes(TOKEN_EXPIRY_MINUTES))
            .used(false)
            .build();

        tokenRepository.save(resetToken);

        mailService.sendPasswordResetMail(user, token);
        log.info("Passwort-Reset-Token erstellt für User: {}", user.getLogin());
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Ungültiger oder abgelaufener Link."));

        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("Dieser Link wurde bereits verwendet.");
        }

        if (resetToken.isExpired()) {
            throw new IllegalArgumentException("Dieser Link ist abgelaufen. Bitte fordere einen neuen an.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        log.info("Passwort erfolgreich zurückgesetzt für User: {}", user.getLogin());
    }
}
