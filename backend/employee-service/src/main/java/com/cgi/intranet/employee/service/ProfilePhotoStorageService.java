package com.cgi.intranet.employee.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface ProfilePhotoStorageService {

    String store(MultipartFile file) throws IOException;
}
