package de.ffl.controller;

import de.ffl.dto.RegisterRequest;
import de.ffl.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthControllerRegisterTest {

    private AuthController controllerWithUserRepository() {
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.existsByLogin("user123")).thenReturn(false);
        return new AuthController(
            null, userRepository, null, null, null, null, null, null, null, null,
            null, null, null
        );
    }

    @Test
    void register_loginWithAtSign_returnsBadRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setLogin("user@test.de");
        request.setPassword("password123");
        request.setEmail("user@test.de");

        ResponseEntity<?> response = controllerWithUserRepository().register(request, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().toString()).contains("E-Mail");
    }

    @Test
    void register_sloganWithoutAvatar_returnsBadRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setLogin("user123");
        request.setPassword("password123");
        request.setEmail("user@test.de");
        request.setSlogan("Mein Team-Slogan");

        ResponseEntity<?> response = controllerWithUserRepository().register(request, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().toString()).contains("Profilbild");
    }

    @Test
    void register_sameLoginDifferentCase_returnsLoginTaken() {
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.existsByLoginIgnoreCase("tobi")).thenReturn(true);
        AuthController controller = new AuthController(
            null, userRepository, null, null, null, null, null, null, null, null,
            null, null, null
        );

        RegisterRequest request = new RegisterRequest();
        request.setLogin("tobi");
        request.setPassword("password123");
        request.setEmail("user@test.de");
        request.setFirstName("Tobi");
        request.setLastName("Muster");

        ResponseEntity<?> response = controller.register(request, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().toString()).contains("Login bereits vergeben");
    }
}
