package com.cgi.intranet.employee.service.impl;

import com.cgi.intranet.employee.config.ProfilePhotoStorageProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProfilePhotoStorageServiceImplTest {

    @TempDir
    Path tempDir;

    @Test
    void storesValidPngAndReturnsPublicUrl() throws Exception {
        ProfilePhotoStorageServiceImpl service = new ProfilePhotoStorageServiceImpl(properties());

        String publicUrl = service.store(new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                new byte[] {1, 2, 3}
        ));

        assertThat(publicUrl).startsWith("http://localhost:8082/uploads/profiles/");
        assertThat(publicUrl).endsWith(".png");
        assertThat(Files.list(tempDir).count()).isEqualTo(1);
    }

    @Test
    void rejectsInvalidFileType() {
        ProfilePhotoStorageServiceImpl service = new ProfilePhotoStorageServiceImpl(properties());

        assertThatThrownBy(() -> service.store(new MockMultipartFile(
                "file",
                "avatar.gif",
                "image/gif",
                new byte[] {1, 2, 3}
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Unsupported profile photo type");
    }

    @Test
    void rejectsOversizedFile() {
        ProfilePhotoStorageServiceImpl service = new ProfilePhotoStorageServiceImpl(properties());

        byte[] oversized = new byte[2_097_153];
        assertThatThrownBy(() -> service.store(new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                oversized
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Profile photo exceeds max file size");
    }

    private ProfilePhotoStorageProperties properties() {
        ProfilePhotoStorageProperties properties = new ProfilePhotoStorageProperties();
        properties.setDirectory(tempDir.toString());
        properties.setPublicBaseUrl("http://localhost:8082");
        properties.setMaxFileSizeBytes(2_097_152L);
        return properties;
    }
}
