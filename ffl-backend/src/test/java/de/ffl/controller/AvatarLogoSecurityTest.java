package de.ffl.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AvatarLogoSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void avatar_anonymous_isDenied() throws Exception {
        mockMvc.perform(get("/api/users/1/avatar"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void groupLogo_anonymous_isDenied() throws Exception {
        mockMvc.perform(get("/api/manager-groups/1/logo"))
            .andExpect(status().is4xxClientError());
    }
}
