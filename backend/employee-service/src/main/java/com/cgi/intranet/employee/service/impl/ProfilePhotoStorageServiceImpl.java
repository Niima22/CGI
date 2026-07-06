package com.cgi.intranet.employee.service.impl;

import com.cgi.intranet.employee.config.ProfilePhotoStorageProperties;
import com.cgi.intranet.employee.service.ProfilePhotoStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@Service
public class ProfilePhotoStorageServiceImpl implements ProfilePhotoStorageService {

    private static final Map<String, String> CONTENT_TYPE_EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp"
    );

    private final ProfilePhotoStorageProperties properties;

    public ProfilePhotoStorageServiceImpl(ProfilePhotoStorageProperties properties) {
        this.properties = properties;
    }

    @Override
    public String store(MultipartFile file) throws IOException {
        validate(file);

        Path directory = Paths.get(properties.getDirectory()).toAbsolutePath().normalize();
        Files.createDirectories(directory);

        String extension = CONTENT_TYPE_EXTENSIONS.get(file.getContentType());
        String filename = UUID.randomUUID() + extension;
        Path target = directory.resolve(filename).normalize();
        if (!target.startsWith(directory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsafe file path");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        }

        return properties.getPublicBaseUrl().replaceAll("/+$", "") + "/uploads/profiles/" + filename;
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile photo file is required");
        }

        String contentType = file.getContentType();
        if (!CONTENT_TYPE_EXTENSIONS.containsKey(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported profile photo type");
        }

        if (file.getSize() > properties.getMaxFileSizeBytes()) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Profile photo exceeds max file size");
        }
    }
}
