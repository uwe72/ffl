package de.ffl.controller;

import de.ffl.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class AuthControllerRegisterTest {

    private AuthController controllerWithUserRepository() {
        return new AuthController(
            null, null, null, null, null, null, null, null, null, null,
            null, null
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
}
