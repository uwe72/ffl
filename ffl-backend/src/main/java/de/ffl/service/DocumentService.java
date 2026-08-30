package de.ffl.service;

import de.ffl.domain.Document;
import de.ffl.dto.DocumentDto;
import de.ffl.repository.DocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "application/pdf",
        "text/plain",
        "image/png",
        "image/jpeg"
    );

    private final DocumentRepository documentRepository;

    public DocumentService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    @jakarta.annotation.PostConstruct
    public void backfillShareTokens() {
        List<Document> missing = documentRepository.findAll().stream()
            .filter(doc -> doc.getShareToken() == null || doc.getShareToken().isBlank())
            .toList();
        missing.forEach(doc -> {
            doc.setShareToken(UUID.randomUUID().toString());
            documentRepository.save(doc);
        });
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> findAll() {
        return documentRepository.findAll().stream()
            .map(DocumentDto::fromEntity)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DocumentDto findById(Long id) {
        return documentRepository.findById(id)
            .map(DocumentDto::fromEntity)
            .orElse(null);
    }

    @Transactional(readOnly = true)
    public Optional<Document> findFileData(Long id) {
        return documentRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Document> findFileDataByShareToken(String shareToken) {
        return documentRepository.findByShareToken(shareToken);
    }

    @Transactional
    public DocumentDto upload(MultipartFile file, String uploaderLogin) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Nur PDF, TXT, PNG und JPG Dateien sind erlaubt");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Datei darf maximal 10 MB groß sein");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("Dateiname darf nicht leer sein");
        }

        Document doc = Document.builder()
            .filename(filename)
            .contentType(contentType)
            .fileSize(file.getSize())
            .uploadedAt(Instant.now())
            .uploadedBy(uploaderLogin)
            .data(file.getBytes())
            .shareToken(UUID.randomUUID().toString())
            .build();

        Document saved = documentRepository.save(doc);
        return DocumentDto.fromEntity(saved);
    }

    @Transactional
    public DocumentDto storeGenerated(byte[] data, String filename, String contentType, String uploaderLogin) {
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Nur PDF, TXT, PNG und JPG Dateien sind erlaubt");
        }
        if (data.length > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Datei darf maximal 10 MB groß sein");
        }
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("Dateiname darf nicht leer sein");
        }

        Document doc = Document.builder()
            .filename(filename)
            .contentType(contentType)
            .fileSize(data.length)
            .uploadedAt(Instant.now())
            .uploadedBy(uploaderLogin)
            .data(data)
            .shareToken(UUID.randomUUID().toString())
            .build();

        Document saved = documentRepository.save(doc);
        return DocumentDto.fromEntity(saved);
    }

    @Transactional
    public void delete(Long id) {
        if (!documentRepository.existsById(id)) {
            throw new IllegalArgumentException("Dokument nicht gefunden");
        }
        documentRepository.deleteById(id);
    }
}
