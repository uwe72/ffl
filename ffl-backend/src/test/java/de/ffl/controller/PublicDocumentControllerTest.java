package de.ffl.controller;

import de.ffl.domain.Document;
import de.ffl.service.DocumentService;
import de.ffl.service.DownloadStatisticsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicDocumentControllerTest {

    @Mock
    private DocumentService documentService;

    @Mock
    private DownloadStatisticsService downloadStatisticsService;

    private PublicDocumentController controller() {
        return new PublicDocumentController(documentService, downloadStatisticsService);
    }

    private Document sampleEntity(String token) {
        return Document.builder()
            .id(1L)
            .filename("regeln.pdf")
            .contentType("application/pdf")
            .fileSize(4L)
            .uploadedAt(Instant.now())
            .uploadedBy("admin")
            .data(new byte[]{1, 2, 3, 4})
            .shareToken(token)
            .build();
    }

    @Test
    void getPublicDocumentContent_knownToken_returnsOk() {
        when(documentService.findFileDataByShareToken("abc-123")).thenReturn(Optional.of(sampleEntity("abc-123")));

        ResponseEntity<byte[]> response = controller().getPublicDocumentContent("abc-123");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(4);
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(response.getHeaders().getFirst("Content-Disposition")).contains("inline");
        verify(downloadStatisticsService).recordDownload(isNull(), eq("regeln.pdf"));
    }

    @Test
    void getPublicDocumentContent_unknownToken_returnsNotFound() {
        when(documentService.findFileDataByShareToken("unknown")).thenReturn(Optional.empty());

        ResponseEntity<byte[]> response = controller().getPublicDocumentContent("unknown");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(downloadStatisticsService, never()).recordDownload(isNull(), eq("regeln.pdf"));
    }

    @Test
    void getPublicDocumentContent_isMappedUnderApiPublicDocuments() throws Exception {
        when(documentService.findFileDataByShareToken("abc-123")).thenReturn(Optional.of(sampleEntity("abc-123")));

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller()).build();

        mockMvc.perform(get("/api/public/documents/abc-123"))
            .andExpect(status().isOk())
            .andExpect(content().bytes(new byte[]{1, 2, 3, 4}))
            .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("inline")));
    }
}
