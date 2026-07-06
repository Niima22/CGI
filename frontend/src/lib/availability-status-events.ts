import type { AvailabilityStatus } from "@/lib/api/employees";

const AVAILABILITY_EVENT_NAME = "cgi-flow:availability-status-updated";
const PROFILE_PHOTO_EVENT_NAME = "cgi-flow:profile-photo-updated";

export function publishAvailabilityStatusUpdate(status: AvailabilityStatus) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AvailabilityStatus>(AVAILABILITY_EVENT_NAME, {
      detail: status,
    }),
  );
}

export function subscribeAvailabilityStatusUpdate(
  listener: (status: AvailabilityStatus) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<AvailabilityStatus>).detail;
    if (detail) {
      listener(detail);
    }
  };

  window.addEventListener(AVAILABILITY_EVENT_NAME, handler);
  return () => window.removeEventListener(AVAILABILITY_EVENT_NAME, handler);
}

export function publishProfilePhotoUpdate(profilePhotoUrl: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<string | null>(PROFILE_PHOTO_EVENT_NAME, {
      detail: profilePhotoUrl,
    }),
  );
}

export function subscribeProfilePhotoUpdate(
  listener: (profilePhotoUrl: string | null) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    listener((event as CustomEvent<string | null>).detail ?? null);
  };

  window.addEventListener(PROFILE_PHOTO_EVENT_NAME, handler);
  return () => window.removeEventListener(PROFILE_PHOTO_EVENT_NAME, handler);
}
