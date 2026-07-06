package com.cgi.intranet.employee.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    private final ProfilePhotoStorageProperties properties;

    public StaticResourceConfig(ProfilePhotoStorageProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(properties.getDirectory()).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/profiles/**")
                .addResourceLocations(uploadPath.toUri().toString() + "/");
    }
}
