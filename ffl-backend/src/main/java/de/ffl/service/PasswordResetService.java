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

    @Transactional
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.info("Passwort-Reset angefordert für unbekannte E-Mail: {}", email);
            return;
        }

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
