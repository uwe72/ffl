package de.ffl.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StatisticsTimelineSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void timeline_nonAdmin_isForbidden() throws Exception {
        mockMvc.perform(get("/api/statistics/visits/timeline")
                .param("granularity", "DAY")
                .with(SecurityMockMvcRequestPostProcessors.user("manager").roles("NORMAL")))
            .andExpect(status().isForbidden());
    }

    @Test
    void timeline_anonymous_isDenied() throws Exception {
        mockMvc.perform(get("/api/statistics/visits/timeline")
                .param("granularity", "DAY"))
            .andExpect(status().isForbidden());
    }

    @Test
    void timeline_admin_returnsTimelineWithBuckets() throws Exception {
        mockMvc.perform(get("/api/statistics/visits/timeline")
                .param("granularity", "YEAR")
                .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN", "NORMAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.granularity").value("YEAR"))
            .andExpect(jsonPath("$.totalManagers").isNumber())
            .andExpect(jsonPath("$.buckets.length()").value(5));
    }

    @Test
    void timeline_unknownGranularity_isBadRequest() throws Exception {
        mockMvc.perform(get("/api/statistics/visits/timeline")
                .param("granularity", "DECADE")
                .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
            .andExpect(status().isBadRequest());
    }
}
