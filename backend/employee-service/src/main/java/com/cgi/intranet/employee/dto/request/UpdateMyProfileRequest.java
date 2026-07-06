package com.cgi.intranet.employee.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateMyProfileRequest(
        @Size(max = 40, message = "Phone must be 40 characters or fewer")
        @Pattern(
                regexp = "^[0-9+()\\-\\s]*$",
                message = "Phone contains unsupported characters"
        )
        String phone,

        @Size(max = 255, message = "Address must be 255 characters or fewer")
        String address,

        @Size(max = 1000, message = "Bio must be 1000 characters or fewer")
        String bio,

        @Size(max = 500, message = "Profile photo URL must be 500 characters or fewer")
        @Pattern(
                regexp = "^(https?://.+)?$",
                message = "Profile photo URL must start with http:// or https://"
        )
        String profilePhotoUrl
) {
}
