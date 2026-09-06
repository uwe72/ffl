package de.ffl.service;

import de.ffl.domain.Document;
import de.ffl.dto.DocumentDto;
import de.ffl.repository.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    private DocumentService documentService;

    @BeforeEach
    void setUp() {
        documentService = new DocumentService(documentRepository);
    }

    private MultipartFile mockedFile(String filename, String contentType, long size) throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        lenient().when(file.getOriginalFilename()).thenReturn(filename);
        lenient().when(file.getContentType()).thenReturn(contentType);
        lenient().when(file.getSize()).thenReturn(size);
        lenient().when(file.getBytes()).thenReturn(new byte[0]);
        return file;
    }

    @Test
    void upload_mp4WithinLimit_isAccepted() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file", "video.mp4", "video/mp4", new byte[]{1, 2, 3, 4});
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentDto result = documentService.upload(file, "admin", null);

        assertThat(result.getFilename()).isEqualTo("video.mp4");
        assertThat(result.getContentType()).isEqualTo("video/mp4");
        assertThat(result.getFileSize()).isEqualTo(4L);
    }

    @Test
    void upload_fileOver100MB_isRejected() throws Exception {
        MultipartFile file = mockedFile("video.mp4", "video/mp4", DocumentService.MAX_FILE_SIZE + 1);

        assertThatThrownBy(() -> documentService.upload(file, "admin", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Datei darf maximal 100 MB groß sein");
    }

    @Test
    void upload_exactly100MB_isAccepted() throws Exception {
        MultipartFile file = mockedFile("video.mp4", "video/mp4", DocumentService.MAX_FILE_SIZE);
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentDto result = documentService.upload(file, "admin", null);

        assertThat(result.getContentType()).isEqualTo("video/mp4");
        assertThat(result.getFileSize()).isEqualTo(DocumentService.MAX_FILE_SIZE);
    }

    @Test
    void upload_unsupportedContentType_isRejected() {
        MockMultipartFile file = new MockMultipartFile(
            "file", "video.mov", "video/quicktime", new byte[]{1, 2, 3, 4});

        assertThatThrownBy(() -> documentService.upload(file, "admin", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Nur PDF, TXT, PNG, JPG und MP4 Dateien sind erlaubt");
    }

    @Test
    void upload_nullContentType_isRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "video.mp4", null, new byte[]{1});

        assertThatThrownBy(() -> documentService.upload(file, "admin", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Nur PDF, TXT, PNG, JPG und MP4 Dateien sind erlaubt");
    }

    @Test
    void upload_missingFilename_isRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "", "video/mp4", new byte[]{1});

        assertThatThrownBy(() -> documentService.upload(file, "admin", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Dateiname darf nicht leer sein");
    }

    @Test
    void storeGenerated_mp4WithinLimit_isAccepted() {
        byte[] data = new byte[]{1, 2, 3, 4};
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));

        DocumentDto result = documentService.storeGenerated(data, "video.mp4", "video/mp4", "admin");

        assertThat(result.getFilename()).isEqualTo("video.mp4");
        assertThat(result.getContentType()).isEqualTo("video/mp4");
    }

    @Test
    void storeGenerated_fileOver100MB_isRejected() {
        assertThatThrownBy(() -> documentService.storeGenerated(
                new byte[(int) DocumentService.MAX_FILE_SIZE + 1], "video.mp4", "video/mp4", "admin"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Datei darf maximal 100 MB groß sein");
    }

    @Test
    void storeGenerated_unsupportedContentType_isRejected() {
        assertThatThrownBy(() -> documentService.storeGenerated(
                "x".getBytes(StandardCharsets.UTF_8), "audio.mp3", "audio/mpeg", "admin"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Nur PDF, TXT, PNG, JPG und MP4 Dateien sind erlaubt");
    }
}
