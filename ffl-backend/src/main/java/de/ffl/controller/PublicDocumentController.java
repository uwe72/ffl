package de.ffl.controller;

import de.ffl.service.DocumentService;
import de.ffl.service.DownloadStatisticsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/public")
public class PublicDocumentController {

    private final DocumentService documentService;
    private final DownloadStatisticsService downloadStatisticsService;

    public PublicDocumentController(DocumentService documentService, DownloadStatisticsService downloadStatisticsService) {
        this.documentService = documentService;
        this.downloadStatisticsService = downloadStatisticsService;
    }

    @GetMapping("/documents/{token}")
    public ResponseEntity<byte[]> getPublicDocumentContent(@PathVariable String token, HttpServletRequest request) {
        return documentService.findFileDataByShareToken(token)
            .map(doc -> {
                downloadStatisticsService.recordDownload(null, doc.getFilename(), resolveClientIp(request));
                return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(doc.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + URLEncoder.encode(doc.getFilename(), StandardCharsets.UTF_8) + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                    .body(doc.getData());
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        return request.getRemoteAddr();
    }
}
