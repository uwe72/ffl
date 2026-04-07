package de.ffl.config;

import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.count() == 0) {
                User admin = User.builder()
                        .login("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .email("admin@ffl.de")
                        .firstName("Admin")
                        .lastName("User")
                        .role(UserRole.ADMIN)
                        .build();
                userRepository.save(admin);
            }
        };
    }
}
