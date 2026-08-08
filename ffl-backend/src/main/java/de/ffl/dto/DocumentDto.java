package de.ffl.dto;

import de.ffl.domain.Document;

public class DocumentDto {
    private Long id;
    private String filename;
    private String contentType;
    private long fileSize;
    private String uploadedAt;
    private String uploadedBy;

    public static DocumentDto fromEntity(Document doc) {
        DocumentDto dto = new DocumentDto();
        dto.setId(doc.getId());
        dto.setFilename(doc.getFilename());
        dto.setContentType(doc.getContentType());
        dto.setFileSize(doc.getFileSize());
        dto.setUploadedAt(doc.getUploadedAt() != null ? doc.getUploadedAt().toString() : null);
        dto.setUploadedBy(doc.getUploadedBy());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }
    public String getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(String uploadedAt) { this.uploadedAt = uploadedAt; }
    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }
}
