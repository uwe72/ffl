package de.ffl.domain;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserPasswordSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void password_isNotWrittenToJson() throws Exception {
        User user = User.builder()
            .id(1L)
            .login("uwe72")
            .password("$2a$10$geheimerHash")
            .email("uwe@example.de")
            .build();

        String json = objectMapper.writeValueAsString(user);

        assertThat(json).doesNotContain("geheimerHash");
        assertThat(json).doesNotContain("password");
    }

    @Test
    void password_isStillReadFromJson() throws Exception {
        String json = "{\"login\":\"uwe72\",\"password\":\"$2a$10$geheimerHash\",\"email\":\"uwe@example.de\"}";

        User user = objectMapper.readValue(json, User.class);

        assertThat(user.getPassword()).isEqualTo("$2a$10$geheimerHash");
    }
}
